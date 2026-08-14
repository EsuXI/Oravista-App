import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { fonts } from "../theme/fonts";
import { API_BASE_URL } from '../config/config';
import ScreenHeader from "../components/ScreenHeader"; 

export default function AccountInformationScreen({ navigation }) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profilePic, setProfilePic] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const loadProfileData = async () => {
        setLoading(true);
        try {
          const userEmail = await AsyncStorage.getItem("userEmail");
          const response = await fetch(`${API_BASE_URL}/api/user-profile?email=${userEmail}`);
          const data = await response.json();

          if (response.ok) {
            setPatient(data);
            if (data.profile_picture) {
              setProfilePic(data.profile_picture.startsWith('http') ? data.profile_picture : `${API_BASE_URL}/${data.profile_picture}?t=${new Date().getTime()}`);
            }
          }
        } catch (error) {
          console.error("Failed to load profile", error);
        } finally {
          setLoading(false);
        }
      };
      loadProfileData();
    }, [])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#001166" />
      </View>
    );
  }

  const fullName = patient ? `${patient.first_name} ${patient.last_name}` : "User";

  return (
    <View style={styles.container}>
      <ScreenHeader 
        title="Account Details" 
        showBack={true} 
        rightIcon="create-outline" 
        onRightPress={() => navigation.navigate("EditProfile", { userData: patient })} 
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={40} color="#9CA3AF" />
            )}
          </View>
          <Text style={styles.userName}>{fullName}</Text>
          <Text style={styles.userEmail}>{patient?.email}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <InfoRow label="First Name" value={patient?.first_name} icon="person-outline" />
          <InfoRow label="Last Name" value={patient?.last_name} icon="person-outline" />
          <InfoRow label="Birthdate" value={patient?.dob || "Not set"} icon="calendar-outline" />
          <InfoRow label="Age" value={patient?.age ? `${patient.age} yrs old` : "Not set"} icon="calculator-outline" />
          <InfoRow label="Contact No" value={patient?.phone || "Not set"} icon="call-outline" />
          <InfoRow label="Address" value={patient?.address || "Not set"} icon="location-outline" />
          <InfoRow label="Occupation" value={patient?.occupation || "Not set"} icon="briefcase-outline" />
        </View>
      </ScrollView>
    </View>
  );
}

const InfoRow = ({ label, value, icon }) => (
  <View style={styles.infoRow}>
    <View style={styles.iconCircle}>
      <Ionicons name={icon} size={18} color="#001166" />
    </View>
    <View style={styles.infoTextContainer}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { paddingBottom: 40 },
  profileCard: {
    alignItems: "center", marginTop: 20, backgroundColor: "#FFFFFF", marginHorizontal: 20, borderRadius: 24, padding: 24, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
  },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#E5E7EB", overflow: "hidden", marginBottom: 12 },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  userName: { fontSize: 20, fontFamily: fonts.bold, color: "#111827" },
  userEmail: { fontSize: 14, fontFamily: fonts.medium, color: "#6B7280", marginTop: 2 },
  infoSection: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontFamily: fonts.bold, color: "#111827", marginBottom: 16, marginLeft: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: "#F3F4F6" },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#E0E7FF", justifyContent: "center", alignItems: "center" },
  infoTextContainer: { marginLeft: 14, flex: 1 },
  infoLabel: { fontSize: 12, color: "#9CA3AF", fontFamily: fonts.medium, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 15, color: "#111827", fontFamily: fonts.semiBold, marginTop: 1 },
});