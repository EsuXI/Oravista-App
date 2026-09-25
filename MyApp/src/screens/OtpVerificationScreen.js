import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import { API_BASE_URL } from "../config/config";
import CustomAlertModal from "../components/CustomAlertModal";

export default function OtpVerificationScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const email = route?.params?.email || "your email";
  const user = route?.params?.user || null;
  const isChangePasswordFlow = route?.params?.isChangePasswordFlow || false;
  const isResetFlow = route?.params?.isResetFlow || false;
  const newPassword = route?.params?.newPassword || null;
  const initialOtp = route?.params?.generatedOtp || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(initialOtp ? 30 : 0);
  const [currentOtp, setCurrentOtp] = useState(initialOtp);

  // Custom Alert Modal State
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: "error",
    title: "",
    message: "",
    onPrimaryPress: () => {},
  });

  const inputs = useRef([]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (text, index) => {
    if (text.length === 6 && /^\d+$/.test(text)) {
      const newOtp = text.split("");
      setOtp(newOtp);
      inputs.current[5]?.focus();
      return;
    }

    const cleanChar = text.replace(/[^0-9]/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleanChar;
    setOtp(newOtp);

    if (cleanChar && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace") {
      if (otp[index] === "" && index > 0) {
        inputs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
      }
    }
  };

  const handleVerify = async () => {
    if (loading) return;
    const code = otp.join("");
    if (code.length !== 6) {
      setAlertConfig({
        visible: true,
        type: "warning",
        title: "Incomplete Code",
        message: "Please enter the complete 6-digit verification code.",
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    setLoading(true);

    try {
      if (!/^\d{6}$/.test(String(currentOtp)) || code !== String(currentOtp)) {
        setAlertConfig({
          visible: true,
          type: "error",
          title: "Invalid Code",
          message: "The code you entered does not match. Please check your email and try again.",
          onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
        });
        setLoading(false);
        return;
      }

      // 1. Forgot Password flow -> Proceed to ResetPasswordScreen
      if (isResetFlow) {
        setLoading(false);
        navigation.replace("ResetPassword", {
          email: email.trim().toLowerCase(),
          otpVerified: true,
        });
        return;
      }

      // 2. Change Password flow from Settings/Profile
      if (isChangePasswordFlow) {
        const oldPassword = route?.params?.oldPassword;
        if (!oldPassword || !newPassword) {
          setAlertConfig({
            visible: true,
            type: "error",
            title: "Update Failed",
            message: "Please go back and enter your current and new passwords again.",
            onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
          });
          return;
        }
        let resolvedId = user?.id || user?.user_id;

        // If ID wasn't directly passed, resolve it from AsyncStorage or user-profile
        if (!resolvedId) {
          const storedUser = await AsyncStorage.getItem("userData");
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            resolvedId = parsed?.id || parsed?.user_id;
          }
        }

        if (!resolvedId && email) {
          try {
            const profileRes = await fetch(
              `${API_BASE_URL}/api/user-profile?email=${encodeURIComponent(email.trim().toLowerCase())}`
            );
            if (profileRes.ok) {
              const profile = await profileRes.json();
              resolvedId = profile.id;
            }
          } catch (e) {}
        }

        if (!resolvedId) {
          setAlertConfig({
            visible: true,
            type: "error",
            title: "Update Failed",
            message: "User session expired. Please re-login and try again.",
            onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
          });
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/update-password`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: resolvedId,
            oldPassword,
            newPassword: newPassword,
          }),
        });

        const rawText = await response.text();
        let data = {};
        try {
          data = JSON.parse(rawText);
        } catch (e) {}

        if (response.ok) {
          navigation.setParams({ oldPassword: undefined, newPassword: undefined });
          setAlertConfig({
            visible: true,
            type: "success",
            title: "Password Changed",
            message: "Your password has been updated successfully.",
            onPrimaryPress: () => {
              setAlertConfig((prev) => ({ ...prev, visible: false }));
              navigation.reset({
                index: 0,
                routes: [{ name: "Home" }],
              });
            },
          });
        } else {
          setAlertConfig({
            visible: true,
            type: "error",
            title: "Update Failed",
            message: data.message || "Failed to update password. Please try again.",
            onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
          });
        }
        setLoading(false);
        return;
      }

      if (!user || !(user.id || user.user_id)) throw new Error('Your login session is missing. Please log in again.');
      // 3. Normal Login Session setup
      if (user) {
        await AsyncStorage.setItem("userData", JSON.stringify(user));
        await AsyncStorage.setItem("userEmail", email);
        if (user.token) {
          await AsyncStorage.setItem("userToken", user.token);
        } else { await AsyncStorage.removeItem("userToken"); }
      }

      if (route?.params?.rememberMe) {
        await AsyncStorage.setItem("rememberMe", "true");
      }

      // Reset to main application stack (MainTabNavigator under route name "Home")
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    } catch (error) {
      console.log("OTP verify error:", error);
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Connection Error",
        message: "Could not connect to authentication server. Please try again.",
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (loading || resendCooldown > 0) return;
    setLoading(true);
    setCurrentOtp("");
    setOtp(["", "", "", "", "", ""]);

    try {
      let actionType = "login";
      if (isChangePasswordFlow) actionType = "change_password";
      if (isResetFlow) actionType = "forgot_password";

      const response = await fetch(`${API_BASE_URL}/api/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          action: actionType,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        if (!/^\d{6}$/.test(String(data.generatedOtp || ""))) {
          setCurrentOtp("");
          setAlertConfig({
            visible: true,
            type: "error",
            title: "Resend Failed",
            message: "The server did not return a verification code. Please try again.",
            onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
          });
          return;
        }
        setCurrentOtp(String(data.generatedOtp));
        setOtp(["", "", "", "", "", ""]);
        setResendCooldown(30);
        setAlertConfig({
          visible: true,
          type: "success",
          title: "Code Sent",
          message: "A new 6-digit verification code has been sent to your email.",
          onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
        });
      } else {
        setAlertConfig({
          visible: true,
          type: "error",
          title: "Resend Failed",
          message: data.message || "Could not resend code.",
          onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
        });
      }
    } catch (err) {
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Error",
        message: "Network error while resending verification code.",
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScreenBackground />
      <View style={[styles.premiumHeader, { paddingTop: insets.top + 20, overflow: "hidden" }]}><ScreenBackground header />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" style={[styles.backBtn, { top: insets.top + 12, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={32} color={colors.accent} />
        </View>
        <Text style={styles.title}>Enter 6-Digit Code</Text>
        <Text style={styles.subtitle}>{currentOtp ? `Sent to ${email}` : "Your email code hasn't been sent yet."}</Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {!currentOtp && <Text accessibilityLiveRegion="polite" style={styles.deliveryNotice}>{loading ? 'Requesting your code…' : (route?.params?.deliveryError || 'Try Resend Code. If sending keeps failing, contact the clinic for help.')}</Text>}
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputs.current[index] = ref)}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              keyboardType="number-pad"
              maxLength={6}
              accessibilityLabel={`Verification code digit ${index + 1}`}
              textContentType="oneTimeCode"
              editable={!loading && !!currentOtp}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
            />
          ))}
        </View>

        <TouchableOpacity accessibilityRole="button" style={[styles.verifyBtn, (loading || !currentOtp || otp.join('').length !== 6) && { opacity: 0.5 }]} onPress={handleVerify} disabled={loading || !currentOtp || otp.join('').length !== 6}>
          {loading ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <Text style={styles.verifyText}>Verify & Proceed</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={styles.resendPrompt}>Didn't receive the code? </Text>
          <TouchableOpacity accessibilityRole="button" onPress={handleResend} disabled={loading || resendCooldown > 0}>
            <Text style={[styles.resendLink, resendCooldown > 0 && styles.resendDisabled]}>
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onPrimaryPress={alertConfig.onPrimaryPress}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  premiumHeader: {
    backgroundColor: colors.primary,
    paddingTop: 55,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    alignItems: "center",
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    left: 20,
    top: 55,
    padding: 4,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.ink,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.muted,
    marginTop: 4,
  },
  content: {
    padding: 24,
    alignItems: "center",
    paddingTop: 32,
  },
  deliveryNotice: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 21, color: colors.danger, backgroundColor: colors.dangerSoft, padding: 14, borderRadius: 20, marginBottom: 20, width: '100%' },
  otpRow: {
    gap: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 32,
  },
  otpBox: {
    flex: 1,
    minWidth: 0,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    textAlign: "center",
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.ink,
    backgroundColor: colors.input,
  },
  otpBoxFilled: {
    borderColor: colors.accent,
    backgroundColor: colors.lavender,
  },
  verifyBtn: {
    backgroundColor: colors.primary,
    width: "100%",
    height: 52,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  verifyText: {
    color: colors.ink,
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  resendRow: {
    flexWrap: 'wrap',
    justifyContent: 'center',
    flexDirection: "row",
    alignItems: "center",
  },
  resendPrompt: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.regular,
  },
  resendLink: {
    fontSize: 14,
    color: colors.accent,
    fontFamily: fonts.semiBold,
  },
  resendDisabled: {
    color: colors.muted,
  },
});
