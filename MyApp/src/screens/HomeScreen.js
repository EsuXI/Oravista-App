import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { fonts } from "../theme/fonts";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      {/* 🔵 PREMIUM HEADER */}
      <View style={styles.headerBar}>
        <Text style={styles.clinicName}>King Epres Dental Clinic</Text>
        <Text style={styles.tagline}>Quality Care, Accessible to All</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* 🏥 MISSION & ABOUT SECTION */}
        <View style={styles.mainCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="medal-outline" size={24} color="#001166" />
          </View>
          <Text style={styles.cardTitle}>Our Mission</Text>
          <Text style={styles.cardText}>
            To provide affordable, accessible, quality dental care with a personal
            touch, aiming for patient comfort and empowerment.
          </Text>
        </View>

        <View style={styles.mainCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="business-outline" size={24} color="#001166" />
          </View>
          <Text style={styles.cardTitle}>About Us</Text>
          <Text style={styles.cardText}>
            A growing dental service in the Philippines, known for making quality
            care accessible. Praised for friendly staff and reducing dental anxiety.
          </Text>
        </View>

        {/* 📍 LOCATIONS SECTION */}
        <Text style={styles.sectionLabel}>Our Branches</Text>
        <View style={styles.locationGroup}>
          <LocationItem 
            branch="Pasay Branch" 
            address="2015 Gil Puyat Ave, Near LRT Gil Puyat" 
          />
          <LocationItem 
            branch="Sta. Ana, Manila" 
            address="2566 Tejeron St, Near Puregold Makati" 
          />
          <LocationItem 
            branch="Angeles City" 
            address="Central Luzon Branch" 
          />
        </View>

        {/* 📞 QUICK CONTACT ROW */}
        <View style={styles.row}>
          <View style={styles.smallCard}>
            <Ionicons name="call" size={20} color="#001166" />
            <Text style={styles.smallTitle}>Contact</Text>
            <Text style={styles.smallValue}>0977 373 0874</Text>
          </View>

          <View style={styles.smallCard}>
            <Ionicons name="card" size={20} color="#001166" />
            <Text style={styles.smallTitle}>Payment</Text>
            <Text style={styles.smallValue}>Cashless accepted</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

/* 🔹 Reusable Location Item */
const LocationItem = ({ branch, address }) => (
  <View style={styles.locationItem}>
    <View style={styles.locDot} />
    <View style={{ flex: 1 }}>
      <Text style={styles.locBranch}>{branch}</Text>
      <Text style={styles.locAddress}>{address}</Text>
    </View>
    <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },

  /* 🔵 HEADER */
  headerBar: {
    paddingTop: 60,
    paddingBottom: 30,
    backgroundColor: "#001166",
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 5,
  },
  clinicName: { color: "#FFFFFF", fontSize: 22, fontFamily: fonts.bold },
  tagline: { color: "#C7D2FF", fontSize: 13, fontFamily: fonts.medium, marginTop: 4 },

  content: { padding: 20, paddingBottom: 40 },

  /* 🔹 MAIN CARDS */
  mainCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#E0E7FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontFamily: fonts.bold, color: "#111827", marginBottom: 6 },
  cardText: { fontSize: 13, fontFamily: fonts.regular, color: "#4B5563", lineHeight: 20 },

  /* 📍 LOCATIONS */
  sectionLabel: { 
    fontSize: 12, 
    fontFamily: fonts.bold, 
    color: "#9CA3AF", 
    textTransform: "uppercase", 
    letterSpacing: 1, 
    marginTop: 10, 
    marginBottom: 12,
    marginLeft: 4
  },
  locationGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 20,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  locDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#001166", marginRight: 12 },
  locBranch: { fontSize: 14, fontFamily: fonts.semiBold, color: "#111827" },
  locAddress: { fontSize: 12, fontFamily: fonts.regular, color: "#6B7280", marginTop: 2 },

  /* 📞 QUICK CONTACTS */
  row: { flexDirection: "row", gap: 12 },
  smallCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  smallTitle: { fontSize: 12, fontFamily: fonts.bold, color: "#111827", marginTop: 8 },
  smallValue: { fontSize: 11, fontFamily: fonts.medium, color: "#6B7280", marginTop: 2, textAlign: 'center' },
});