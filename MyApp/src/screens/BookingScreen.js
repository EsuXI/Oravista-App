import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform
} from "react-native";
import { Calendar } from "react-native-calendars";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader"; 
import { API_BASE_URL } from '../config/config'; 

const BRANCHES = ["Pasay Branch", "Sta. Ana Branch", "Balibago Branch"];

const DENTISTS_BY_BRANCH = {
  "Pasay Branch": [
    "Auto-assigned", 
    "Queenie Balmedina DMD", 
    "Therese Madrid DMD", 
    "Vicente Epres II DMD", 
    "Carl Adrian Usi DMD"
  ],
  "Sta. Ana Branch": [
    "Auto-assigned", 
    "Queenie Balmedina DMD", 
    "Vicente Epres II DMD", 
    "Carl Adrian Usi DMD"
  ],
  "Balibago Branch": [
    "Auto-assigned", 
    "Paulette Malit DMD"
  ],
};

const SERVICE_CATEGORIES = {
  "General Dentistry": [
    { name: "Oral Prophylaxis", duration: 30 },
    { name: "Restoration", duration: 60 },
    { name: "Extraction", duration: 60 },
  ],
  "Orthodontics (Braces, Veneers)": [
    { name: "Orthodontics Installation", duration: 60 },
    { name: "Orthodontics Adjustment", duration: 30 },
    { name: "Veneers / Esthetics", duration: 120 },
  ],
  "Restorative Treatments": [
    { name: "Root Canal Treatment", duration: 120 },
    { name: "Wisdom Tooth Surgery", duration: 180 },
    { name: "Dentures", duration: 30 },
    { name: "Fixed Bridge", duration: 120 },
    { name: "Whitening", duration: 90 },
  ],
};

// 🚀 Logic to calculate overlaps and clinic hours[cite: 4]
const generateClinicTimes = (selectedServiceDuration, takenTimes, selectedDate) => {
  const isSunday = new Date(selectedDate).getDay() === 0; 
  
  const start = 10 * 60; // 10:00 AM
  const end = isSunday ? (16 * 60) + 30 : 17 * 60; // Sun: 4:30 PM | Mon-Sat: 5:00 PM
  const lunchStart = 12 * 60; 
  const lunchEnd = 13 * 60;   

  let slots = [];

  for (let t = start; t + selectedServiceDuration <= end; t += 30) {
    if (t >= lunchStart && t < lunchEnd) continue; 
    if (t < lunchStart && t + selectedServiceDuration > lunchStart) continue;

    const hour = Math.floor(t / 60);
    const min = t % 60;
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const label = `${displayHour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")} ${suffix}`;

    // 🛡️ Enhanced Overlap Check[cite: 4, 6]
    const isOccupied = takenTimes.some((appt) => {
        const [timePart, meridiem] = appt.time.split(" ");
        let [h, m] = timePart.split(":").map(Number);
        if (meridiem === "PM" && h !== 12) h += 12;
        if (meridiem === "AM" && h === 12) h = 0;
        const apptStart = h * 60 + m;
        
        let apptDuration = 60; // Default
        Object.values(SERVICE_CATEGORIES).flat().forEach(s => {
            if (s.name === appt.service_type) apptDuration = s.duration;
        });

        const apptEnd = apptStart + apptDuration;
        const newServiceEnd = t + selectedServiceDuration;

        return (t < apptEnd && newServiceEnd > apptStart);
    });

    slots.push({ label, taken: isOccupied });
  }
  return slots;
};

