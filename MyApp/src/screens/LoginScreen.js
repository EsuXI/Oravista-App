import BrandLogo from '../components/BrandLogo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import { API_BASE_URL } from "../config/config";

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const loadSavedEmail = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem("rememberedEmail");
        if (savedEmail) {
          setEmail(savedEmail);
          setRemember(true);
        }
      } catch (e) {
        console.log("Error loading saved email", e);
      }
    };
    loadSavedEmail();
  }, []);

  const handleLogin = async () => {
    if (loading) return;

    setEmailError("");
    setPasswordError("");

    if (!email) {
      setEmailError("Email is required.");
      return;
    }

    if (!password) {
      setPasswordError("Password is required.");
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Verify credentials against backend
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: password,
        }),
      });

      const rawText = await response.text();
      let data = {};
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        setPasswordError("Server returned an invalid response.");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setPasswordError(data.message || "Invalid email or password.");
        setLoading(false);
        return;
      }

      if (!data.user || !(data.user.id || data.user.user_id)) {
        setPasswordError('The server did not return your account. Please try again.');
        return;
      }
      // 2. Trigger 6-digit verification code
      let generatedOtp = "";
      let deliveryError = "";
      try {
        const otpRes = await fetch(`${API_BASE_URL}/api/send-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            action: "login",
          }),
        });
        const otpData = await otpRes.json();
        if (otpRes.ok && /^\d{6}$/.test(String(otpData.generatedOtp || ""))) {
          generatedOtp = String(otpData.generatedOtp);
        } else {
          deliveryError = otpData.message || "The code could not be sent. Please try Resend Code.";
        }
      } catch (otpErr) {
        deliveryError = "Unable to request a code. Check your connection and try Resend Code.";
        console.log("OTP trigger warning:", otpErr);
      }

      // 3. Persist remember flags for AuthGate
      if (remember) {
        await AsyncStorage.setItem("rememberMe", "true");
        await AsyncStorage.setItem("rememberedEmail", cleanEmail);
      } else {
        await AsyncStorage.removeItem("rememberMe");
        await AsyncStorage.removeItem("rememberedEmail");
      }

      navigation.navigate("OtpVerification", {
        email: cleanEmail,
        rememberMe: remember,
        generatedOtp: generatedOtp,
        deliveryError,
        user: data.user,
      });
    } catch (error) {
      console.log("LOGIN ERROR:", error);
      Alert.alert(
        "Connection Error",
        "Cannot reach the clinic server. Please check your internet connection."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={[styles.premiumHeader, { paddingTop: insets.top + 20, overflow: "hidden" }]}><ScreenBackground header />
          <View style={styles.logoBox}>
            <BrandLogo variant="horizontal" width={188} />
          </View>
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.subHeaderText}>Sign in to continue</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputWrapper, emailError && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color={colors.muted} />
              <TextInput accessibilityLabel="Enter your email"
                placeholder="Enter your email"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrapper, passwordError && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.muted} />
              <TextInput accessibilityLabel="Enter your password"
                placeholder="Enter your password"
                placeholderTextColor={colors.muted}
                secureTextEntry={!passwordVisible}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity accessibilityLabel="Show or hide password" hitSlop={8} accessibilityRole="button" onPress={() => setPasswordVisible(!passwordVisible)}>
                <Ionicons
                  name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.muted}
                />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

            <View style={styles.rowBetween}>
              <TouchableOpacity accessibilityRole="button"
                style={styles.rememberRow}
                onPress={() => {
                  const nextState = !remember;
                  setRemember(nextState);

                }}
              >
                <View style={[styles.checkbox, remember && styles.checkboxActive]}>
                  {remember && <Ionicons name="checkmark" size={12} color={colors.ink} />}
                </View>
                <Text style={styles.rememberText}>Remember email</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate("ForgotPassword")}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity accessibilityRole="button"
              style={[styles.loginBtn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <Text style={styles.loginBtnText}>Login</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate("Register")}>
                <Text style={styles.registerLink}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  premiumHeader: {
    backgroundColor: colors.primary,
    paddingTop: 70,
    paddingBottom: 40,
    alignItems: "center",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  logoBox: {
    width: 220,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  headerLogo: { width: "85%", height: "85%", resizeMode: "contain" },
  welcomeText: { color: colors.ink, fontSize: 26, fontFamily: fonts.bold },
  subHeaderText: { color: colors.muted, fontSize: 14, fontFamily: fonts.medium, marginTop: 4 },
  scrollContent: { paddingBottom: 40 , maxWidth: 680, width: '100%', alignSelf: 'center' },
  form: { paddingHorizontal: 30, paddingTop: 40 , maxWidth: 680, width: '100%', alignSelf: 'center' },
  label: { fontSize: 13, fontFamily: fonts.bold, color: colors.ink, marginBottom: 8, marginLeft: 4 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  input: { flex: 1, marginLeft: 12, fontFamily: fonts.medium, color: colors.ink, fontSize: 15 },
  inputError: { borderColor: "#DC2626", backgroundColor: "#FFF5F5" },
  errorText: { color: "#DC2626", fontSize: 12, marginTop: 6, marginBottom: 10, marginLeft: 8, fontFamily: fonts.medium },
  rowBetween: { flexWrap: "wrap", rowGap: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 30, marginTop: 10 },
  rememberRow: { flexDirection: "row", alignItems: "center" },
  checkbox: { width: 20, height: 20, borderWidth: 1.5, borderColor: colors.border, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.accent },
  rememberText: { marginLeft: 10, fontSize: 14, fontFamily: fonts.medium, color: colors.muted },
  forgotText: { color: colors.accent, fontFamily: fonts.bold, fontSize: 14 },
  loginBtn: {
    backgroundColor: colors.primary,
    height: 58,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  loginBtnText: { color: colors.ink, fontSize: 16, fontFamily: fonts.bold },
  footerRow: { flexWrap: "wrap", rowGap: 8, flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { color: colors.muted, fontFamily: fonts.medium },
  registerLink: { color: colors.accent, fontFamily: fonts.bold },
});
