import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
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
import { API_BASE_URL } from '../config/config';
import ScreenHeader from "../components/ScreenHeader";

const FILTERS = ["All", "Confirmed", "Pending", "Completed", "Cancelled"];
const ITEMS_PER_PAGE = 5;

export default function AppointmentsScreen({ navigation }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [page, setPage] = useState(1);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem("userEmail");
      const userRes = await fetch(`${API_BASE_URL}/api/user-profile?email=${email}`);
      const userData = await userRes.json();

      if (userRes.ok && userData.id) {
        const aptRes = await fetch(`${API_BASE_URL}/api/user-appointments/${userData.id}`);
        const aptData = await aptRes.json();
        setAppointments(aptData);
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
    const matchesFilter = activeFilter === "All" || item.status === activeFilter;
    
    const formattedDate = new Date(item.appointment_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const searchLower = searchQuery.toLowerCase();

    // Check branch address in search as well
    const branchName = item.branch_address ? item.branch_address.toLowerCase() : "2015 gil puyat, pasay city";

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
      setPage(prevPage => prevPage + 1);
    }
  };

  const cancelAppointment = (id) => {
    Alert.alert("Cancel Appointment", "Are you sure you want to cancel this booking?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        onPress: async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/api/update-appointment-status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ appointment_id: id, status: 'Cancelled' })
            });

            if (response.ok) {
              fetchAppointments(); 
            } else {
              Alert.alert("Error", "Could not cancel appointment.");
            }
          } catch (e) {
            Alert.alert("Error", "Server connection failed.");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const formattedDate = new Date(item.appointment_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    
    // FIX: Show the real King Epres branch. Defaults to Main Branch if none is saved in DB.
    const displayAddress = item.branch_address || "2015 Gil puyat, Pasay City";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.idText}>{item.booking_ref}</Text>
            <Text style={styles.service} numberOfLines={1}>{item.service_type}</Text>
          </View>
          <View style={[styles.statusBadge, styles[item.status.toLowerCase() + "Bg"]]}>
            <Text style={[styles.statusText, styles[item.status.toLowerCase() + "Text"]]}>
              {item.status}
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

        {item.status === "Pending" && (
          <TouchableOpacity onPress={() => cancelAppointment(item.id)} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel Appointment</Text>
          </TouchableOpacity>
        )}

        {item.status === "Cancelled" && (
          <TouchableOpacity onPress={() => navigation.navigate("Booking")} style={styles.rescheduleBtn}>
            <Text style={styles.rescheduleText}>Reschedule Appointment</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (displayedData.length >= filteredData.length) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color="#001166" />
      </View>
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
          {FILTERS.map(f => (
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
          onEndReached={loadMoreData}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      )}

      <TouchableOpacity style={styles.bookBtn} onPress={() => navigation.navigate("Booking")}>
        <Text style={styles.bookText}>Book an Appointment</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", margin: 16, paddingHorizontal: 12, borderRadius: 12, height: 45 },
  searchInput: { flex: 1, marginLeft: 8, fontFamily: fonts.regular, fontSize: 14 },
  filterList: { paddingHorizontal: 16, gap: 8 },
  chip: { paddingHorizontal: 18, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "#E5E7EB", justifyContent: "center" },
  activeChip: { backgroundColor: "#001166", borderColor: "#001166" },
  chipText: { fontFamily: fonts.medium, fontSize: 12, color: "#6B7280" },
  activeChipText: { color: "#FFFFFF" },
  card: { backgroundColor: "#F9FAFB", borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  idText: { fontSize: 10, color: "#9CA3AF", fontFamily: fonts.bold, marginBottom: 2 },
  service: { fontSize: 17, fontFamily: fonts.semiBold, color: "#111827" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, minWidth: 85, alignItems: "center", justifyContent: "center" },
  statusText: { fontSize: 11, fontFamily: fonts.bold, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.5 },
  confirmedBg: { backgroundColor: "#D1FAE5" },
  confirmedText: { color: "#065F46" },
  pendingBg: { backgroundColor: "#FEF3C7" },
  pendingText: { color: "#92400E" },
  cancelledBg: { backgroundColor: "#FEE2E2" },
  cancelledText: { color: "#991B1B" },
  completedBg: { backgroundColor: "#DBEAFE" },
  completedText: { color: "#1E40AF" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  infoText: { fontSize: 13, color: "#4B5563", fontFamily: fonts.medium, flexShrink: 1 },
  cancelBtn: { marginTop: 16, backgroundColor: "#FFFFFF", padding: 12, borderRadius: 14, alignItems: "center", borderWidth: 1, borderColor: "#FCA5A5" },
  cancelText: { color: "#DC2626", fontFamily: fonts.bold, fontSize: 13 },
  rescheduleBtn: { marginTop: 16, backgroundColor: "#F5F8FF", padding: 12, borderRadius: 14, alignItems: "center", borderWidth: 1, borderColor: "#001166" },
  rescheduleText: { color: "#001166", fontFamily: fonts.bold, fontSize: 13 },
  bookBtn: { position: "absolute", bottom: 20, left: 20, right: 20, backgroundColor: "#001166", padding: 18, borderRadius: 999, alignItems: "center", elevation: 5 },
  bookText: { color: "#FFFFFF", fontFamily: fonts.bold, fontSize: 16 },
  empty: { textAlign: "center", marginTop: 40, color: "#9CA3AF", fontFamily: fonts.medium }
});