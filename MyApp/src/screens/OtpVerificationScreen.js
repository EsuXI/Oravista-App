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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import { API_BASE_URL } from "../config/config";
import CustomAlertModal from "../components/CustomAlertModal";

export default function OtpVerificationScreen({ navigation, route }) {
  const email = route?.params?.email || "your email";
  const user = route?.params?.user || null;
  const isChangePasswordFlow = route?.params?.isChangePasswordFlow || false;
  const isResetFlow = route?.params?.isResetFlow || false;
  const newPassword = route?.params?.newPassword || null;
  const initialOtp = route?.params?.generatedOtp || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
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
      if (currentOtp && code !== String(currentOtp)) {
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
        navigation.navigate("ResetPassword", {
          email: email.trim().toLowerCase(),
          userId: route?.params?.userId || user?.id,
        });
        return;
      }

      // 2. Change Password flow from Settings/Profile
      if (isChangePasswordFlow) {
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
            newPassword: newPassword,
          }),
        });

        const rawText = await response.text();
        let data = {};
        try {
          data = JSON.parse(rawText);
        } catch (e) {}

        if (response.ok) {
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

      // 3. Normal Login Session setup
      if (user) {
        await AsyncStorage.setItem("userData", JSON.stringify(user));
        await AsyncStorage.setItem("userEmail", email);
        if (user.token) {
          await AsyncStorage.setItem("userToken", user.token);
        }
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
    if (resendCooldown > 0) return;
    setLoading(true);

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
        if (data.generatedOtp) {
          setCurrentOtp(String(data.generatedOtp));
        }
        if (data.userId) {
          route.params.userId = data.userId;
        }
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
      <View style={styles.premiumHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={32} color="#001166" />
        </View>
        <Text style={styles.title}>Enter 6-Digit Code</Text>
        <Text style={styles.subtitle}>Sent to {email}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputs.current[index] = ref)}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              keyboardType="number-pad"
              maxLength={2}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.verifyText}>Verify & Proceed</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={styles.resendPrompt}>Didn't receive the code? </Text>
          <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0}>
            <Text style={[styles.resendLink, resendCooldown > 0 && styles.resendDisabled]}>
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  premiumHeader: {
    backgroundColor: "#001166",
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
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#C7D2FF",
    marginTop: 4,
  },
  content: {
    padding: 24,
    alignItems: "center",
    marginTop: 20,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 32,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 16,
    textAlign: "center",
    fontSize: 22,
    fontFamily: fonts.bold,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  otpBoxFilled: {
    borderColor: "#001166",
    backgroundColor: "#EEF2FF",
  },
  verifyBtn: {
    backgroundColor: "#001166",
    width: "100%",
    height: 52,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  verifyText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  resendPrompt: {
    fontSize: 14,
    color: "#6B7280",
    fontFamily: fonts.regular,
  },
  resendLink: {
    fontSize: 14,
    color: "#001166",
    fontFamily: fonts.semiBold,
  },
  resendDisabled: {
    color: "#9CA3AF",
  },
});