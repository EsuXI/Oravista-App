import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "../theme/fonts";
import { API_BASE_URL } from "../config/config";

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (loading) return;
    setError("");
    const cleanEmail = email.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);

      // Trigger OTP email using Cloud Run backend
      const response = await fetch(`${API_BASE_URL}/api/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          action: "forgot_password"
        })
      });

      const rawText = await response.text();
      let data = {};
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        data = {};
      }

      if (response.ok) {
        if (!/^\d{6}$/.test(String(data.generatedOtp || ""))) {
          setError("The server did not return a verification code. Please try again.");
          return;
        }
        Alert.alert(
          "Code Sent",
          "Check your email for the 6-digit verification code.",
          [{
            text: "Verify Now",
            onPress: () => navigation.navigate("OtpVerification", {
              email: cleanEmail,
              generatedOtp: data.generatedOtp ? String(data.generatedOtp) : "",
              isResetFlow: true // Directs to ResetPasswordScreen upon verification
            })
          }]
        );
      } else {
        setError(data.message || "Could not send the code. Please try again.");
      }
    } catch (err) {
      console.log("Forgot Password Error:", err);
      setError("Server connection failed. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={[styles.premiumHeader, { paddingTop: insets.top + 20, overflow: "hidden" }]}><ScreenBackground header />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" style={[styles.backBtn, { top: insets.top + 12, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }]} onPress={() => navigation.navigate("Login")}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </TouchableOpacity>
          <View style={styles.iconCircle}><Ionicons name="lock-closed" size={32} color={colors.accent} /></View>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>Enter your email to receive a verification code</Text>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={colors.muted} />
              <TextInput accessibilityLabel="Enter your registered email"
                placeholder="Enter your registered email"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity accessibilityRole="button" style={styles.resetBtn} onPress={handleSendCode} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.resetBtnText}>Send Code</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  premiumHeader: { backgroundColor: colors.primary, paddingTop: 80, paddingBottom: 40, alignItems: "center", borderBottomLeftRadius: 40, borderBottomRightRadius: 40, elevation: 3, position: "relative" },
  backBtn: { position: "absolute", top: 50, left: 20, padding: 8, zIndex: 10 },
  iconCircle: { width: 70, height: 70, borderRadius: 22, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { color: colors.ink, fontSize: 24, fontFamily: fonts.bold },
  subtitle: { color: colors.muted, fontSize: 13, fontFamily: fonts.medium, marginTop: 6, textAlign: "center", paddingHorizontal: 40 },
  scrollContent: { paddingBottom: 40 , maxWidth: 680, width: '100%', alignSelf: 'center' },
  form: { paddingHorizontal: 30, paddingTop: 40 , maxWidth: 680, width: '100%', alignSelf: 'center' },
  label: { fontSize: 13, fontFamily: fonts.bold, color: colors.ink, marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 16, height: 56 },
  input: { flex: 1, marginLeft: 12, fontFamily: fonts.medium, color: colors.ink, fontSize: 15 },
  error: { color: "#DC2626", fontSize: 12, marginTop: 8, marginLeft: 8, fontFamily: fonts.medium },
  resetBtn: { backgroundColor: colors.primary, height: 58, borderRadius: 999, justifyContent: "center", alignItems: "center", marginTop: 24 },
  resetBtnText: { color: colors.ink, fontSize: 16, fontFamily: fonts.bold },
});
