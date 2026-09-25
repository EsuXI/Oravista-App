import { requestJson, requireArray, fileUrl, displayDate } from '../utils/patientData';
import LoadError from '../components/LoadError';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
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
  const [loadError, setLoadError] = useState('');
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
    setLoadError('');
    try {
      const stored = await AsyncStorage.getItem('userData');
      const user = stored ? JSON.parse(stored) : null;
      let id = user?.id || user?.user_id;
      if (!id) {
        const email = await AsyncStorage.getItem('userEmail');
        if (email) id = (await requestJson(`${API_BASE_URL}/api/user-profile?email=${encodeURIComponent(email)}`)).id;
      }
      if (!id) throw new Error('Could not identify your account. Please log in again.');
      const data = await requestJson(`${API_BASE_URL}/api/user-appointments/${encodeURIComponent(id)}`);
      setAppointments(requireArray(data, 'appointments'));
    } catch (error) {
      setLoadError(error.message || 'Unable to load your records. Please try again.');
    } finally { setLoading(false); }
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
    const matchesFilter = activeFilter === "All" || rawStatus === filterLower || (filterLower === 'confirmed' && rawStatus === 'approved');

    const formattedDate = new Date(item.appointment_date).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    const searchLower = searchQuery.toLowerCase();
    const branchName = (item.branch || item.branch_address || "").toLowerCase();

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
      case "approved":
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

    const displayAddress = item.branch || item.branch_address || "Branch not provided";
    const statusNormalized = item.status?.trim().toLowerCase() === 'approved' ? 'Confirmed' : (item.status ? item.status.trim() : "Not provided");
    const statusLower = statusNormalized.toLowerCase();
    const badgeStyle = getStatusBadgeStyle(statusNormalized);

    const basePriceDisplay =
      item.base_price ?? item.basePrice ?? item.amount ?? item.price ?? item.service_price;

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
          <Ionicons name="person-outline" size={14} color={colors.muted} />
          <Text style={styles.infoText}>{item.dentist_name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color={colors.muted} />
          <Text style={styles.infoText} numberOfLines={1}>{displayAddress}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.muted} />
          <Text style={styles.infoText}>{formattedDate} • {item.appointment_time}</Text>
        </View>

        {basePriceDisplay ? (
          <View style={styles.infoRow}>
            <Ionicons name="pricetag-outline" size={14} color={colors.accent} />
            <Text style={[styles.infoText, styles.priceText]}>
              Base Price: ₱{Number(basePriceDisplay).toLocaleString()}
            </Text>
          </View>
        ) : null}

        {statusLower === "pending" && (
          <TouchableOpacity accessibilityRole="button"
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
          <TouchableOpacity accessibilityRole="button"
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
      <TouchableOpacity accessibilityRole="button" style={styles.loadMoreBtn} onPress={loadMoreData} activeOpacity={0.7}>
        <Text style={styles.loadMoreText}>Load More</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <ScreenHeader title="My Appointments" />

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput accessibilityLabel="Search date, time, dentist..."
          placeholder="Search date, time, dentist..."
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={{ maxHeight: 44, marginBottom: 12 }}>
        <ScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
          {FILTERS.map((f) => (
            <TouchableOpacity accessibilityRole="button"
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
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : loadError ? (<LoadError message={loadError} onRetry={fetchAppointments} />) : (
        <FlatList
          data={displayedData}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          ListEmptyComponent={<Text style={styles.empty}>No appointments found.</Text>}
          ListFooterComponent={renderFooter}
        />
      )}

      <TouchableOpacity accessibilityRole="button"
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
  container: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.aquaSoft,
    margin: 16,
    paddingHorizontal: 14,
    borderRadius: 20,
    height: 48,
  },
  searchInput: { flex: 1, marginLeft: 8, fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  filterList: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
  },
  activeChip: { backgroundColor: colors.primary, borderColor: colors.accent },
  chipText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  activeChipText: { color: colors.ink },
  card: {
    backgroundColor: colors.input,
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  idText: { fontSize: 10, color: colors.muted, fontFamily: fonts.bold, marginBottom: 2 },
  service: { fontSize: 17, fontFamily: fonts.semiBold, color: colors.ink },
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
  completedBg: { backgroundColor: colors.completedSoft },
  completedText: { color: colors.completed },
  defaultBadgeBg: { backgroundColor: colors.aquaSoft },
  defaultBadgeText: { color: colors.muted },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  infoText: { fontSize: 13, color: colors.muted, fontFamily: fonts.medium, flexShrink: 1 },
  priceText: { color: colors.accent, fontFamily: fonts.bold },
  cancelBtn: {
    marginTop: 14,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  cancelText: { color: "#DC2626", fontFamily: fonts.bold, fontSize: 13 },
  rescheduleBtn: {
    marginTop: 14,
    backgroundColor: "#F5F8FF",
    padding: 12,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accent,
  },
  rescheduleText: { color: colors.accent, fontFamily: fonts.bold, fontSize: 13 },
  bookBtn: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 999,
    alignItems: "center",
    elevation: 3,
  },
  bookText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 16 },
  empty: { textAlign: "center", marginTop: 40, color: colors.muted, fontFamily: fonts.medium },
  loadMoreBtn: {
    paddingVertical: 14,
    backgroundColor: colors.aquaSoft,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadMoreText: {
    color: colors.accent,
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
});
