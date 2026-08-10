import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  Alert, KeyboardAvoidingView, Platform, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "../theme/fonts";
import { API_BASE_URL } from '../config/config';

export default function ResetPasswordScreen({ navigation, route }) {
  const { email } = route.params; 
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
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      });

      if (response.ok) {
        Alert.alert("Success", "Your password has been reset securely!", [
          { text: "Login Now", onPress: () => navigation.navigate("Login") }
        ]);
      } else {
        Alert.alert("Error", "Could not reset password. Try again.");
      }
    } catch (err) {
      Alert.alert("Error", "Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.premiumHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.iconCircle}><Ionicons name="key" size={32} color="#001166" /></View>
          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>For account: {email}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            <Text style={styles.label}>New Password</Text>
            <PasswordInput value={newPassword} setValue={setNewPassword} show={showNew} setShow={setShowNew} placeholder="Enter new password" />
            {errors.new && <Error text={errors.new} />}
            <View style={styles.rulesBox}>
              <Rule label="One lowercase letter" valid={hasLower} /><Rule label="One uppercase letter" valid={hasUpper} /><Rule label="One number" valid={hasNumber} /><Rule label="One special character" valid={hasSpecial} /><Rule label="At least 8 characters" valid={hasLength} />
            </View>
            <Text style={[styles.label, { marginTop: 16 }]}>Confirm New Password</Text>
            <PasswordInput value={confirmPassword} setValue={setConfirmPassword} show={showConfirm} setShow={setShowConfirm} placeholder="Confirm new password" />
            {errors.confirm && <Error text={errors.confirm} />}
            <TouchableOpacity style={styles.saveBtn} onPress={handleResetPassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Reset Password</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* Helper Components & Styles as per source[cite: 11] */
function PasswordInput({ value, setValue, show, setShow, placeholder }) {
  return (
    <View style={styles.inputWrapper}>
      <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
      <TextInput placeholder={placeholder} placeholderTextColor="#9CA3AF" secureTextEntry={!show} style={styles.input} value={value} onChangeText={setValue} />
      <TouchableOpacity onPress={() => setShow(!show)} style={{ padding: 4 }}><Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color="#9CA3AF" /></TouchableOpacity>
    </View>
  );
}

function Rule({ label, valid }) {
  return (
    <View style={styles.ruleRow}>
      <Ionicons name={valid ? "checkmark-circle" : "ellipse-outline"} size={16} color={valid ? "#059669" : "#9CA3AF"} />
      <Text style={[styles.ruleText, valid && { color: "#059669", fontFamily: fonts.medium }]}>{label}</Text>
    </View>
  );
}
const Error = ({ text }) => <Text style={styles.error}>{text}</Text>;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  premiumHeader: { backgroundColor: "#001166", paddingTop: 80, paddingBottom: 40, alignItems: "center", borderBottomLeftRadius: 40, borderBottomRightRadius: 40, elevation: 10, position: "relative" },
  backBtn: { position: "absolute", top: 50, left: 20, padding: 8, zIndex: 10 },
  iconCircle: { width: 70, height: 70, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { color: "#FFFFFF", fontSize: 24, fontFamily: fonts.bold },
  subtitle: { color: "#C7D2FF", fontSize: 13, fontFamily: fonts.medium, marginTop: 6 },
  scrollContent: { paddingBottom: 40 },
  form: { paddingHorizontal: 30, paddingTop: 40 },
  label: { fontSize: 13, fontFamily: fonts.bold, color: "#374151", marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 16, paddingHorizontal: 16, height: 56 },
  input: { flex: 1, marginLeft: 12, fontFamily: fonts.medium, color: "#111827", fontSize: 15 },
  error: { color: "#DC2626", fontSize: 12, marginTop: 4, marginLeft: 8, fontFamily: fonts.medium },
  rulesBox: { backgroundColor: "#F0F4FF", borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: "#C7D2FF" },
  ruleRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  ruleText: { marginLeft: 8, fontSize: 12, color: "#6B7280", fontFamily: fonts.regular },
  saveBtn: { backgroundColor: "#001166", height: 58, borderRadius: 999, justifyContent: "center", alignItems: "center", marginTop: 32 },
  saveText: { color: "#fff", fontSize: 16, fontFamily: fonts.bold },
});