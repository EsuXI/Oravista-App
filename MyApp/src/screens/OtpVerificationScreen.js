import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import { API_BASE_URL } from '../config/config';

export default function OtpVerificationScreen({ navigation, route }) {
  const { 
    email, 
    user, 
    generatedOtp, 
    isResetFlow = false, 
    isChangePasswordFlow = false, 
    newPassword = null 
  } = route.params;

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [currentExpectedOtp, setCurrentExpectedOtp] = useState(generatedOtp);

  const inputs = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (text, index) => {
    // 1. Handle full paste (e.g. 6 digits at once)
    if (text.length > 1) {
      const cleanDigits = text.replace(/[^0-9]/g, "").slice(0, 6).split("");
      if (cleanDigits.length > 0) {
        const newOtp = [...otp];
        cleanDigits.forEach((digit, idx) => {
          if (idx < 6) newOtp[idx] = digit;
        });
        setOtp(newOtp);
        const targetIndex = Math.min(cleanDigits.length, 5);
        inputs.current[targetIndex]?.focus();
        return;
      }
    }

    // 2. Normal forward typing or replacement
    const newOtp = [...otp];
    // Take only the last entered digit
    newOtp[index] = text.slice(-1);
    setOtp(newOtp);

    // Auto-advance to next box if a number was typed
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = ({ nativeEvent }, index) => {
    if (nativeEvent.key === "Backspace") {
      const newOtp = [...otp];

      if (otp[index] !== "") {
        // If current box has a value, clear it
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        // If already empty, jump to previous box, clear it, and focus it
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerify = async () => {
    const enteredOtp = otp.join("");

    if (enteredOtp.length !== 6) {
      Alert.alert("Invalid Code", "Please enter the complete 6-digit code.");
      return;
    }

    if (enteredOtp !== currentExpectedOtp) {
      Alert.alert("Error", "Incorrect verification code. Please check your email.");
      return;
    }

    setLoading(true);

    try {
      // 1. FORGOT PASSWORD FLOW
      if (isResetFlow) {
        setLoading(false);
        navigation.navigate("ResetPassword", { email });
        return;
      }

      // 2. CHANGE PASSWORD FLOW (from Settings)
      if (isChangePasswordFlow) {
        const updateRes = await fetch(`${API_BASE_URL}/api/update-password`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: user.id,
            newPassword: newPassword,
          }),
        });

        const rawText = await updateRes.text();
        let updateData = {};
        try { updateData = JSON.parse(rawText); } catch (e) {}

        if (updateRes.ok) {
          Alert.alert("Success", "Password changed successfully!", [
            {
              text: "OK",
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name: "Home",
                      state: {
                        routes: [
                          {
                            name: "Profile",
                            state: {
                              routes: [{ name: "ProfileMain" }],
                              index: 0,
                            },
                          },
                        ],
                        index: 3, // Profile tab index
                      },
                    },
                  ],
                });
              },
            },
          ]);
        } else {
          Alert.alert("Error", updateData.message || "Failed to update password.");
        }
        setLoading(false);
        return;
      }

      // 3. STANDARD LOGIN FLOW
      const response = await fetch(`${API_BASE_URL}/api/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const rawText = await response.text();
      let data = {};
      try { data = JSON.parse(rawText); } catch (e) {}

      if (response.ok) {
        const loggedInUser = data.user || user;
        await AsyncStorage.setItem("userToken", data.token || "logged_in_token");
        await AsyncStorage.setItem("userData", JSON.stringify(loggedInUser));
        await AsyncStorage.setItem("userEmail", loggedInUser.email);
        
        navigation.replace("Home");
      } else {
        Alert.alert("Verification Failed", data.message || "Could not verify code.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          action: isChangePasswordFlow ? "change" : "login" 
        }),
      });

      const rawText = await response.text();
      let data = {};
      try { data = JSON.parse(rawText); } catch (e) {}

      if (response.ok) {
        setCurrentExpectedOtp(data.generatedOtp);
        setTimer(60);
        Alert.alert("Code Sent", "A fresh verification code has been sent to your email.");
      } else {
        Alert.alert("Error", data.message || "Failed to resend code.");
      }
    } catch (err) {
      Alert.alert("Error", "Server connection failed.");
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

        <TouchableOpacity 
          style={styles.verifyBtn} 
          onPress={handleVerify} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.verifyText}>Verify & Proceed</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleResend} 
          disabled={timer > 0 || loading}
          style={styles.resendBtn}
        >
          <Text style={[styles.resendText, timer > 0 && styles.disabledText]}>
            {timer > 0 ? `Resend Code in ${timer}s` : "Resend Code"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  premiumHeader: {
    backgroundColor: "#001166",
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: "center",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 8,
    zIndex: 10,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { color: "#FFFFFF", fontSize: 24, fontFamily: fonts.bold },
  subtitle: { color: "#C7D2FF", fontSize: 13, fontFamily: fonts.medium, marginTop: 6 },
  content: { paddingHorizontal: 30, paddingTop: 40, alignItems: "center" },
  otpRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 30 },
  otpBox: {
    width: 46,
    height: 54,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 20,
    fontFamily: fonts.bold,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  otpBoxFilled: { borderColor: "#001166", backgroundColor: "#FFFFFF" },
  verifyBtn: {
    backgroundColor: "#001166",
    height: 56,
    borderRadius: 999,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  verifyText: { color: "#FFFFFF", fontSize: 16, fontFamily: fonts.semiBold },
  resendBtn: { marginTop: 20, padding: 10 },
  resendText: { color: "#001166", fontFamily: fonts.medium, fontSize: 14 },
  disabledText: { color: "#9CA3AF" },
});