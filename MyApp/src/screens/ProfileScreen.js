import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from "react-native"; 
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { fonts } from "../theme/fonts";
import ScreenHeader from "../components/ScreenHeader";
import { API_BASE_URL } from '../config/config'; // 🔹 ADDED API URL

export default function ProfileScreen({ navigation }) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profilePic, setProfilePic] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        setLoading(true);
        try {
          const userEmail = await AsyncStorage.getItem("userEmail");
          const response = await fetch(`${API_BASE_URL}/api/user-profile?email=${userEmail}`);
          const data = await response.json();

          if (response.ok) {
            setPatient(data);
            // If they have a profile picture in the DB, show it using the server URL
            if (data.profile_picture) {
              setProfilePic(`${API_BASE_URL}/${data.profile_picture}`);
            }
          }
        } catch (error) {
          console.error("Failed to load profile", error);
        } finally {
          setLoading(false);
        }
      };
      loadProfile();
    }, [])
  );

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        style: "destructive", 
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("rememberMe");
            await AsyncStorage.removeItem("userEmail");
            await AsyncStorage.removeItem("userToken");
            navigation.replace("Landing");
          } catch (error) {
            console.log("LOGOUT ERROR:", error);
          }
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#001166" />
      </View>
    );
  }

  const fullName = patient ? `${patient.first_name} ${patient.last_name}` : "User";

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Profile" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={40} color="#9CA3AF" />
            )}
          </View>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.email}>{patient?.email}</Text>
        </View>

        <View style={styles.menuSection}>
          <MenuItem
            icon="person-outline"
            label="Account Information"
            onPress={() => navigation.navigate("AccountInformation")}
          />
          <MenuItem
            icon="card-outline"
            label="Billings"
            onPress={() => navigation.navigate("Billings")}
          />
          <MenuItem
            icon="settings-outline"
            label="Settings"
            onPress={() => navigation.navigate("Settings")}
          />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function MenuItem({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuIconContainer}>
        <Ionicons name={icon} size={20} color="#001166" />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { paddingBottom: 40 },

  profileCard: {
    alignItems: "center",
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  avatarContainer: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#E5E7EB", overflow: "hidden", marginBottom: 12,
  },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  name: { color: "#111827", fontSize: 20, fontFamily: fonts.bold },
  email: { color: "#6B7280", marginTop: 4, fontFamily: fonts.medium },

  menuSection: { marginTop: 24, paddingHorizontal: 20 },
  menuItem: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: "#F3F4F6",
  },
  menuIconContainer: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: "#E0E7FF", justifyContent: "center", alignItems: "center", marginRight: 14,
  },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: fonts.medium, color: "#374151" },

  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20, height: 58, marginHorizontal: 20, borderRadius: 999, backgroundColor: "#FEE2E2", borderWidth: 1, borderColor: "#FCA5A5",
  },
  logoutText: { marginLeft: 8, fontSize: 16, color: "#DC2626", fontFamily: fonts.bold },
});