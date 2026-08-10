import React, { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "../theme/fonts";
import { API_BASE_URL } from '../config/config';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      if (response.ok) {
        Alert.alert(
          "Code Sent",
          "Check your email for the 6-digit verification code.",
          [{ text: "Verify Now", onPress: () => navigation.navigate("OtpVerification", { 
            email: email.trim().toLowerCase(),
            isResetFlow: true // 🔹 CRITICAL: Tells OTP screen to go to ResetPassword
          }) }]
        );
      } else {
        const data = await response.json();
        setError(data.message || "Email not found.");
      }
    } catch (err) {
      setError("Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.premiumHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate("Login")}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.iconCircle}><Ionicons name="lock-closed" size={32} color="#001166" /></View>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>Enter your email to receive a verification code</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
              <TextInput
                placeholder="Enter your registered email"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.resetBtn} onPress={handleSendCode} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.resetBtnText}>Send Code</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  premiumHeader: { backgroundColor: "#001166", paddingTop: 80, paddingBottom: 40, alignItems: "center", borderBottomLeftRadius: 40, borderBottomRightRadius: 40, elevation: 10, position: "relative" },
  backBtn: { position: "absolute", top: 50, left: 20, padding: 8, zIndex: 10 },
  iconCircle: { width: 70, height: 70, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { color: "#FFFFFF", fontSize: 24, fontFamily: fonts.bold },
  subtitle: { color: "#C7D2FF", fontSize: 13, fontFamily: fonts.medium, marginTop: 6, textAlign: "center", paddingHorizontal: 40 },
  scrollContent: { paddingBottom: 40 },
  form: { paddingHorizontal: 30, paddingTop: 40 },
  label: { fontSize: 13, fontFamily: fonts.bold, color: "#374151", marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 16, paddingHorizontal: 16, height: 56 },
  input: { flex: 1, marginLeft: 12, fontFamily: fonts.medium, color: "#111827", fontSize: 15 },
  error: { color: "#DC2626", fontSize: 12, marginTop: 8, marginLeft: 8, fontFamily: fonts.medium },
  resetBtn: { backgroundColor: "#001166", height: 58, borderRadius: 999, justifyContent: "center", alignItems: "center", marginTop: 24 },
  resetBtnText: { color: "#fff", fontSize: 16, fontFamily: fonts.bold },
});