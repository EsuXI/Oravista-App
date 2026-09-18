import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem("userData");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (err) {
      console.log("Error loading profile data:", err);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("userToken");
          await AsyncStorage.removeItem("userData");
          await AsyncStorage.removeItem("userEmail");
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
        },
      },
    ]);
  };

  const fullName = user
    ? `${user.first_name || user.firstName || ""} ${user.last_name || user.lastName || ""}`.trim()
    : "User Profile";

  const avatarUrl =
    user?.profile_pic || user?.profile_image || user?.profileImage || null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001166" />

      {/* Curved Header */}
      <View style={styles.header}>
        <View style={styles.avatarWrapper}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.placeholderAvatar}>
              <Ionicons name="person" size={48} color="#9CA3AF" />
            </View>
          )}
        </View>
        <Text style={styles.userName}>{fullName || "Patient"}</Text>
        <Text style={styles.userEmail}>{user?.email || ""}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <Text style={styles.sectionHeader}>Account</Text>
        <View style={styles.menuSection}>
          <MenuItem
            icon="person-outline"
            title="Account Information"
            subtitle="View personal and contact details"
            onPress={() => navigation.navigate("AccountInformation")}
          />
          <MenuItem
            icon="create-outline"
            title="Edit Profile"
            subtitle="Update your name, photo, and bio"
            onPress={() => navigation.navigate("EditProfile")}
          />
          <MenuItem
            icon="settings-outline"
            title="Settings"
            subtitle="Change password and preferences"
            onPress={() => navigation.navigate("Settings")}
            isLast
          />
        </View>

        {/* Activity & History Section */}
        <Text style={styles.sectionHeader}>Activity & Records</Text>
        <View style={styles.menuSection}>
          <MenuItem
            icon="calendar-outline"
            title="Appointment History"
            subtitle="View past and upcoming visits"
            onPress={() => navigation.getParent()?.navigate("Appointments")}
          />
          <MenuItem
            icon="receipt-outline"
            title="Billings & Invoices"
            subtitle="Check your receipts and payment status"
            onPress={() => navigation.navigate("Billings")}
            isLast
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function MenuItem({ icon, title, subtitle, onPress, isLast = false }) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, isLast && styles.noBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuIconBox}>
        <Ionicons name={icon} size={22} color="#001166" />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    backgroundColor: "#001166",
    paddingTop: 55,
    paddingBottom: 32,
    alignItems: "center",
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    overflow: "hidden",
    marginBottom: 12,
  },
  avatar: { width: "100%", height: "100%" },
  placeholderAvatar: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  userEmail: {
    color: "#C7D2FF",
    fontSize: 13,
    fontFamily: fonts.regular,
    marginTop: 4,
  },
  content: { padding: 20, paddingBottom: 40 },
  sectionHeader: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24, // Rounder card styling
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16, // Extra rounded icon container
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 15, fontFamily: fonts.semiBold, color: "#111827" },
  menuSubtitle: { fontSize: 12, fontFamily: fonts.regular, color: "#6B7280", marginTop: 2 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    height: 54,
    borderRadius: 26,
    marginTop: 8,
  },
  logoutText: { color: "#EF4444", fontSize: 15, fontFamily: fonts.semiBold },
});