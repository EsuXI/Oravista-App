import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  FlatList,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config/config";
import ScreenHeader from "../components/ScreenHeader";
import CustomAlertModal from "../components/CustomAlertModal";

const FILTERS = ["All", "Confirmed", "Pending", "Rescheduled", "Completed", "Cancelled"];
const ITEMS_PER_PAGE = 5;

export default function AppointmentsScreen({ navigation }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [page, setPage] = useState(1);

  // Cancellation and Status Alert States
  const [selectedCancelId, setSelectedCancelId] = useState(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: "success",
    title: "",
    message: "",
    onPrimaryPress: () => {},
  });

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem("userEmail");
      let userId = null;

      const storedUser = await AsyncStorage.getItem("userData");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.id) userId = parsed.id;
      }

      if (!userId && email) {
        const userRes = await fetch(`${API_BASE_URL}/api/user-profile?email=${encodeURIComponent(email)}`);
        const userData = await userRes.json();
        if (userRes.ok && userData.id) userId = userData.id;
      }

      if (userId) {
        const aptRes = await fetch(`${API_BASE_URL}/api/user-appointments/${userId}`);
        const aptData = await aptRes.json();
        setAppointments(Array.isArray(aptData) ? aptData : aptData.appointments || []);
      }
    } catch (error) {
      console.error("Failed to fetch appointments", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [])
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeFilter]);

  const filteredData = appointments.filter((item) => {
    const rawStatus = (item.status || "").trim().toLowerCase();
    const filterLower = activeFilter.toLowerCase();
    const matchesFilter = activeFilter === "All" || rawStatus === filterLower;

    const formattedDate = new Date(item.appointment_date).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    const searchLower = searchQuery.toLowerCase();
    const branchName = (item.branch || item.branch_address || "2015 Gil Puyat, Pasay City").toLowerCase();

    const matchesSearch =
      item.dentist_name?.toLowerCase().includes(searchLower) ||
      item.service_type?.toLowerCase().includes(searchLower) ||
      item.booking_ref?.toLowerCase().includes(searchLower) ||
      item.appointment_time?.toLowerCase().includes(searchLower) ||
      item.appointment_date?.toLowerCase().includes(searchLower) ||
      branchName.includes(searchLower) ||
      formattedDate.toLowerCase().includes(searchLower);

    return matchesFilter && matchesSearch;
  });

  const displayedData = filteredData.slice(0, page * ITEMS_PER_PAGE);

  const loadMoreData = () => {
    if (displayedData.length < filteredData.length) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  const handleConfirmCancel = async () => {
    if (!selectedCancelId) return;
    setCancelModalVisible(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/update-appointment-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_id: selectedCancelId, status: "Cancelled" }),
      });

      if (response.ok) {
        fetchAppointments();
        setAlertConfig({
          visible: true,
          type: "success",
          title: "Appointment Cancelled",
          message: "The appointment has been marked as cancelled.",
          onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
        });
      } else {
        setAlertConfig({
          visible: true,
          type: "error",
          title: "Cancellation Failed",
          message: "Unable to cancel appointment right now. Please try again.",
          onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
        });
      }
    } catch (e) {
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Connection Error",
        message: "Network request failed. Please check your internet connection.",
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setSelectedCancelId(null);
    }
  };

  const getStatusBadgeStyle = (status = "") => {
    switch (status.trim().toLowerCase()) {
      case "confirmed":
        return { bg: styles.confirmedBg, text: styles.confirmedText };
      case "pending":
        return { bg: styles.pendingBg, text: styles.pendingText };
      case "cancelled":
        return { bg: styles.cancelledBg, text: styles.cancelledText };
      case "rescheduled":
        return { bg: styles.rescheduledBg, text: styles.rescheduledText };
      case "completed":
        return { bg: styles.completedBg, text: styles.completedText };
      default:
        return { bg: styles.defaultBadgeBg, text: styles.defaultBadgeText };
    }
  };

  const renderItem = ({ item }) => {
    const formattedDate = new Date(item.appointment_date).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });

    const displayAddress = item.branch || item.branch_address || "Gil Puyat, Pasay";
    const statusNormalized = item.status ? item.status.trim() : "Pending";
    const statusLower = statusNormalized.toLowerCase();
    const badgeStyle = getStatusBadgeStyle(statusNormalized);

    const basePriceDisplay =
      item.base_price || item.basePrice || item.price || item.service_price;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.idText}>{item.booking_ref || "REFERENCE PENDING"}</Text>
            <Text style={styles.service} numberOfLines={1}>{item.service_type}</Text>
          </View>
          <View style={[styles.statusBadge, badgeStyle.bg]}>
            <Text style={[styles.statusText, badgeStyle.text]}>
              {statusNormalized}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={14} color="#6B7280" />
          <Text style={styles.infoText}>{item.dentist_name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color="#6B7280" />
          <Text style={styles.infoText} numberOfLines={1}>{displayAddress}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color="#6B7280" />
          <Text style={styles.infoText}>{formattedDate} • {item.appointment_time}</Text>
        </View>

        {basePriceDisplay ? (
          <View style={styles.infoRow}>
            <Ionicons name="pricetag-outline" size={14} color="#001166" />
            <Text style={[styles.infoText, styles.priceText]}>
              Base Price: ₱{Number(basePriceDisplay).toLocaleString()}
            </Text>
          </View>
        ) : null}

        {(statusLower === "pending" || statusLower === "rescheduled") && (
          <TouchableOpacity
            onPress={() => {
              setSelectedCancelId(item.id);
              setCancelModalVisible(true);
            }}
            style={styles.cancelBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancel Appointment</Text>
          </TouchableOpacity>
        )}

        {statusLower === "cancelled" && (
          <TouchableOpacity
            onPress={() => navigation.navigate("Booking", { rescheduleId: item.id })}
            style={styles.rescheduleBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.rescheduleText}>Reschedule Appointment</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (displayedData.length >= filteredData.length) return null;
    return (
      <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMoreData} activeOpacity={0.7}>
        <Text style={styles.loadMoreText}>Load More</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Appointments" />

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          placeholder="Search date, time, dentist..."
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={{ maxHeight: 44, marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[styles.chip, activeFilter === f && styles.activeChip]}
            >
              <Text style={[styles.chipText, activeFilter === f && styles.activeChipText]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && page === 1 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#001166" />
        </View>
      ) : (
        <FlatList
          data={displayedData}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          ListEmptyComponent={<Text style={styles.empty}>No appointments found.</Text>}
          ListFooterComponent={renderFooter}
        />
      )}

      <TouchableOpacity
        style={styles.bookBtn}
        onPress={() => navigation.navigate("Booking")}
        activeOpacity={0.85}
      >
        <Text style={styles.bookText}>Book an Appointment</Text>
      </TouchableOpacity>

      {/* Cancellation Confirmation Dialog */}
      <CustomAlertModal
        visible={cancelModalVisible}
        type="warning"
        title="Cancel Appointment"
        message="Are you sure you want to cancel this booking?"
        primaryText="Yes, Cancel"
        secondaryText="No"
        onPrimaryPress={handleConfirmCancel}
        onSecondaryPress={() => {
          setCancelModalVisible(false);
          setSelectedCancelId(null);
        }}
      />

      {/* General Alert Dialog */}
      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onPrimaryPress={alertConfig.onPrimaryPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    margin: 16,
    paddingHorizontal: 14,
    borderRadius: 20,
    height: 48,
  },
  searchInput: { flex: 1, marginLeft: 8, fontFamily: fonts.regular, fontSize: 14, color: "#111827" },
  filterList: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
  },
  activeChip: { backgroundColor: "#001166", borderColor: "#001166" },
  chipText: { fontFamily: fonts.medium, fontSize: 12, color: "#6B7280" },
  activeChipText: { color: "#FFFFFF" },
  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  idText: { fontSize: 10, color: "#9CA3AF", fontFamily: fonts.bold, marginBottom: 2 },
  service: { fontSize: 17, fontFamily: fonts.semiBold, color: "#111827" },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    minWidth: 85,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: { fontSize: 11, fontFamily: fonts.bold, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.5 },
  confirmedBg: { backgroundColor: "#D1FAE5" },
  confirmedText: { color: "#065F46" },
  pendingBg: { backgroundColor: "#FEF3C7" },
  pendingText: { color: "#92400E" },
  cancelledBg: { backgroundColor: "#FEE2E2" },
  cancelledText: { color: "#991B1B" },
  rescheduledBg: { backgroundColor: "#EDE9FE" },
  rescheduledText: { color: "#5B21B6" },
  completedBg: { backgroundColor: "#DBEAFE" },
  completedText: { color: "#1E40AF" },
  defaultBadgeBg: { backgroundColor: "#F3F4F6" },
  defaultBadgeText: { color: "#4B5563" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  infoText: { fontSize: 13, color: "#4B5563", fontFamily: fonts.medium, flexShrink: 1 },
  priceText: { color: "#001166", fontFamily: fonts.bold },
  cancelBtn: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  cancelText: { color: "#DC2626", fontFamily: fonts.bold, fontSize: 13 },
  rescheduleBtn: {
    marginTop: 14,
    backgroundColor: "#F5F8FF",
    padding: 12,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#001166",
  },
  rescheduleText: { color: "#001166", fontFamily: fonts.bold, fontSize: 13 },
  bookBtn: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#001166",
    padding: 18,
    borderRadius: 999,
    alignItems: "center",
    elevation: 4,
  },
  bookText: { color: "#FFFFFF", fontFamily: fonts.bold, fontSize: 16 },
  empty: { textAlign: "center", marginTop: 40, color: "#9CA3AF", fontFamily: fonts.medium },
  loadMoreBtn: {
    paddingVertical: 14,
    backgroundColor: "#F3F4F6",
    borderRadius: 18,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  loadMoreText: {
    color: "#001166",
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
});