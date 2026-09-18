import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import { API_BASE_URL } from "../config/config";
import ScreenHeader from "../components/ScreenHeader"; 

export default function ChangePasswordScreen({ navigation }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("userData");
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        } else {
          const email = await AsyncStorage.getItem("userEmail");
          if (email) {
            setCurrentUser({ email });
          }
        }
      } catch (error) {
        console.log("Failed to load user info from AsyncStorage:", error);
      } finally {
        setLoading(false);
      }
    };
    loadUserFromStorage();
  }, []);

  // Password Rules
  const hasLower = /[a-z]/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const hasLength = newPassword.length >= 8;

  const isPasswordFocused = newPassword.length > 0;

  const validate = () => {
    let newErrors = {};

    if (!currentPassword) newErrors.current = "Enter current password";

    if (!newPassword) newErrors.new = "Enter new password";
    else if (!(hasLower && hasUpper && hasNumber && hasSpecial && hasLength))
      newErrors.new = "Password does not meet requirements";

    if (!confirmPassword) newErrors.confirm = "Confirm your password";
    else if (confirmPassword !== newPassword)
      newErrors.confirm = "Passwords do not match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRequestOtp = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      const user = currentUser;
      const userEmail = user?.email;

      if (!userEmail) {
        Alert.alert("Session Error", "Could not verify user email. Please re-login.");
        setSaving(false);
        return;
      }

      // Step 1: Verify current password with Cloud Run /api/login endpoint
      const verifyRes = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail.trim().toLowerCase(), password: currentPassword }),
      });

      const verifyContentType = verifyRes.headers.get("content-type") || "";
      let verifyData = {};
      if (verifyContentType.includes("application/json")) {
        verifyData = await verifyRes.json();
      }

      if (!verifyRes.ok) {
        setErrors({ current: verifyData.message || "Incorrect current password." });
        setSaving(false);
        return;
      }

      // Step 2: Request change-password verification code via Cloud Run /api/send-otp
      const otpRes = await fetch(`${API_BASE_URL}/api/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail.trim().toLowerCase(),
          action: "change_password",
        }),
      });

      const otpContentType = otpRes.headers.get("content-type") || "";
      let otpData = {};
      if (otpContentType.includes("application/json")) {
        otpData = await otpRes.json();
      }

      if (otpRes.ok) {
        navigation.navigate("OtpVerification", {
          email: userEmail,
          user: user,
          generatedOtp: otpData.generatedOtp ? String(otpData.generatedOtp) : "",
          isChangePasswordFlow: true,
          newPassword: newPassword,
        });
      } else {
        Alert.alert("Error", otpData.message || "Failed to send verification code.");
      }
    } catch (err) {
      console.log("Change password error:", err);
      Alert.alert("Connection Error", "Server connection failed. Please check your network.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#001166" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Change Password" showBack={true} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <Text style={styles.label}>Current Password</Text>
          <PasswordInput
            value={currentPassword}
            setValue={setCurrentPassword}
            show={showCurrent}
            setShow={setShowCurrent}
            placeholder="Enter current password"
          />
          {errors.current && <Error text={errors.current} />}

          <View style={styles.spacer} />

          <Text style={styles.label}>New Password</Text>
          <PasswordInput
            value={newPassword}
            setValue={setNewPassword}
            show={showNew}
            setShow={setShowNew}
            placeholder="Enter new password"
          />
          {errors.new && <Error text={errors.new} />}

          {/* Security requirements box */}
          {isPasswordFocused && (
            <View style={styles.rulesBox}>
              <Text style={styles.rulesTitle}>Security Requirements:</Text>
              <Rule label="One lowercase letter" valid={hasLower} />
              <Rule label="One uppercase letter" valid={hasUpper} />
              <Rule label="One number" valid={hasNumber} />
              <Rule label="One special character" valid={hasSpecial} />
              <Rule label="At least 8 characters" valid={hasLength} />
            </View>
          )}

          <View style={styles.spacer} />

          <Text style={styles.label}>Confirm New Password</Text>
          <PasswordInput
            value={confirmPassword}
            setValue={setConfirmPassword}
            show={showConfirm}
            setShow={setShowConfirm}
            placeholder="Confirm new password"
          />
          {errors.confirm && <Error text={errors.confirm} />}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleRequestOtp} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Verify & Update</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function PasswordInput({ value, setValue, show, setShow, placeholder }) {
  return (
    <View style={styles.inputContainer}>
      <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        secureTextEntry={!show}
        style={styles.input}
        value={value}
        onChangeText={setValue}
      />
      <TouchableOpacity onPress={() => setShow(!show)} style={styles.eyeBtn}>
        <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color="#6B7280" />
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
        color={valid ? "#059669" : "#9CA3AF"}
      />
      <Text style={[styles.ruleText, valid && { color: "#059669", fontFamily: fonts.semiBold }]}>
        {label}
      </Text>
    </View>
  );
}

const Error = ({ text }) => <Text style={styles.error}>{text}</Text>;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { paddingBottom: 40 },
  form: { padding: 24 },
  label: { marginBottom: 8, fontFamily: fonts.bold, color: "#374151", fontSize: 13, marginLeft: 4 },
  spacer: { height: 16 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 16, paddingHorizontal: 16, height: 56 },
  input: { flex: 1, marginLeft: 12, fontFamily: fonts.medium, color: "#111827", fontSize: 14 },
  eyeBtn: { padding: 4 },
  error: { color: "#DC2626", fontSize: 12, marginTop: 6, marginLeft: 12, fontFamily: fonts.medium },
  rulesBox: { backgroundColor: "#E0E7FF", borderRadius: 18, padding: 16, marginTop: 12, borderWidth: 1, borderColor: "#C7D2FF" },
  rulesTitle: { fontSize: 13, fontFamily: fonts.bold, color: "#001166", marginBottom: 10 },
  ruleRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  ruleText: { marginLeft: 8, fontSize: 12, color: "#6B7280", fontFamily: fonts.regular },
  buttonContainer: { marginTop: 32, gap: 12 },
  saveBtn: { backgroundColor: "#001166", height: 56, borderRadius: 999, justifyContent: "center", alignItems: "center", elevation: 2 },
  saveText: { color: "#FFFFFF", fontSize: 16, fontFamily: fonts.bold },
  cancelBtn: { height: 56, borderRadius: 999, justifyContent: "center", alignItems: "center", backgroundColor: "#F3F4F6" },
  cancelText: { fontSize: 16, fontFamily: fonts.bold, color: "#4B5563" },
});