export default function BookingScreen({ navigation }) {
  const [userId, setUserId] = useState(null);
  const [branch, setBranch] = useState(null);
  const [category, setCategory] = useState(null);
  const [service, setService] = useState(null);
  const [dentist, setDentist] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [takenTimes, setTakenTimes] = useState([]); 
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const isComplete = branch && category && service && dentist && date && time && userId;
  
  const today = new Date();
  const minDateString = today.toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setMonth(today.getMonth() + 3);
  const maxDateString = maxDate.toISOString().split("T")[0];

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userEmail = await AsyncStorage.getItem("userEmail");
        const response = await fetch(`${API_BASE_URL}/api/user-profile?email=${userEmail}`);
        const data = await response.json();
        if (response.ok) setUserId(data.id);
      } catch (error) {
        console.error("Failed to load user ID:", error);
      }
    };
    fetchUserId();
  }, []);

  const fetchTakenTimes = async (selectedDate) => {
    setLoadingSlots(true);
    try {
      // UPDATED: Now pointing to the correct Supabase-connected route
      const response = await fetch(`${API_BASE_URL}/api/booked-times?date=${selectedDate}&dentist=${dentist}`);
      const data = await response.json();
      if (response.ok) setTakenTimes(data || []);
      else setTakenTimes([]);
    } catch (error) {
      setTakenTimes([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleConfirmBooking = async () => {
    Alert.alert("Confirm Appointment?", `Service: ${service.name}\nDate: ${date}\nTime: ${time}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/api/book-appointment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                user_id: userId,
                service_type: service.name, 
                dentist_name: dentist, 
                appointment_date: date, 
                appointment_time: time 
              })
            });
            if (response.ok) {
              Alert.alert("Success!", "Appointment booked successfully.");
              navigation.goBack();
            }
          } catch (e) { Alert.alert("Error", "Server connection failed."); }
        } 
      }
    ]);
  };

  const availableTimes = useMemo(() => {
    if (!service || !date) return [];
    return generateClinicTimes(service.duration, takenTimes, date);
  }, [service, date, takenTimes]);

  const markedDates = useMemo(() => {
    let marks = {};
    if (date) marks[date] = { selected: true, selectedColor: "#001166" };
    return marks;
  }, [date]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Book Appointment" showBack={true} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.label}>Select Branch</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setOpenDropdown(openDropdown === "branch" ? null : "branch")}>
          <View style={styles.dropdownRow}><Text style={styles.dropdownText}>{branch || "Choose a clinic branch"}</Text><Ionicons name="chevron-down" size={18} color="#6B7280" /></View>
        </TouchableOpacity>
        {openDropdown === "branch" && (
          <View style={styles.dropdownList}>
            {BRANCHES.map((b) => (
              <TouchableOpacity key={b} style={styles.dropdownItem} onPress={() => { setBranch(b); setDentist(null); setDate(null); setOpenDropdown(null); }}>
                <Text style={styles.itemText}>{b}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Select Category</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setOpenDropdown(openDropdown === "cat" ? null : "cat")}>
          <View style={styles.dropdownRow}><Text style={styles.dropdownText}>{category || "Choose a category"}</Text><Ionicons name="chevron-down" size={18} color="#6B7280" /></View>
        </TouchableOpacity>
        {openDropdown === "cat" && (
          <View style={styles.dropdownList}>
            {Object.keys(SERVICE_CATEGORIES).map((c) => (
              <TouchableOpacity key={c} style={styles.dropdownItem} onPress={() => { setCategory(c); setService(null); setDate(null); setOpenDropdown(null); }}>
                <Text style={styles.itemText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {category && (
          <>
            <Text style={styles.label}>Choose Service</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setOpenDropdown(openDropdown === "srv" ? null : "srv")}>
              <View style={styles.dropdownRow}><Text style={styles.dropdownText}>{service ? `${service.name} (${service.duration / 60}hr)` : "Choose service"}</Text><Ionicons name="chevron-down" size={18} color="#6B7280" /></View>
            </TouchableOpacity>
            {openDropdown === "srv" && (
              <View style={styles.dropdownList}>
                {SERVICE_CATEGORIES[category].map((s) => (
                  <TouchableOpacity key={s.name} style={styles.dropdownItem} onPress={() => { setService(s); setDate(null); setOpenDropdown(null); }}>
                    <Text style={styles.itemText}>{s.name} ({(s.duration / 60).toFixed(1).replace(".0", "")}hr)</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        <Text style={styles.label}>Available Dentist</Text>
        {!branch ? <Text style={styles.helper}>Please select a branch first</Text> : (
          <>
            <TouchableOpacity style={styles.dropdown} onPress={() => setOpenDropdown(openDropdown === "den" ? null : "den")}>
              <View style={styles.dropdownRow}><Text style={styles.dropdownText}>{dentist || "Choose a dentist"}</Text><Ionicons name="chevron-down" size={18} color="#6B7280" /></View>
            </TouchableOpacity>
            {openDropdown === "den" && (
              <View style={styles.dropdownList}>
                {DENTISTS_BY_BRANCH[branch]?.map((d) => (
                  <TouchableOpacity key={d} style={styles.dropdownItem} onPress={() => { setDentist(d); setDate(null); setOpenDropdown(null); }}>
                    <Text style={styles.itemText}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        <Text style={styles.label}>Available Date</Text>
        {!dentist ? <Text style={styles.helper}>Please select a dentist first</Text> : (
          <View style={styles.calendarContainer}>
            <Calendar
              minDate={minDateString}
              maxDate={maxDateString}
              onDayPress={(day) => { setDate(day.dateString); setTime(null); fetchTakenTimes(day.dateString); }}
              markedDates={markedDates}
              theme={{ todayTextColor: "#001166", arrowColor: "#001166", selectedDayBackgroundColor: "#001166" }}
            />
          </View>
        )}

        {date && (
          <>
            <Text style={styles.label}>Choose Time</Text>
            {loadingSlots ? <ActivityIndicator size="small" color="#001166" /> : (
              <View style={styles.timeGrid}>
                {availableTimes.map((t) => (
                  <TouchableOpacity
                    key={t.label}
                    disabled={t.taken}
                    style={[styles.timeBtn, t.taken && styles.timeDisabled, time === t.label && styles.timeSelected]}
                    onPress={() => setTime(t.label)}
                  >
                    <Text style={[styles.timeText, t.taken && styles.timeTextDisabled, time === t.label && styles.timeTextSelected]}>
                      {t.label} {t.taken ? "(Occupied)" : ""}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity disabled={!isComplete} onPress={handleConfirmBooking} style={[styles.confirmBtn, !isComplete && { backgroundColor: "#9CA3AF" }]}>
          <Text style={styles.confirmText}>Confirm Booking</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 16, paddingBottom: 120 },
  label: { marginTop: 14, marginBottom: 6, fontFamily: fonts.medium },
  dropdown: { borderWidth: 1.5, borderColor: "#9CA3AF", borderRadius: 999, padding: 16 },
  dropdownText: { color: "#374151" },
  dropdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dropdownList: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, marginTop: 6 },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderColor: "#EEE" },
  itemText: { fontFamily: fonts.medium, color: "#374151" },
  helper: { textAlign: "center", color: "#6B7280", marginTop: 10, fontFamily: fonts.medium },
  calendarContainer: { marginTop: 4, borderRadius: 12, overflow: "hidden" },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10, justifyContent: "space-between" },
  timeBtn: { width: "48%", borderWidth: 1.5, borderColor: "#9CA3AF", borderRadius: 999, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center" },
  timeSelected: { backgroundColor: "#001166", borderColor: "#001166" },
  timeText: { color: "#374151", fontFamily: fonts.medium, fontSize: 13 },
  timeTextSelected: { color: "#fff" },
  timeDisabled: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB", opacity: 0.7 },
  timeTextDisabled: { color: "#9CA3AF" },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 12, padding: 16, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderColor: "#E5E7EB" },
  cancelBtn: { flex: 1, backgroundColor: "#E5E7EB", padding: 16, borderRadius: 999, alignItems: "center" },
  cancelText: { fontFamily: fonts.semiBold, color: "#374151" },
  confirmBtn: { flex: 1, backgroundColor: "#001166", padding: 16, borderRadius: 999, alignItems: "center" },
  confirmText: { color: "#fff", fontFamily: fonts.semiBold },
});