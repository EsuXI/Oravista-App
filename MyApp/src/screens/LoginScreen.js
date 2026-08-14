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
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage"; 
import { fonts } from "../theme/fonts";
import { API_BASE_URL } from '../config/config';

export default function LoginScreen({ navigation }) {
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

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          password: password 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (remember) {
          await AsyncStorage.setItem("rememberedEmail", email.trim().toLowerCase());
        } else {
          await AsyncStorage.removeItem("rememberedEmail");
        }

        // Navigate and pass the OTP and User payload directly to the OtpVerification screen
        navigation.navigate("OtpVerification", { 
          email: email.trim().toLowerCase(), 
          rememberMe: remember,
          generatedOtp: data.generatedOtp, 
          user: data.user 
        });
      } else {
        setPasswordError(data.message || "Invalid email or password.");
      }

    } catch (error) {
      console.log("LOGIN ERROR:", error);
      Alert.alert(
        "Connection Error", 
        "Make sure your PC and phone are on the same Wi-Fi and the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <View style={styles.premiumHeader}>
          <View style={styles.logoBox}>
            <Image 
              source={require('../../assets/oravista_logo.png')} 
              style={styles.headerLogo} 
            />
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
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
              <TextInput
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
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
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!passwordVisible}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
                <Ionicons name={passwordVisible ? "eye-off-outline" : "eye-outline"} size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

            <View style={styles.rowBetween}>
              <TouchableOpacity 
                style={styles.rememberRow} 
                onPress={() => {
                  const nextState = !remember; 
                  setRemember(nextState);      
                  
                  if (!nextState) {
                    AsyncStorage.removeItem("rememberedEmail");
                  }
                }}
              >
                <View style={[styles.checkbox, remember && styles.checkboxActive]}>
                  {remember && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.loginBtn, loading && { opacity: 0.7 }]} 
              onPress={handleLogin} 
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Login</Text>}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
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
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  premiumHeader: {
    backgroundColor: "#001166",
    paddingTop: 70,
    paddingBottom: 40,
    alignItems: "center",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  logoBox: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerLogo: { width: "85%", height: "85%", resizeMode: "contain" },
  welcomeText: { color: "#FFFFFF", fontSize: 26, fontFamily: fonts.bold },
  subHeaderText: { color: "#C7D2FF", fontSize: 14, fontFamily: fonts.medium, marginTop: 4 },
  scrollContent: { paddingBottom: 40 },
  form: { paddingHorizontal: 30, paddingTop: 40 },
  label: { fontSize: 13, fontFamily: fonts.bold, color: "#374151", marginBottom: 8, marginLeft: 4 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  input: { flex: 1, marginLeft: 12, fontFamily: fonts.medium, color: "#111827", fontSize: 15 },
  inputError: { borderColor: "#DC2626", backgroundColor: "#FFF5F5" },
  errorText: { color: "#DC2626", fontSize: 12, marginTop: 6, marginBottom: 10, marginLeft: 8, fontFamily: fonts.medium },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 30, marginTop: 10 },
  rememberRow: { flexDirection: "row", alignItems: "center" },
  checkbox: { width: 20, height: 20, borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: "#001166", borderColor: "#001166" },
  rememberText: { marginLeft: 10, fontSize: 14, fontFamily: fonts.medium, color: "#4B5563" },
  forgotText: { color: "#001166", fontFamily: fonts.bold, fontSize: 14 },
  loginBtn: {
    backgroundColor: "#001166",
    height: 58,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  loginBtnText: { color: "#fff", fontSize: 16, fontFamily: fonts.bold },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { color: "#6B7280", fontFamily: fonts.medium },
  registerLink: { color: "#001166", fontFamily: fonts.bold }
});