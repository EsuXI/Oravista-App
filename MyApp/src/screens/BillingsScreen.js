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
  const [outstanding, setOutstanding] = useState(0);

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
    try {
      let userId = null;
      const storedUser = await AsyncStorage.getItem("userData");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.id) userId = parsed.id;
      }

      if (!userId) {
        const email = await AsyncStorage.getItem("userEmail");
        if (email) {
          const userRes = await fetch(`${API_BASE_URL}/api/user-profile?email=${encodeURIComponent(email)}`);
          const userData = await userRes.json();
          if (userRes.ok && userData.id) userId = userData.id;
        }
      }

      if (userId) {
        const response = await fetch(`${API_BASE_URL}/api/user-billings/${userId}`);
        const data = await response.json();

        if (response.ok) {
          setBillings(data.records || []);
          setOutstanding(data.totalOutstanding || 0);
        }
      }
    } catch (error) {
      console.error("Failed to fetch billings", error);
      setBillings([]);
      setOutstanding(0);
    } finally {
      setLoading(false);
    }
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
    if (!path) {
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
    
    const fileUrl = path.startsWith("http") ? path : `${API_BASE_URL}/${path}`;
    Linking.openURL(fileUrl).catch(() => {
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
      title: "Invoice Summary",
      message: "",
      details: [
        { label: "Invoice No.", value: `INV-${(bill.id || 0).toString().padStart(3, "0")}` },
        { label: "Procedure", value: bill.title || "Dental Treatment" },
        { label: "Amount", value: `₱${parseFloat(bill.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, highlight: true },
        { label: "Status", value: bill.status || "Pending" },
        { label: "Date", value: bill.date || "N/A" },
      ],
      onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
    });
  };
  
  return (
    <View style={styles.container}>
      <ScreenHeader 
        title="Billings" 
        showBack={true} 
        onBackPress={() => navigation.goBack()} 
      />

      <View style={styles.balanceCard}>
        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>Outstanding Balance</Text>
          <Text style={styles.balanceAmount}>
            ₱{parseFloat(outstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.balanceIconContainer}>
          <Ionicons name="wallet" size={24} color="#001166" />
        </View>
      </View>

      <View style={styles.controlsWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search invoice or treatment..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {STATUS_FILTERS.map((status) => (
            <TouchableOpacity
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
          <ActivityIndicator size="large" color="#001166" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {filteredBillings.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="receipt-outline" size={60} color="#E5E7EB" />
              <Text style={styles.emptyText}>No billing records found.</Text>
            </View>
          ) : (
            filteredBillings.map((bill) => (
              <TouchableOpacity
                key={bill.id}
                style={styles.card}
                onPress={() => showBillDetails(bill)}
                activeOpacity={0.7}
              >
                <View style={styles.cardTop}>
                  <View style={styles.idBox}>
                    <Text style={styles.invoice}>INV-{(bill.id || 0).toString().padStart(3, "0")}</Text>
                  </View>
                  <TouchableOpacity style={styles.downloadBtn} onPress={() => handleDownload(bill.invoice_path)}>
                    <Ionicons name="download-outline" size={16} color="#001166" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.title}>{bill.title || "Pending Service"}</Text>
                <Text style={styles.date}>{bill.date}</Text>

                <View style={styles.cardBottom}>
                  <Text style={styles.amount}>
                    ₱{parseFloat(bill.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                  <View style={[styles.statusBadge, (bill.status || "").toLowerCase() === "paid" ? styles.paidBg : styles.pendingBg]}>
                    <Text style={[styles.statusText, (bill.status || "").toLowerCase() === "paid" ? styles.paidText : styles.pendingText]}>
                      {bill.status || "Pending"}
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
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 60 },
  emptyText: { fontSize: 14, color: "#9CA3AF", fontFamily: fonts.medium, marginTop: 12 },
  balanceCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFFFFF", marginHorizontal: 20, marginTop: 20, padding: 24, borderRadius: 28, borderWidth: 1, borderColor: "#E5E7EB", elevation: 3 },
  balanceInfo: { flex: 1 },
  balanceLabel: { fontSize: 11, color: "#6B7280", fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 1 },
  balanceAmount: { fontSize: 28, color: "#111827", fontFamily: fonts.bold, marginTop: 4 },
  balanceIconContainer: { width: 56, height: 56, borderRadius: 18, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center" },
  controlsWrapper: { paddingVertical: 12 },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", marginHorizontal: 20, paddingHorizontal: 16, height: 50, borderRadius: 20, borderWidth: 1, borderColor: "#E5E7EB" },
  searchInput: { flex: 1, marginLeft: 10, fontFamily: fonts.regular, fontSize: 14, color: "#111827" },
  filterScroll: { paddingHorizontal: 20, gap: 10, marginTop: 14 },
  filterChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  activeFilterChip: { backgroundColor: "#001166", borderColor: "#001166" },
  filterText: { fontFamily: fonts.medium, fontSize: 13, color: "#6B7280" },
  activeFilterText: { color: "#FFFFFF" },
  list: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB", elevation: 2 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  idBox: { backgroundColor: "#F3F4F6", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  invoice: { fontSize: 10, color: "#6B7280", fontFamily: fonts.bold },
  downloadBtn: { width: 36, height: 36, borderRadius: 14, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontFamily: fonts.bold, color: "#111827" },
  date: { fontSize: 12, color: "#9CA3AF", fontFamily: fonts.medium, marginTop: 4 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18 },
  amount: { fontSize: 18, fontFamily: fonts.bold, color: "#111827" },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, minWidth: 80, alignItems: "center" },
  paidBg: { backgroundColor: "#D1FAE5" },
  pendingBg: { backgroundColor: "#FEF3C7" },
  statusText: { fontSize: 10, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.5 },
  paidText: { color: "#065F46" },
  pendingText: { color: "#92400E" },
});