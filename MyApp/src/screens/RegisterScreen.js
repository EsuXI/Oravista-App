import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "../theme/fonts";
import { API_BASE_URL } from '../config/config';

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({});

  // Password rules
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const hasLength = password.length >= 8;

  const isPasswordFocused = password.length > 0;

  const validate = () => {
    let newErrors = {};

    if (!firstName.trim()) newErrors.firstName = "First name is required";
    else if (!/^[\p{L}\p{M} '-]+$/u.test(firstName.trim())) newErrors.firstName = "Use letters, spaces, apostrophes or hyphens";
    else if (firstName.trim().length > 20) newErrors.firstName = "Max 20 characters";

    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    else if (!/^[\p{L}\p{M} '-]+$/u.test(lastName.trim())) newErrors.lastName = "Use letters, spaces, apostrophes or hyphens";
    else if (lastName.trim().length > 20) newErrors.lastName = "Max 20 characters";

    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) newErrors.email = "Invalid email address";

    if (!phone.trim()) newErrors.phone = "Phone number required";
    else if (!/^09[0-9]{9}$/.test(phone)) newErrors.phone = "Enter valid 11-digit mobile number";

    if (!password) newErrors.password = "Password required";
    else if (!(hasLower && hasUpper && hasNumber && hasSpecial && hasLength))
      newErrors.password = "Password does not meet requirements";

    if (!confirmPassword) newErrors.confirmPassword = "Please confirm password";
    else if (confirmPassword !== password)
      newErrors.confirmPassword = "Passwords do not match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAccount = async () => {
    if (loading || !validate()) return;
    setLoading(true);

    try {
      // 📦 THE "BUCKET" FOR THE DATABASE
      const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone,
        password,
        role: 'patient', // Explicitly set role for database
        branch: 'Main Branch'
      };

      // 🔹 ACTUAL BACKEND API CALL
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (!response.ok) {
        // If the server sends an error (like "Email already registered")
        setErrors({ email: data.message || "Registration failed." });
        setLoading(false);
        return;
      }

      // Success!
      Alert.alert(
        "Account Created!",
        "Welcome to OraVista Dental System.",
        [{ text: "Continue to Login", onPress: () => navigation.replace("Login") }]
      );

    } catch (error) {
      console.log("REGISTER ERROR:", error);
      Alert.alert(
        "Connection Error",
        "Could not reach OraVista. Check your internet connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>

        {/* 🔵 PREMIUM CURVED HEADER */}
        <View style={[styles.premiumHeader, { paddingTop: insets.top + 20, overflow: "hidden" }]}><ScreenBackground header />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" style={[styles.backBtn, { top: insets.top + 12, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Ionicons name="person-add" size={30} color={colors.accent} style={{ marginLeft: 4 }} />
          </View>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join OraVista to book your appointments</Text>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>

            <Text style={styles.label}>First Name</Text>
            <Input icon="person-outline" value={firstName} setValue={setFirstName} placeholder="Enter your first name" max={50} />
            {errors.firstName && <Error text={errors.firstName} />}

            <Text style={styles.label}>Last Name</Text>
            <Input icon="person-outline" value={lastName} setValue={setLastName} placeholder="Enter your last name" max={50} />
            {errors.lastName && <Error text={errors.lastName} />}

            <Text style={styles.label}>Email Address</Text>
            <Input icon="mail-outline" value={email} setValue={setEmail} placeholder="Enter your email" keyboard="email-address" />
            {errors.email && <Error text={errors.email} />}

            <Text style={styles.label}>Phone Number</Text>
            <Input icon="call-outline" value={phone} setValue={setPhone} placeholder="Enter your phone number" keyboard="phone-pad" max={11} />
            {errors.phone && <Error text={errors.phone} />}

            <Text style={styles.label}>Password</Text>
            <PasswordInput value={password} setValue={setPassword} show={showPassword} setShow={setShowPassword} placeholder="Create a password" />
            {errors.password && <Error text={errors.password} />}

            {isPasswordFocused && (
              <View style={styles.rulesBox}>
                <Rule label="One lowercase letter" valid={hasLower} />
                <Rule label="One uppercase letter" valid={hasUpper} />
                <Rule label="One number" valid={hasNumber} />
                <Rule label="One special character" valid={hasSpecial} />
                <Rule label="At least 8 characters" valid={hasLength} />
              </View>
            )}

            <Text style={styles.label}>Confirm Password</Text>
            <PasswordInput value={confirmPassword} setValue={setConfirmPassword} show={showConfirm} setShow={setShowConfirm} placeholder="Confirm your password" />
            {errors.confirmPassword && <Error text={errors.confirmPassword} />}

            {/* 🔘 PRIMARY ACTION */}
            <TouchableOpacity accessibilityRole="button" style={styles.createBtn} onPress={handleCreateAccount} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.createText}>Create Account</Text>}
            </TouchableOpacity>

            {/* DIVIDER */}
            <View style={styles.orRow}>
              <View style={styles.line} />
              <Text style={styles.or}>OR</Text>
              <View style={styles.line} />
            </View>

            {/* GOOGLE BUTTON */}
            <TouchableOpacity accessibilityRole="button" style={styles.googleBtn}>
              <Ionicons name="logo-google" size={18} color="#DB4437" />
              <Text style={styles.googleText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* LOGIN LINK */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate("Login")}>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ---------- Reusable Components ---------- */

function Input({ icon, value, setValue, placeholder, keyboard, max }) {
  return (
    <View style={styles.inputWrapper}>
      <Ionicons name={icon} size={20} color={colors.muted} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={value}
        onChangeText={setValue}
        keyboardType={keyboard}
        maxLength={max || undefined}
        autoCapitalize={keyboard === "email-address" ? "none" : "words"}
      />
    </View>
  );
}

function PasswordInput({ value, setValue, show, setShow, placeholder }) {
  return (
    <View style={styles.inputWrapper}>
      <Ionicons name="lock-closed-outline" size={20} color={colors.muted} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={!show}
        style={styles.input}
        value={value}
        onChangeText={setValue}
      />
      <TouchableOpacity accessibilityLabel="Show or hide password" hitSlop={8} accessibilityRole="button" onPress={() => setShow(!show)} style={{ padding: 4 }}>
        <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color={colors.muted} />
      </TouchableOpacity>
    </View>
  );
}

function Rule({ label, valid }) {
  return (
    <View style={styles.ruleRow}>
      <Ionicons name={valid ? "checkmark-circle" : "ellipse-outline"} size={16} color={valid ? "#059669" : colors.muted} />
      <Text style={[styles.ruleText, valid && { color: "#059669", fontFamily: fonts.medium }]}>{label}</Text>
    </View>
  );
}

function Error({ text }) {
  return <Text style={styles.error}>{text}</Text>;
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },

  premiumHeader: {
    backgroundColor: colors.primary,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: "center",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
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
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 3,
  },
  title: { color: colors.ink, fontSize: 24, fontFamily: fonts.bold },
  subtitle: { color: colors.muted, fontSize: 13, fontFamily: fonts.medium, marginTop: 6, textAlign: "center", paddingHorizontal: 40 },

  scrollContent: { paddingBottom: 40 , maxWidth: 680, width: '100%', alignSelf: 'center' },
  form: { paddingHorizontal: 30, paddingTop: 20 , maxWidth: 680, width: '100%', alignSelf: 'center' },

  label: { fontSize: 13, fontFamily: fonts.bold, color: colors.ink, marginBottom: 8, marginLeft: 4, marginTop: 16 },
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
  error: { color: "#DC2626", fontSize: 12, marginTop: 4, marginLeft: 8, fontFamily: fonts.medium },

  rulesBox: {
    backgroundColor: colors.aquaSoft,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  ruleRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  ruleText: { marginLeft: 8, fontSize: 12, color: colors.muted, fontFamily: fonts.regular },

  createBtn: {
    backgroundColor: colors.primary,
    height: 58,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  createText: { color: colors.ink, fontSize: 16, fontFamily: fonts.bold },

  orRow: { flexDirection: "row", alignItems: "center", marginVertical: 24 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { marginHorizontal: 14, color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },

  googleBtn: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    height: 58,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  googleText: { marginLeft: 10, fontSize: 15, fontFamily: fonts.semiBold, color: colors.ink },

  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 30 },
  footerText: { color: colors.muted, fontFamily: fonts.medium },
  loginLink: { color: colors.accent, fontFamily: fonts.bold }
});
