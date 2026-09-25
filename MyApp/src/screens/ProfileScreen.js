import { fileUrl } from '../utils/patientData';
import { API_BASE_URL } from '../config/config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import CustomAlertModal from "../components/CustomAlertModal";

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

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

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    try {
      await AsyncStorage.multiRemove(['userToken', 'userData', 'userEmail', 'rememberMe']);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch { Alert.alert('Could not log out', 'Your device could not clear the saved session. Please try again.'); }
  };

  const fullName = user
    ? `${user.first_name || user.firstName || ""} ${user.last_name || user.lastName || ""}`.trim()
    : "User Profile";

  const avatarUrl =
    fileUrl(user?.profile_picture || user?.profile_pic || user?.profile_image || user?.profileImage, API_BASE_URL);

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />

      {/* Curved Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20, overflow: "hidden" }]}><ScreenBackground header />
        <View style={styles.avatarWrapper}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.placeholderAvatar}>
              <Ionicons name="person" size={48} color={colors.muted} />
            </View>
          )}
        </View>
        <Text style={styles.userName}>{fullName || "Patient"}</Text>
        <Text style={styles.userEmail}>{user?.email || ""}</Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
        <TouchableOpacity accessibilityRole="button" style={styles.logoutBtn} onPress={() => setLogoutModalVisible(true)}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Custom Rounded Log Out Popup */}
      <CustomAlertModal
        visible={logoutModalVisible}
        type="warning"
        title="Log Out"
        message="Are you sure you want to log out of your OraVista account?"
        primaryText="Log Out"
        secondaryText="Cancel"
        onPrimaryPress={handleLogout}
        onSecondaryPress={() => setLogoutModalVisible(false)}
      />
    </View>
  );
}

function MenuItem({ icon, title, subtitle, onPress, isLast = false }) {
  return (
    <TouchableOpacity accessibilityRole="button"
      style={[styles.menuItem, isLast && styles.noBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuIconBox}>
        <Ionicons name={icon} size={22} color={colors.accent} />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: {
    backgroundColor: colors.primary,
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
    borderColor: colors.surface,
    overflow: "hidden",
    marginBottom: 12,
  },
  avatar: { width: "100%", height: "100%" },
  placeholderAvatar: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    color: colors.ink,
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  userEmail: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: fonts.regular,
    marginTop: 4,
  },
  content: { padding: 20, paddingBottom: 40 },
  sectionHeader: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuSection: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.aquaSoft,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.lavender,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.ink },
  menuSubtitle: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted, marginTop: 2 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    height: 54,
    borderRadius: 999,
    marginTop: 8,
  },
  logoutText: { color: "#EF4444", fontSize: 15, fontFamily: fonts.semiBold },
});