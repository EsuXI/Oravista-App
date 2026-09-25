import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";

export default function AccountInformationScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadUserData();
    });
    loadUserData();
    return unsubscribe;
  }, [navigation]);

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem("userData");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (err) {
      console.log("Error reading userData:", err);
    }
  };

  const fullName = user
    ? `${user.first_name || user.firstName || ""} ${user.last_name || user.lastName || ""}`.trim()
    : "—";

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />

      {/* Curved Header with Back Button */}
      <View style={[styles.header, { paddingTop: insets.top + 20, overflow: "hidden" }]}><ScreenBackground header />
        <TouchableOpacity accessibilityRole="button"
          accessibilityLabel="Go back" style={[styles.backButton, { top: insets.top + 12, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Information</Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <InfoRow icon="person-outline" label="Full Name" value={fullName || "—"} />
          <InfoRow icon="mail-outline" label="Email Address" value={user?.email || "—"} />
          <InfoRow icon="call-outline" label="Phone Number" value={user?.phone || "—"} />
          <InfoRow icon="calendar-outline" label="Date of Birth" value={user?.dob || "—"} />
          <InfoRow icon="hourglass-outline" label="Age" value={user?.age != null ? String(user.age) : "—"} />
          <InfoRow icon="transgender-outline" label="Sex / Gender" value={user?.sex || "—"} />
          <InfoRow icon="briefcase-outline" label="Occupation" value={user?.occupation || "—"} isLast />
        </View>

        <TouchableOpacity accessibilityRole="button"
          style={styles.editButton}
          onPress={() => navigation.navigate("EditProfile")}
        >
          <Ionicons name="create-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
          <Text style={styles.editButtonText}>Edit Information</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, isLast = false }) {
  return (
    <View style={[styles.infoRow, isLast && styles.noBorder]}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={20} color={colors.accent} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 55,
    paddingBottom: 28,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 55,
    padding: 4,
    zIndex: 10,
  },
  headerTitle: {
    flexShrink: 1, marginHorizontal: 44, textAlign: 'center',
    color: colors.ink,
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  content: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.aquaSoft,
  },
  noBorder: { borderBottomWidth: 0 },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.lavender,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  textContainer: { flex: 1 },
  label: { fontSize: 12, color: colors.muted, fontFamily: fonts.medium },
  value: { fontSize: 15, color: colors.ink, fontFamily: fonts.semiBold, marginTop: 2 },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accent,
    height: 52,
    borderRadius: 999,
    marginTop: 24,
  },
  editButtonText: { color: colors.accent, fontSize: 15, fontFamily: fonts.semiBold },
});