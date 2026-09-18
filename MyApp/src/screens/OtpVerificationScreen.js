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

      // If change password flow
      if (isChangePasswordFlow) {
        const response = await fetch(`${API_BASE_URL}/api/update-password`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: user?.id,
            newPassword: newPassword,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          setAlertConfig({
            visible: true,
            type: "success",
            title: "Password Changed",
            message: "Your password has been updated successfully.",
            onPrimaryPress: () => {
              setAlertConfig((prev) => ({ ...prev, visible: false }));
              // Cleanly resets navigation back to Profile tab
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: "Home",
                    state: {
                      routes: [{ name: "Profile" }],
                    },
                  },
                ],
              });
            },
          });
        } else {
          setAlertConfig({
            visible: true,
            type: "error",
            title: "Update Failed",
            message: data.message || "Failed to update password.",
            onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
          });
        }
        setLoading(false);
        return;
      }

      // Normal Login Session setup
      if (user) {
        await AsyncStorage.setItem("userData", JSON.stringify(user));
        await AsyncStorage.setItem("userEmail", email);
        if (user.token) {
          await AsyncStorage.setItem("userToken", user.token);
        }
      }

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
      const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: isChangePasswordFlow ? "change" : "login" }),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.generatedOtp) {
          setCurrentOtp(data.generatedOtp);
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