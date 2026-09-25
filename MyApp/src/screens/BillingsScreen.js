import { loadBillings, fileUrl, money } from '../utils/patientData';
import LoadError from '../components/LoadError';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Linking
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import ScreenHeader from "../components/ScreenHeader";
import CustomAlertModal from "../components/CustomAlertModal";
import { API_BASE_URL } from "../config/config";

const STATUS_FILTERS = ["All", "Pending", "Paid"];

export default function BillingsScreen({ navigation }) {
  const [billings, setBillings] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [outstanding, setOutstanding] = useState(null);
  const [loadError, setLoadError] = useState('');

  // Custom Alert Modal State
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
    details: [],
    onPrimaryPress: () => {},
  });

  const fetchBillings = async () => {
    setLoading(true);
    setLoadError('');
    setOutstanding(null);
    try {
      const stored = await AsyncStorage.getItem('userData');
      const user = stored ? JSON.parse(stored) : null;
      const id = user?.id || user?.user_id;
      if (!id) throw new Error('Could not identify your account. Please log in again.');
      const data = await loadBillings(API_BASE_URL, id);
      setBillings(data.records);
      setOutstanding(data.totalOutstanding);
    } catch (error) {
      setLoadError(error.message || 'Unable to load billing records. Please try again.');
    } finally { setLoading(false); }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBillings();
    }, [])
  );

  const filteredBillings = billings.filter((bill) => {
    const matchesStatus = activeStatus === "All" || (bill.status || "").toLowerCase() === activeStatus.toLowerCase();
    const searchLower = searchQuery.toLowerCase();

    const matchesSearch =
      (bill.id || "").toString().toLowerCase().includes(searchLower) ||
      (bill.title || "").toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  const handleDownload = (path) => {
    const url = fileUrl(path, API_BASE_URL);
    if (!url) {
      setAlertConfig({
        visible: true,
        type: "info",
        title: "Invoice Not Available",
        message: "An official PDF receipt has not been uploaded for this item yet.",
        details: [],
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    Linking.openURL(url).catch(() => {
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Open Failed",
        message: "Could not open document. Please check your connection.",
        details: [],
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    });
  };

  const showBillDetails = (bill) => {
    setAlertConfig({
      visible: true,
      type: "info",
      title: "Billing Summary",
      message: "",
      details: [
        { label: "Record ID", value: String(bill.id ?? "Not provided") },
        { label: "Procedure", value: bill.title || "Dental Treatment" },
        { label: "Amount", value: money(bill.amount), highlight: true },
        { label: "Status", value: bill.status || "Not provided" },
        { label: "Date", value: bill.date || "N/A" },
      ],
      onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
    });
  };

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <ScreenHeader
        title="Billings"
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      <View style={styles.balanceCard}>
        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>Outstanding Balance</Text>
          <Text style={styles.balanceAmount}>
            {loading ? "Loading…" : money(outstanding)}
          </Text>
        </View>
        <View style={styles.balanceIconContainer}>
          <Ionicons name="wallet" size={24} color={colors.accent} />
        </View>
      </View>

      <View style={styles.controlsWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput accessibilityLabel="Search record or treatment..."
            style={styles.searchInput}
            placeholder="Search record or treatment..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.muted}
          />
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {STATUS_FILTERS.map((status) => (
            <TouchableOpacity accessibilityRole="button"
              key={status}
              style={[styles.filterChip, activeStatus === status && styles.activeFilterChip]}
              onPress={() => setActiveStatus(status)}
            >
              <Text style={[styles.filterText, activeStatus === status && styles.activeFilterText]}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : loadError ? (<LoadError message={loadError} onRetry={fetchBillings} />) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {filteredBillings.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="receipt-outline" size={60} color={colors.muted} />
              <Text style={styles.emptyText}>No billing records found.</Text>
            </View>
          ) : (
            filteredBillings.map((bill) => (
              <TouchableOpacity accessibilityRole="button"
                key={bill.id}
                style={styles.card}
                onPress={() => showBillDetails(bill)}
                activeOpacity={0.7}
              >
                <View style={styles.cardTop}>
                  <View style={styles.idBox}>
                    <Text style={styles.invoice}>Record #{bill.id ?? "—"}</Text>
                  </View>
                  <TouchableOpacity accessibilityLabel="Download document" hitSlop={8} accessibilityRole="button" style={styles.downloadBtn} onPress={(event) => { event.stopPropagation(); handleDownload(bill.invoice_path); }}>
                    <Ionicons name="download-outline" size={16} color={colors.accent} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.title}>{bill.title || "Pending Service"}</Text>
                <Text style={styles.date}>{bill.date}</Text>

                <View style={styles.cardBottom}>
                  <Text style={styles.amount}>
                    {money(bill.amount)}
                  </Text>
                  <View style={[styles.statusBadge, (bill.status || "").toLowerCase() === "paid" ? styles.paidBg : styles.pendingBg]}>
                    <Text style={[styles.statusText, (bill.status || "").toLowerCase() === "paid" ? styles.paidText : styles.pendingText]}>
                      {bill.status || "Not provided"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Reusable Custom Alert Modal */}
      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        details={alertConfig.details}
        onPrimaryPress={alertConfig.onPrimaryPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 60 },
  emptyText: { fontSize: 14, color: colors.muted, fontFamily: fonts.medium, marginTop: 12 },
  balanceCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, marginHorizontal: 20, marginTop: 20, padding: 24, borderRadius: 28, borderWidth: 1, borderColor: colors.border, elevation: 3 },
  balanceInfo: { flex: 1 },
  balanceLabel: { fontSize: 11, color: colors.muted, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 1 },
  balanceAmount: { fontSize: 28, color: colors.ink, fontFamily: fonts.bold, marginTop: 4 },
  balanceIconContainer: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.lavender, justifyContent: "center", alignItems: "center" },
  controlsWrapper: { paddingVertical: 12 },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, marginHorizontal: 20, paddingHorizontal: 16, height: 50, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, marginLeft: 10, fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  filterScroll: { paddingHorizontal: 20, gap: 10, marginTop: 14 },
  filterChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  activeFilterChip: { backgroundColor: colors.primary, borderColor: colors.accent },
  filterText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  activeFilterText: { color: colors.ink },
  list: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  card: { backgroundColor: colors.surface, borderRadius: 28, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border, elevation: 2 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  idBox: { backgroundColor: colors.aquaSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  invoice: { fontSize: 10, color: colors.muted, fontFamily: fonts.bold },
  downloadBtn: { width: 44, height: 44, borderRadius: 999, backgroundColor: colors.lavender, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink },
  date: { fontSize: 12, color: colors.muted, fontFamily: fonts.medium, marginTop: 4 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18 },
  amount: { fontSize: 18, fontFamily: fonts.bold, color: colors.ink },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, minWidth: 80, alignItems: "center" },
  paidBg: { backgroundColor: "#D1FAE5" },
  pendingBg: { backgroundColor: "#FEF3C7" },
  statusText: { fontSize: 10, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.5 },
  paidText: { color: "#065F46" },
  pendingText: { color: "#92400E" },
});
