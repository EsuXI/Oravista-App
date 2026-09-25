import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "../theme/fonts";
import { API_BASE_URL } from "../config/config";

export default function ResetPasswordScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const email = route?.params?.email || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});

  const hasLower = /[a-z]/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const hasLength = newPassword.length >= 8;

  const validate = () => {
    let newErrors = {};
    if (!newPassword) newErrors.new = "Enter new password";
    else if (!(hasLower && hasUpper && hasNumber && hasSpecial && hasLength))
      newErrors.new = "Password does not meet requirements";
    if (!confirmPassword) newErrors.confirm = "Confirm your password";
    else if (confirmPassword !== newPassword)
      newErrors.confirm = "Passwords do not match";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (loading || !validate()) return;
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      // UI flow guard only; the existing server checks no OTP proof on this route.
      if (!cleanEmail || route?.params?.otpVerified !== true) {
        Alert.alert("Verification Required", "Please request and verify an email code first.", [
          { text: "Request Code", onPress: () => navigation.navigate("ForgotPassword") },
        ]);
        return;
      }

      // Match the existing Cloud Run / web forgot-password contract.
      const response = await fetch(`${API_BASE_URL}/api/reset-password-by-email`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          newPassword: newPassword,
        }),
      });

      const rawText = await response.text();
      let data = {};
      try {
        data = JSON.parse(rawText);
      } catch (e) {}

      if (response.ok) {
        navigation.setParams({ otpVerified: false });
        Alert.alert("Success", "Your password has been reset successfully!", [
          { text: "Login Now", onPress: () => navigation.reset({ index: 0, routes: [{ name: "Login" }] }) },
        ]);
      } else {
        Alert.alert("Error", data.message || "Could not reset password. Try again.");
      }
    } catch (err) {
      console.log("Reset Password Error:", err);
      Alert.alert("Error", "Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={[styles.premiumHeader, { paddingTop: insets.top + 20, overflow: "hidden" }]}><ScreenBackground header />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" style={[styles.backBtn, { top: insets.top + 12, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </TouchableOpacity>
          <View style={styles.iconCircle}>
            <Ionicons name="key" size={32} color={colors.accent} />
          </View>
          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>For account: {email}</Text>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            <Text style={styles.label}>New Password</Text>
            <PasswordInput
              value={newPassword}
              setValue={setNewPassword}
              show={showNew}
              setShow={setShowNew}
              placeholder="Enter new password"
            />
            {errors.new && <Error text={errors.new} />}

            <View style={styles.rulesBox}>
              <Rule label="One lowercase letter" valid={hasLower} />
              <Rule label="One uppercase letter" valid={hasUpper} />
              <Rule label="One number" valid={hasNumber} />
              <Rule label="One special character" valid={hasSpecial} />
              <Rule label="At least 8 characters" valid={hasLength} />
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>Confirm New Password</Text>
            <PasswordInput
              value={confirmPassword}
              setValue={setConfirmPassword}
              show={showConfirm}
              setShow={setShowConfirm}
              placeholder="Confirm new password"
            />
            {errors.confirm && <Error text={errors.confirm} />}

            <TouchableOpacity accessibilityRole="button" style={styles.saveBtn} onPress={handleResetPassword} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.saveText}>Reset Password</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
      <Ionicons
        name={valid ? "checkmark-circle" : "ellipse-outline"}
        size={16}
        color={valid ? "#059669" : colors.muted}
      />
      <Text style={[styles.ruleText, valid && { color: "#059669", fontFamily: fonts.medium }]}>
        {label}
      </Text>
    </View>
  );
}

const Error = ({ text }) => <Text style={styles.error}>{text}</Text>;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  premiumHeader: {
    backgroundColor: colors.primary,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: "center",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    elevation: 3,
    position: "relative",
  },
  backBtn: { position: "absolute", top: 50, left: 20, padding: 8, zIndex: 10 },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { color: colors.ink, fontSize: 24, fontFamily: fonts.bold },
  subtitle: { color: colors.muted, fontSize: 13, fontFamily: fonts.medium, marginTop: 6 },
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
  error: { color: "#DC2626", fontSize: 12, marginTop: 4, marginLeft: 8, fontFamily: fonts.medium },
  rulesBox: {
    backgroundColor: colors.aquaSoft,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ruleRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  ruleText: { marginLeft: 8, fontSize: 12, color: colors.muted, fontFamily: fonts.regular },
  saveBtn: {
    backgroundColor: colors.primary,
    height: 58,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
  },
  saveText: { color: colors.ink, fontSize: 16, fontFamily: fonts.bold },
});
