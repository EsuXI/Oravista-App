import { SERVICE_CATEGORIES, DENTISTS_BY_BRANCH } from '../data/clinicCatalog';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "../theme/fonts";
import ScreenHeader from "../components/ScreenHeader";

// Canonical services matching booking database & pricing
const SERVICES_DATA = Object.entries(SERVICE_CATEGORIES).map(([category, items], index) => ({
  category, icon: ['medical-outline', 'sparkles-outline', 'shield-checkmark-outline'][index],
  color: [colors.lavender, colors.peach, colors.aquaSoft][index],
  items: items.map(item => ({ ...item, duration: `${item.duration} mins` })),
}));

// Branch identifiers match Booking; links were supplied by the clinic owner.
const CLINIC_BRANCHES = [
  { bookingBranch: 'Gil Puyat, Pasay', name: 'Pasay Branch', area: 'Gil Puyat, Pasay City',
    links: ['https://www.facebook.com/kedentalclinic', 'https://www.facebook.com/profile.php?id=100093099934992'] },
  { bookingBranch: 'Sta. Ana', name: 'Sta. Ana Branch', area: 'Sta. Ana, Manila',
    links: ['https://www.facebook.com/profile.php?id=100063646346210'] },
  { bookingBranch: 'Angeles', name: 'Balibago Branch', area: 'Balibago, Angeles, Pampanga',
    links: ['https://www.facebook.com/profile.php?id=100092032605169'] },
];

