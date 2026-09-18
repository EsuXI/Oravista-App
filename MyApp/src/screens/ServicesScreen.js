import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "../theme/fonts";
import ScreenHeader from "../components/ScreenHeader";

// Canonical services matching booking database & pricing
const SERVICES_DATA = [
  {
    category: "General Dentistry",
    icon: "medical-outline",
    color: "#E0E7FF",
    items: [
      { name: "Oral Prophylaxis", price: "₱1,500", duration: "30 mins", desc: "Routine professional teeth cleaning, plaque, and tartar removal." },
      { name: "Restoration", price: "₱1,200", duration: "1 hr", desc: "Composite tooth-colored fillings for cavities and chipped teeth." },
      { name: "Extraction", price: "₱1,000", duration: "1 hr", desc: "Simple and routine tooth extractions with local anesthesia." },
    ],
  },
  {
    category: "Orthodontics",
    icon: "sparkles-outline",
    color: "#FEF3C7",
    items: [
      { name: "Braces Installation", price: "₱35,000", duration: "1 hr", desc: "Comprehensive metal/ceramic bracket placement for dental alignment." },
      { name: "Braces Adjustment", price: "₱1,000", duration: "30 mins", desc: "Routine monthly wire tightening and ligature replacement." },
      { name: "Veneers", price: "₱15,000", duration: "2 hrs", desc: "Custom porcelain or composite esthetic facade enhancements." },
    ],
  },
  {
    category: "Restorative Treatment",
    icon: "shield-checkmark-outline",
    color: "#DCFCE7",
    items: [
      { name: "Root Canal (RCT)", price: "₱8,000", duration: "2 hrs", desc: "Endodontic therapy to eliminate infected pulp tissue and save natural teeth." },
      { name: "Wisdom Tooth Surgery", price: "₱10,000", duration: "3 hrs", desc: "Odontectomy for impacted, painful, or misaligned third molars." },
      { name: "Dentures", price: "₱5,000", duration: "30 mins", desc: "Removable partial or full prosthetic dental arch replacements." },
      { name: "Fixed Bridge", price: "₱12,000", duration: "2 hrs", desc: "Permanent prosthetic replacement anchored to neighboring abutment teeth." },
      { name: "Teeth Whitening", price: "₱7,000", duration: "1 hr 30 mins", desc: "In-office LED laser bleaching for deep dental stain elimination." },
    ],
  },
];

// Branch directory matching the booking schedule rosters
const CLINIC_BRANCHES = [
  {
    name: "Main Branch - Gil Puyat",
    area: "Pasay City, Metro Manila",
    address: "2015 Sen. Gil Puyat Ave, Pasay City",
    hours: "Mon - Sat: 9:00 AM – 6:00 PM\nSun: 10:00 AM – 5:00 PM",
    phone: "(02) 8844-3210 / 0917-555-4321",
    dentists: [
      "Dra. Theresa Madrid",
      "Dra. Ruth Bozar",
      "Dr. Vicente Epres",
      "Dra. Queenie Balmedina",
    ],
  },
  {
    name: "Sta. Ana Branch",
    area: "Manila City",
    address: "2234 Pedro Gil St, Sta. Ana, Manila",
    hours: "Mon - Sat: 9:00 AM – 6:00 PM\nSun: Closed",
    phone: "(02) 8562-1188 / 0920-444-8899",
    dentists: ["Dra. Queenie Balmedina", "Dr. Vicente Epres"],
  },
  {
    name: "Angeles Branch",
    area: "Angeles, Pampanga",
    address: "McArthur Highway, Balibago, Angeles City",
    hours: "Mon - Sat: 10:00 AM – 6:00 PM\nSun: Closed",
    phone: "(045) 625-7800 / 0998-333-2211",
    dentists: ["Dra. Paulette Maliit", "Dr. Vicente Epres"],
  },
];

