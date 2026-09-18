import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";

export default function AccountInformationScreen({ navigation }) {
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
      <StatusBar barStyle="light-content" backgroundColor="#001166" />
      
      {/* Curved Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Information</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <InfoRow icon="person-outline" label="Full Name" value={fullName || "—"} />
          <InfoRow icon="mail-outline" label="Email Address" value={user?.email || "—"} />
          <InfoRow icon="call-outline" label="Phone Number" value={user?.phone || "—"} />
          <InfoRow icon="calendar-outline" label="Date of Birth" value={user?.dob || "—"} />
          <InfoRow icon="hourglass-outline" label="Age" value={user?.age ? String(user.age) : "—"} />
          <InfoRow icon="transgender-outline" label="Sex / Gender" value={user?.sex || "—"} />
          <InfoRow icon="briefcase-outline" label="Occupation" value={user?.occupation || "—"} isLast />
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate("EditProfile")}
        >
          <Ionicons name="create-outline" size={18} color="#001166" style={{ marginRight: 8 }} />
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
        <Ionicons name={icon} size={20} color="#001166" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    backgroundColor: "#001166",
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
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  content: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  noBorder: { borderBottomWidth: 0 },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  textContainer: { flex: 1 },
  label: { fontSize: 12, color: "#6B7280", fontFamily: fonts.medium },
  value: { fontSize: 15, color: "#111827", fontFamily: fonts.semiBold, marginTop: 2 },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#001166",
    height: 52,
    borderRadius: 26,
    marginTop: 24,
  },
  editButtonText: { color: "#001166", fontSize: 15, fontFamily: fonts.semiBold },
});