import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import { API_BASE_URL } from '../config/config';

export default function OtpVerificationScreen({ route, navigation }) {
  // Destructure route params to identify which flow the user is in
  const { 
    email, 
    rememberMe, 
    isResetFlow, 
    isChangePasswordFlow, 
    newPassword, 
    userId 
  } = route.params || {}; 
  
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState(""); 
  const [countdown, setCountdown] = useState(0);

  // Timer effect for the Resend button cooldown
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async () => {
    setError(""); 
    setSuccessMsg(""); 
    
    if (code.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Verify the 6-digit code with the backend
      const response = await fetch(`${API_BASE_URL}/api/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      });

      const data = await response.json();

      if (response.ok) {
        setError(""); // Clear error on successful code verification
        setSuccessMsg("Verification successful!"); // Show green success text
        
        // Delay to allow user to see the success message before redirecting
        setTimeout(async () => {
          if (isResetFlow) {
            // Flow A: Forgot Password -> Reset Screen
            navigation.navigate("ResetPassword", { email });
          } else if (isChangePasswordFlow) {
            // Flow B: Change Password (Internal) -> Finalize update
            const updateRes = await fetch(`${API_BASE_URL}/api/update-password`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: userId, newPassword: newPassword })
            });

            if (updateRes.ok) {
              Alert.alert("Success", "Your password has been updated!");
              navigation.navigate("Home");
            } else {
              setSuccessMsg(""); 
              setError("Failed to finalize update. Please try again.");
              setLoading(false);
            }
          } else {
            // Flow C: Standard Login 2FA[cite: 13]
            await AsyncStorage.setItem("userEmail", email);
            await AsyncStorage.setItem("userToken", data.token || "logged_in");
            await AsyncStorage.setItem("rememberMe", rememberMe ? "true" : "false");
            navigation.replace("Home");
          }
        }, 1500);
        
      } else {
        // Reset loading so user can try entering the code again
        setError(data.message || "Invalid verification code.");
        setLoading(false); 
      }
    } catch (err) {
      setError("Server connection failed.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (response.ok) {
        Alert.alert("Success", "A new code has been sent!");
        setCountdown(120); // 2-minute cooldown
      }
    } catch (err) {
      Alert.alert("Error", "Failed to resend code.");
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <View style={styles.premiumHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={36} color="#001166" />
          </View>
          <Text style={styles.title}>
            {isResetFlow || isChangePasswordFlow ? "Verify Identity" : "2-Step Verification"}
          </Text>
          <Text style={styles.subtitle}>Enter the security code to continue</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            <Text style={styles.instructions}>
              We sent a 6-digit code to your email:{"\n"}
              <Text style={styles.highlightEmail}>{email || "your email"}</Text>
            </Text>

            <View style={styles.otpContainer}>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <View 
                  key={index} 
                  style={[styles.box, code.length === index && styles.boxActive]}
                >
                  <Text style={styles.boxText}>{code[index] || ""}</Text>
                </View>
              ))}
              <TextInput
                style={styles.hiddenInput}
                keyboardType="numeric"
                maxLength={6}
                value={code}
                onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
                autoFocus={true}
                editable={!successMsg}
              />
            </View>

            {/* Verification Messages[cite: 13] */}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {successMsg ? <Text style={styles.successText}>{successMsg}</Text> : null}

            <TouchableOpacity 
              style={[styles.verifyBtn, successMsg && styles.successBtn]} 
              onPress={handleVerify} 
              disabled={loading || !!successMsg}
            >
              {loading && !successMsg ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyBtnText}>
                  {successMsg ? "Redirecting..." : "Verify Account"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Resend Logic - Hidden once verified successfully[cite: 13] */}
            {!successMsg && (
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Didn't receive the code? </Text>
                <TouchableOpacity onPress={handleResend} disabled={countdown > 0 || loading}>
                  <Text style={[styles.resendLink, (countdown > 0 || loading) && styles.resendDisabled]}>
                    {countdown > 0 ? `Resend in ${countdown}s` : "Resend"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
    elevation: 10, 
    position: "relative" 
  },
  backBtn: { position: "absolute", top: 50, left: 20, padding: 8, zIndex: 10 },
  iconCircle: { 
    width: 75, 
    height: 75, 
    borderRadius: 24, 
    backgroundColor: "#FFFFFF", 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 20, 
    elevation: 5 
  },
  title: { color: "#FFFFFF", fontSize: 24, fontFamily: fonts.bold },
  subtitle: { color: "#C7D2FF", fontSize: 13, fontFamily: fonts.medium, marginTop: 6 },
  scrollContent: { paddingBottom: 40 },
  form: { paddingHorizontal: 30, paddingTop: 40 },
  instructions: { 
    textAlign: "center", 
    fontSize: 14, 
    color: "#6B7280", 
    fontFamily: fonts.medium, 
    lineHeight: 22, 
    marginBottom: 30 
  },
  highlightEmail: { color: "#111827", fontFamily: fonts.bold },
  otpContainer: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    position: "relative", 
    marginBottom: 16 
  },
  box: { 
    width: 48, 
    height: 58, 
    borderRadius: 14, 
    backgroundColor: "#F9FAFB", 
    borderWidth: 1.5, 
    borderColor: "#E5E7EB", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  boxActive: { borderColor: "#001166", backgroundColor: "#F0F4FF" },
  boxText: { fontSize: 22, fontFamily: fonts.bold, color: "#001166" },
  hiddenInput: { ...StyleSheet.absoluteFillObject, opacity: 0 },
  error: { 
    color: "#DC2626", 
    fontSize: 13, 
    textAlign: "center", 
    marginBottom: 10, 
    fontFamily: fonts.medium 
  },
  successText: { 
    color: "#059669", 
    fontSize: 13, 
    textAlign: "center", 
    marginBottom: 10, 
    fontFamily: fonts.medium 
  },
  successBtn: { backgroundColor: "#059669" },
  verifyBtn: { 
    backgroundColor: "#001166", 
    height: 58, 
    borderRadius: 999, 
    justifyContent: "center", 
    alignItems: "center", 
    marginTop: 10, 
    elevation: 4 
  },
  verifyBtnText: { color: "#fff", fontSize: 16, fontFamily: fonts.bold },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 30 },
  footerText: { color: "#6B7280", fontFamily: fonts.medium },
  resendLink: { color: "#001166", fontFamily: fonts.bold },
  resendDisabled: { color: "#9CA3AF" } 
});