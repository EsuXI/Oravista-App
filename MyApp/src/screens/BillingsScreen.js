import { loadBillings, fileUrl, money, billingBreakdown } from '../utils/patientData';
import LoadError from '../components/LoadError';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import React, { useState, useCallback, useEffect } from "react";
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

const STATUS_FILTERS = ["All", "Pending", "Approved", "Paid"];

export default function BillingsScreen({ navigation }) {
  const [visibleCount, setVisibleCount] = useState(20);
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

  useEffect(() => { setVisibleCount(20); }, [searchQuery, activeStatus]);

  const handleDownload = (path) => {
    const url = fileUrl(path, API_BASE_URL);
    if (!url) {
      setAlertConfig({
        visible: true,
        type: "info",
        title: "Invoice Not Available",
        message: "The invoice link is unavailable. Reopen Billings to retry. If this bill is approved or paid and the problem continues, contact the clinic.",
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
    const totals = billingBreakdown(bill);
    setAlertConfig({
      visible: true,
      type: "info",
      title: "Billing Summary",
      message: "",
      details: [
        { label: "Record ID", value: String(bill.id ?? "Not provided") },
        { label: "Procedure", value: bill.title || "Dental Treatment" },
        { label: "Charge", value: money(totals.charge) },
        { label: "Paid", value: money(totals.paid) },
        { label: "Remaining", value: money(totals.balance), highlight: true },
        { label: "Payment", value: totals.paymentStatus },
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
            filteredBillings.slice(0, visibleCount).map((bill) => {
              const totals = billingBreakdown(bill);
              return (
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
                  <View style={styles.breakdown}>
                    <Text style={styles.paymentLine}>Charge: {money(totals.charge)}</Text>
                    <Text style={styles.paymentLine}>Paid: {money(totals.paid)}</Text>
                    <Text style={styles.remaining}>Remaining: {money(totals.balance)}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={[styles.statusText, (bill.status || "").toLowerCase() === "paid" ? styles.paidText : (bill.status || "").toLowerCase() === "approved" ? styles.approvedText : styles.pendingText]}>
                      {bill.status || "Not provided"}
                    </Text>
                    <Text style={styles.paymentState}>{totals.paymentStatus}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );})
          )}
          {visibleCount < filteredBillings.length && <TouchableOpacity accessibilityRole="button" onPress={() => setVisibleCount(count => count + 20)} style={{minHeight:44,padding:12,alignItems:"center",backgroundColor:colors.aquaSoft,borderRadius:14}}><Text style={{color:colors.accent,fontFamily:fonts.semiBold}}>Show 20 more bills</Text></TouchableOpacity>}
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
  balanceCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, marginHorizontal: 20, marginTop: 16, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.border, elevation: 1 },
  balanceInfo: { flex: 1 },
  balanceLabel: { fontSize: 11, color: colors.muted, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 1 },
  balanceAmount: { fontSize: 28, color: colors.ink, fontFamily: fonts.bold, marginTop: 4 },
  balanceIconContainer: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.lavender, justifyContent: "center", alignItems: "center" },
  controlsWrapper: { paddingVertical: 12 },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, marginHorizontal: 20, paddingHorizontal: 16, height: 50, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, marginLeft: 10, fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  filterScroll: { paddingHorizontal: 16, gap: 10, marginTop: 14 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  activeFilterChip: { backgroundColor: colors.primary, borderColor: colors.accent },
  filterText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  activeFilterText: { color: colors.ink },
  list: { padding: 16, paddingTop: 0, paddingBottom: 40 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border, elevation: 1 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  idBox: { backgroundColor: colors.aquaSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  invoice: { fontSize: 10, color: colors.muted, fontFamily: fonts.bold },
  downloadBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.lavender, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontFamily: fonts.bold, color: colors.ink },
  date: { fontSize: 12, color: colors.muted, fontFamily: fonts.medium, marginTop: 4 },
  breakdown: { flexShrink: 1, gap: 3 },
  paymentLine: { fontSize: 12, color: colors.muted, fontFamily: fonts.medium },
  remaining: { fontSize: 14, color: colors.ink, fontFamily: fonts.bold },
  paymentState: { fontSize: 11, color: colors.muted, textAlign: "right", flexShrink: 1 },
  cardBottom: { flexWrap: "wrap", gap: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  amount: { fontSize: 18, fontFamily: fonts.bold, color: colors.ink },
  statusBadge: { paddingVertical: 6, maxWidth: "100%", gap: 4, alignItems: "flex-end", flexShrink: 1 },
  paidBg: { backgroundColor: "#D1FAE5" },
  pendingBg: { backgroundColor: "#FEF3C7" },
  statusText: { fontSize: 10, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.5 },
  paidText: { color: "#065F46" },
  approvedText: { color: "#176B87" },
  pendingText: { color: "#92400E" },
});