export default function ServicesScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState(route?.params?.tab === 'branches' ? 'branches' : 'services');
  useEffect(() => { if (route?.params?.tab) setActiveTab(route.params.tab); }, [route?.params?.tab]);
  const openContact = async url => {
    try { await Linking.openURL(url); }
    catch { Alert.alert('Could not open Facebook', 'Please try again or search Facebook for the King Epres Dental Clinic branch.'); }
  };

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <ScreenHeader title="Services & Clinics" />

      {/* SEGMENTED TAB SWITCHER */}
      <View style={styles.tabContainer}>
        <TouchableOpacity accessibilityRole="button"
          style={[styles.tabButton, activeTab === "services" && styles.tabButtonActive]}
          onPress={() => setActiveTab("services")}
        >
          <Ionicons
            name="medical"
            size={16}
            color={activeTab === "services" ? colors.surface : colors.accent}
          />
          <Text
            style={[styles.tabButtonText, activeTab === "services" && styles.tabButtonTextActive]}
          >
            Services & Pricing
          </Text>
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button"
          style={[styles.tabButton, activeTab === "branches" && styles.tabButtonActive]}
          onPress={() => setActiveTab("branches")}
        >
          <Ionicons
            name="business"
            size={16}
            color={activeTab === "branches" ? colors.surface : colors.accent}
          />
          <Text
            style={[styles.tabButtonText, activeTab === "branches" && styles.tabButtonTextActive]}
          >
            Branch Locations
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === "services" ? (
          <>
            <View style={styles.promoCard}>
              <Text style={styles.promoHeaderText}>PLAN YOUR VISIT</Text>
              <Text style={styles.promoTitle}>Care that fits your needs</Text>
              <Text style={styles.promoTotal}>Explore services, then choose your branch and appointment time.</Text>
            </View>

            {/* SERVICES BY CATEGORY */}
            {SERVICES_DATA.map((cat, idx) => (
              <View key={idx} style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <View style={[styles.catIconContainer, { backgroundColor: cat.color }]}>
                    <Ionicons name={cat.icon} size={18} color={colors.accent} />
                  </View>
                  <Text style={styles.categoryTitle}>{cat.category}</Text>
                </View>

                {cat.items.map((item, itemIdx) => (
                  <View key={itemIdx} style={styles.serviceItemCard}>
                    <View style={styles.serviceItemHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceItemName}>{item.name}</Text>
                        <Text style={styles.serviceItemDuration}>
                          <Ionicons name="time-outline" size={12} color={colors.muted} /> {item.duration}
                        </Text>
                      </View>
                      <View style={styles.priceBadge}>
                        <Text style={styles.priceText}>{item.price}</Text>
                      </View>
                    </View>

                  </View>
                ))}
              </View>
            ))}

            <View style={styles.footerNote}>
              <Ionicons name="information-circle-outline" size={24} color="#DC2626" />
              <Text style={styles.footerText}>
                <Text style={{ fontFamily: fonts.bold, color: "#DC2626" }}>Important Note:</Text>{" "}
                These estimates match the booking form. Confirm current prices with your branch; final costs depend on your consultation and treatment needs.
              </Text>
            </View>
          </>
        ) : (
          /* BRANCHES DIRECTORY VIEW */
          <View style={styles.branchesList}>
            <Text style={styles.branchesHeading}>Our Clinic Branches</Text>
            <Text style={styles.branchesSub}>
              Choose a branch to book, or open its Facebook page to confirm the address, hours and contact number.
            </Text>

            {CLINIC_BRANCHES.map((b, i) => (
              <View key={i} style={styles.branchCard}>
                <View style={styles.branchHeaderRow}>
                  <View style={styles.branchIconBox}>
                    <Ionicons name="location" size={22} color={colors.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.branchName}>{b.name}</Text>
                    <Text style={styles.branchArea}>{b.area}</Text>
                  </View>
                </View>

                <View style={styles.branchDivider} />

                {b.links.map((url, index) => (
                  <TouchableOpacity key={url} accessibilityRole="link" style={styles.branchDetailRow} onPress={() => openContact(url)}>
                    <Ionicons name="logo-facebook" size={18} color={colors.accent} style={styles.detailIcon} />
                    <Text style={styles.branchDetailText}>{index === 0 ? 'Contact branch on Facebook' : 'Additional Pasay Facebook page'}</Text>
                  </TouchableOpacity>
                ))}

                {/* Dentists Assigned */}
                <View style={styles.dentistListWrap}>
                  <Text style={styles.dentistListLabel}>Booking dentist options:</Text>
                  <View style={styles.dentistTagsRow}>
                    {DENTISTS_BY_BRANCH[b.bookingBranch].filter(name => name !== "Auto-assigned").map((dentist, dIdx) => (
                      <View key={dIdx} style={styles.dentistTag}>
                        <Ionicons name="person" size={10} color={colors.accent} />
                        <Text style={styles.dentistTagText}>{dentist}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <TouchableOpacity accessibilityRole="button"
                  style={styles.bookBranchBtn}
                  onPress={() => navigation.navigate("Booking", { initialBranch: b.bookingBranch })}
                >
                  <Text style={styles.bookBranchBtnText}>Book at this Branch</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.ink} />
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
  container: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 16, paddingBottom: 40 },

  // TAB SWITCHER
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.lavender,
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
    borderRadius: 999,
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.accent,
  },
  tabButtonTextActive: {
    color: colors.ink,
  },

  // PROMO STYLES
  promoCard: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  promoHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 6 },
  promoHeaderText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1 },
  promoTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 20, marginBottom: 4 },
  promoTotal: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, marginBottom: 16 },
  promoPriceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, gap: 12 },
  promoPriceBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  promoPriceLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, marginBottom: 4 },
  promoPriceValue: { color: colors.ink, fontFamily: fonts.bold, fontSize: 18 },
  promoIncludes: { backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 14, padding: 16 },
  promoIncludesTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13, marginBottom: 8 },
  bulletRow: { flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 8 },
  bulletText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },

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
  categoryTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.accent },

  serviceItemCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: colors.ink,
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
  serviceItemName: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  serviceItemDuration: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  serviceItemDesc: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, lineHeight: 17 },
  priceBadge: {
    backgroundColor: colors.lavender,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceText: { fontSize: 13, fontFamily: fonts.bold, color: colors.accent },

  // BRANCHES VIEW
  branchesList: { marginTop: 4 },
  branchesHeading: { fontFamily: fonts.bold, fontSize: 20, color: colors.accent, marginBottom: 4 },
  branchesSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginBottom: 16 },
  branchCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 3,
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  branchHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  branchIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  branchName: { fontFamily: fonts.bold, fontSize: 16, color: colors.accent },
  branchArea: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 1 },
  branchDivider: { height: 1, backgroundColor: colors.aquaSoft, marginVertical: 14 },
  branchDetailRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  detailIcon: { marginRight: 8, marginTop: 2 },
  branchDetailText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.ink, lineHeight: 18 },

  dentistListWrap: { marginTop: 8, marginBottom: 14 },
  dentistListLabel: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.muted, marginBottom: 6 },
  dentistTagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dentistTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.aquaSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  dentistTagText: { fontFamily: fonts.medium, fontSize: 11, color: colors.accent },
  bookBranchBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 999,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  bookBranchBtnText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },

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