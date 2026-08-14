import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "../theme/fonts";
import ScreenHeader from "../components/ScreenHeader"; 

const SERVICES = [
  { 
    title: "General Dentistry", 
    desc: "Oral Prophylaxis (Cleaning), Restorations, and Extractions.", 
    price: "Starts ₱500",
    icon: "medical-outline",
    color: "#E0E7FF"
  },
  { 
    title: "Orthodontics (Braces)", 
    desc: "Low downpayment braces with affordable monthly adjustments.", 
    price: "₱4k DP",
    icon: "grid-outline",
    color: "#DCFCE7"
  },
  { 
    title: "Veneers & Esthetics", 
    desc: "Direct/Indirect Composite, Ceramage, and premium Emax veneers.", 
    price: "Starts ₱3,500",
    icon: "sparkles-outline",
    color: "#FEF3C7"
  },
  { 
    title: "Crowns & Bridges", 
    desc: "Plastic, Porcelain Fused to Metal (PFM), and Zirconia options.", 
    price: "Starts ₱3,500",
    icon: "hardware-chip-outline",
    color: "#F3E8FF"
  },
  { 
    title: "Consultation", 
    desc: "Comprehensive checkup. Fee is waived if a procedure is done.", 
    price: "₱300",
    icon: "chatbubbles-outline",
    color: "#FFEDD5"
  },
  { 
    title: "Oral Surgery", 
    desc: "Root Canal Treatment (RCT) and Wisdom Tooth surgeries.", 
    price: "Case to Case",
    icon: "flask-outline",
    color: "#D1FAE5"
  },
];

export default function ServicesScreen() {
  return (
    <View style={styles.container}>
      <ScreenHeader title="Our Services" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {SERVICES.map((service, index) => (
            <View key={index} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.iconContainer, { backgroundColor: service.color }]}>
                  <Ionicons name={service.icon} size={20} color="#001166" />
                </View>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>{service.price}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.title}>{service.title}</Text>
                <Text style={styles.desc}>{service.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footerNote}>
          <Ionicons name="information-circle-outline" size={18} color="#9CA3AF" />
          <Text style={styles.footerText}>
            Prices are base rates for cash payments only. Rates vary based on specific cases and materials used.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 16, paddingBottom: 40 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#FFFFFF",
    width: "48%", 
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#001166",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  priceBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: "#4B5563",
    textTransform: "uppercase",
  },
  cardBody: {
    minHeight: 90, 
  },
  title: { 
    fontSize: 14, 
    fontFamily: fonts.bold, 
    color: "#111827", 
    marginBottom: 6,
    lineHeight: 18 
  },
  desc: { 
    fontSize: 11, 
    fontFamily: fonts.medium, 
    color: "#6B7280", 
    lineHeight: 16 
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingHorizontal: 30,
    gap: 8,
  },
  footerText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 16,
  },
});