export default function ServicesScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("services"); // "services" | "branches"

  return (
    <View style={styles.container}>
      <ScreenHeader title="Services & Clinics" />

      {/* SEGMENTED TAB SWITCHER */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "services" && styles.tabButtonActive]}
          onPress={() => setActiveTab("services")}
        >
          <Ionicons
            name="medical"
            size={16}
            color={activeTab === "services" ? "#FFFFFF" : "#001166"}
          />
          <Text
            style={[styles.tabButtonText, activeTab === "services" && styles.tabButtonTextActive]}
          >
            Services & Pricing
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === "branches" && styles.tabButtonActive]}
          onPress={() => setActiveTab("branches")}
        >
          <Ionicons
            name="business"
            size={16}
            color={activeTab === "branches" ? "#FFFFFF" : "#001166"}
          />
          <Text
            style={[styles.tabButtonText, activeTab === "branches" && styles.tabButtonTextActive]}
          >
            Branch Locations
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === "services" ? (
          <>
            {/* SPECIAL PROMO BANNER */}
            <View style={styles.promoCard}>
              <View style={styles.promoHeader}>
                <Ionicons name="star" size={18} color="#F59E0B" />
                <Text style={styles.promoHeaderText}>SPECIAL OFFER</Text>
              </View>
              <Text style={styles.promoTitle}>Braces Installment Package</Text>
              <Text style={styles.promoTotal}>Full Treatment Plan: ₱35,000 – ₱45,000</Text>

              <View style={styles.promoPriceRow}>
                <View style={styles.promoPriceBox}>
                  <Text style={styles.promoPriceLabel}>Downpayment</Text>
                  <Text style={styles.promoPriceValue}>₱4,000</Text>
                </View>
                <View style={styles.promoPriceBox}>
                  <Text style={styles.promoPriceLabel}>Monthly Adjustment</Text>
                  <Text style={styles.promoPriceValue}>₱1,000</Text>
                </View>
              </View>

              <View style={styles.promoIncludes}>
                <Text style={styles.promoIncludesTitle}>Package Inclusions:</Text>
                <View style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.bulletText}>Free Panoramic X-ray Assessment</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.bulletText}>Complimentary Mild Cleaning</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.bulletText}>Intra-Oral Diagnostic Photographs</Text>
                </View>
              </View>
            </View>

            {/* SERVICES BY CATEGORY */}
            {SERVICES_DATA.map((cat, idx) => (
              <View key={idx} style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <View style={[styles.catIconContainer, { backgroundColor: cat.color }]}>
                    <Ionicons name={cat.icon} size={18} color="#001166" />
                  </View>
                  <Text style={styles.categoryTitle}>{cat.category}</Text>
                </View>

                {cat.items.map((item, itemIdx) => (
                  <View key={itemIdx} style={styles.serviceItemCard}>
                    <View style={styles.serviceItemHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceItemName}>{item.name}</Text>
                        <Text style={styles.serviceItemDuration}>
                          <Ionicons name="time-outline" size={12} color="#6B7280" /> {item.duration}
                        </Text>
                      </View>
                      <View style={styles.priceBadge}>
                        <Text style={styles.priceText}>{item.price}</Text>
                      </View>
                    </View>
                    <Text style={styles.serviceItemDesc}>{item.desc}</Text>
                  </View>
                ))}
              </View>
            ))}

            <View style={styles.footerNote}>
              <Ionicons name="information-circle-outline" size={24} color="#DC2626" />
              <Text style={styles.footerText}>
                <Text style={{ fontFamily: fonts.bold, color: "#DC2626" }}>Important Note:</Text>{" "}
                The listed standard prices reflect cash appointments. Final pricing may vary depending
                on intraoral assessment and restorative materials selected by your dentist.
              </Text>
            </View>
          </>
        ) : (
          /* BRANCHES DIRECTORY VIEW */
          <View style={styles.branchesList}>
            <Text style={styles.branchesHeading}>Our Clinic Branches</Text>
            <Text style={styles.branchesSub}>
              Select any branch during booking to view specific doctor schedules.
            </Text>

            {CLINIC_BRANCHES.map((b, i) => (
              <View key={i} style={styles.branchCard}>
                <View style={styles.branchHeaderRow}>
                  <View style={styles.branchIconBox}>
                    <Ionicons name="location" size={22} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.branchName}>{b.name}</Text>
                    <Text style={styles.branchArea}>{b.area}</Text>
                  </View>
                </View>

                <View style={styles.branchDivider} />

                {/* Address */}
                <View style={styles.branchDetailRow}>
                  <Ionicons name="map-outline" size={16} color="#001166" style={styles.detailIcon} />
                  <Text style={styles.branchDetailText}>{b.address}</Text>
                </View>

                {/* Hours */}
                <View style={styles.branchDetailRow}>
                  <Ionicons name="time-outline" size={16} color="#001166" style={styles.detailIcon} />
                  <Text style={styles.branchDetailText}>{b.hours}</Text>
                </View>

                {/* Phone */}
                <View style={styles.branchDetailRow}>
                  <Ionicons name="call-outline" size={16} color="#001166" style={styles.detailIcon} />
                  <Text style={styles.branchDetailText}>{b.phone}</Text>
                </View>

                {/* Dentists Assigned */}
                <View style={styles.dentistListWrap}>
                  <Text style={styles.dentistListLabel}>Assigned Dentists:</Text>
                  <View style={styles.dentistTagsRow}>
                    {b.dentists.map((dentist, dIdx) => (
                      <View key={dIdx} style={styles.dentistTag}>
                        <Ionicons name="person" size={10} color="#001166" />
                        <Text style={styles.dentistTagText}>{dentist}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.bookBranchBtn}
                  onPress={() => navigation.navigate("Booking")}
                >
                  <Text style={styles.bookBranchBtnText}>Book at this Branch</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 16, paddingBottom: 40 },

  // TAB SWITCHER
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E8EBF5",
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: "#001166",
  },
  tabButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: "#001166",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },

  // PROMO STYLES
  promoCard: {
    backgroundColor: "#001166",
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    elevation: 4,
    shadowColor: "#001166",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  promoHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 6 },
  promoHeaderText: { color: "#F59E0B", fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1 },
  promoTitle: { color: "#FFFFFF", fontFamily: fonts.bold, fontSize: 20, marginBottom: 4 },
  promoTotal: { color: "#D1D5DB", fontFamily: fonts.medium, fontSize: 13, marginBottom: 16 },
  promoPriceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, gap: 12 },
  promoPriceBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  promoPriceLabel: { color: "#9CA3AF", fontFamily: fonts.medium, fontSize: 11, marginBottom: 4 },
  promoPriceValue: { color: "#FFFFFF", fontFamily: fonts.bold, fontSize: 18 },
  promoIncludes: { backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 14, padding: 16 },
  promoIncludesTitle: { color: "#111827", fontFamily: fonts.bold, fontSize: 13, marginBottom: 8 },
  bulletRow: { flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 8 },
  bulletText: { color: "#4B5563", fontFamily: fonts.medium, fontSize: 12 },

  // CATEGORY LISTING
  categorySection: { marginBottom: 20 },
  categoryHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  catIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryTitle: { fontFamily: fonts.bold, fontSize: 16, color: "#001166" },

  serviceItemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
    shadowColor: "#001166",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  serviceItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  serviceItemName: { fontFamily: fonts.bold, fontSize: 15, color: "#111827" },
  serviceItemDuration: { fontFamily: fonts.regular, fontSize: 12, color: "#6B7280", marginTop: 2 },
  serviceItemDesc: { fontFamily: fonts.regular, fontSize: 12, color: "#4B5563", lineHeight: 17 },
  priceBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C7D2FF",
  },
  priceText: { fontSize: 13, fontFamily: fonts.bold, color: "#001166" },

  // BRANCHES VIEW
  branchesList: { marginTop: 4 },
  branchesHeading: { fontFamily: fonts.bold, fontSize: 20, color: "#001166", marginBottom: 4 },
  branchesSub: { fontFamily: fonts.regular, fontSize: 13, color: "#6B7280", marginBottom: 16 },
  branchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 3,
    shadowColor: "#001166",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  branchHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  branchIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#001166",
    justifyContent: "center",
    alignItems: "center",
  },
  branchName: { fontFamily: fonts.bold, fontSize: 16, color: "#001166" },
  branchArea: { fontFamily: fonts.medium, fontSize: 12, color: "#6B7280", marginTop: 1 },
  branchDivider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 14 },
  branchDetailRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  detailIcon: { marginRight: 8, marginTop: 2 },
  branchDetailText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: "#374151", lineHeight: 18 },

  dentistListWrap: { marginTop: 8, marginBottom: 14 },
  dentistListLabel: { fontFamily: fonts.semiBold, fontSize: 12, color: "#4B5563", marginBottom: 6 },
  dentistTagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dentistTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F4FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  dentistTagText: { fontFamily: fonts.medium, fontSize: 11, color: "#001166" },
  bookBranchBtn: {
    backgroundColor: "#001166",
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  bookBranchBtnText: { color: "#FFFFFF", fontFamily: fonts.bold, fontSize: 13 },

  // FOOTER NOTE
  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    padding: 16,
    borderRadius: 16,
    marginTop: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  footerText: { flex: 1, fontSize: 12, fontFamily: fonts.medium, color: "#991B1B", lineHeight: 18 },
});