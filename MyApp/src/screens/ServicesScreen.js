import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "../theme/fonts";
import ScreenHeader from "../components/ScreenHeader"; 

const SERVICES = [
  { 
    title: "General Dentistry", 
    desc: "Oral Prophylaxis starts at ₱500. Restorations start at ₱500 (Back) and ₱700 (Front).", 
    price: "Starts ₱500",
    icon: "medical-outline",
    color: "#E0E7FF"
  },
  { 
    title: "Oral Surgery", 
    desc: "Standard tooth extractions start at ₱700 (excluding 3rd molar/wisdom tooth).", 
    price: "Starts ₱700",
    icon: "flask-outline",
    color: "#D1FAE5"
  },
  { 
    title: "Veneers & Esthetics", 
    desc: "Direct (₱3,500), Indirect (₱4,500), Ceramage (₱6,500), and Emax (₱15,000) per unit.", 
    price: "Starts ₱3,500",
    icon: "sparkles-outline",
    color: "#FEF3C7"
  },
  { 
    title: "Crowns & Bridges", 
    desc: "Plastic (₱3,500), PFM (₱4,500), PFM Zirconia (₱12,500), and Zirconia (₱18,000) per unit.", 
    price: "Starts ₱3,500",
    icon: "hardware-chip-outline",
    color: "#F3E8FF"
  },
  { 
    title: "Consultation", 
    desc: "Comprehensive checkup. The ₱300 fee is waived once another treatment is done.", 
    price: "₱300",
    icon: "chatbubbles-outline",
    color: "#FFEDD5"
  },
  { 
    title: "Specialized Treatments", 
    desc: "Root Canal Treatment (RCT), Wisdom Tooth Surgery, Whitening, and Dentures.", 
    price: "Inquire",
    icon: "briefcase-outline",
    color: "#DCFCE7"
  },
];

export default function ServicesScreen() {
  return (
    <View style={styles.container}>
      <ScreenHeader title="Our Services" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* SPECIAL OFFER BANNER */}
        <View style={styles.promoCard}>
          <View style={styles.promoHeader}>
            <Ionicons name="star" size={18} color="#F59E0B" />
            <Text style={styles.promoHeaderText}>SPECIAL OFFER</Text>
          </View>
          <Text style={styles.promoTitle}>Braces Installment Package</Text>
          <Text style={styles.promoTotal}>Total Package: ₱40k - ₱45k</Text>
          
          <View style={styles.promoPriceRow}>
            <View style={styles.promoPriceBox}>
              <Text style={styles.promoPriceLabel}>Low Downpayment</Text>
              <Text style={styles.promoPriceValue}>₱4,000</Text>
            </View>
            <View style={styles.promoPriceBox}>
              <Text style={styles.promoPriceLabel}>Monthly Adjustment</Text>
              <Text style={styles.promoPriceValue}>₱1,000</Text>
            </View>
          </View>

          <View style={styles.promoIncludes}>
            <Text style={styles.promoIncludesTitle}>Package Includes:</Text>
            <View style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.bulletText}>Free Panoramic X-ray</Text>
            </View>
            <View style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.bulletText}>Free Mild Cleaning</Text>
            </View>
            <View style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.bulletText}>Intra-Oral Photograph</Text>
            </View>
          </View>
        </View>

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
          <Ionicons name="information-circle-outline" size={24} color="#DC2626" />
          <Text style={styles.footerText}>
            <Text style={{fontFamily: fonts.bold, color: "#DC2626"}}>Important Note:</Text> The promotional rates and basic prices listed above are only eligible for <Text style={{fontFamily: fonts.bold}}>CASH PAYMENTS</Text>. Regular rates will be applied for credit card transactions.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 16, paddingBottom: 40 },
  
  // PROMO STYLES
  promoCard: { backgroundColor: "#001166", borderRadius: 24, padding: 20, marginBottom: 24, elevation: 4, shadowColor: "#001166", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  promoHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 6 },
  promoHeaderText: { color: "#F59E0B", fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1 },
  promoTitle: { color: "#FFFFFF", fontFamily: fonts.bold, fontSize: 20, marginBottom: 4 },
  promoTotal: { color: "#D1D5DB", fontFamily: fonts.medium, fontSize: 13, marginBottom: 16 },
  promoPriceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, gap: 12 },
  promoPriceBox: { flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  promoPriceLabel: { color: "#9CA3AF", fontFamily: fonts.medium, fontSize: 11, marginBottom: 4 },
  promoPriceValue: { color: "#FFFFFF", fontFamily: fonts.bold, fontSize: 18 },
  promoIncludes: { backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 14, padding: 16 },
  promoIncludesTitle: { color: "#111827", fontFamily: fonts.bold, fontSize: 13, marginBottom: 8 },
  bulletRow: { flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 8 },
  bulletText: { color: "#4B5563", fontFamily: fonts.medium, fontSize: 12 },

  // GRID STYLES
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: { backgroundColor: "#FFFFFF", width: "48%", borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#001166", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  iconContainer: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  priceBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8 },
  priceText: { fontSize: 9, fontFamily: fonts.bold, color: "#4B5563", textTransform: "uppercase" },
  cardBody: { minHeight: 90 },
  title: { fontSize: 14, fontFamily: fonts.bold, color: "#111827", marginBottom: 6, lineHeight: 18 },
  desc: { fontSize: 11, fontFamily: fonts.medium, color: "#6B7280", lineHeight: 16 },
  
  // FOOTER STYLES
  footerNote: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#FEF2F2", padding: 16, borderRadius: 16, marginTop: 10, gap: 10, borderWidth: 1, borderColor: "#FCA5A5" },
  footerText: { flex: 1, fontSize: 12, fontFamily: fonts.medium, color: "#991B1B", lineHeight: 18 },
});