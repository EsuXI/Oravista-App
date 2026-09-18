import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Calendar } from "react-native-calendars";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader";
import CustomAlertModal from "../components/CustomAlertModal";
import { API_BASE_URL } from "../config/config";

const BRANCHES = ["Gil Puyat, Pasay", "Sta. Ana", "Angeles"];

const DENTISTS_BY_BRANCH = {
  "Gil Puyat, Pasay": [
    "Auto-assigned",
    "Queenie Balmedina DMD",
    "Therese Madrid DMD",
    "Vicente Epres II DMD",
    "Carl Adrian Usi DMD",
  ],
  "Sta. Ana": [
    "Auto-assigned",
    "Queenie Balmedina DMD",
    "Vicente Epres II DMD",
    "Carl Adrian Usi DMD",
  ],
  Angeles: [
    "Auto-assigned",
    "Paulette Malit DMD",
  ],
};

const SERVICE_CATEGORIES = {
  "General Dentistry": [
    { name: "Oral Prophylaxis", duration: 30, price: "Starts ₱500" },
    { name: "Restoration", duration: 60, price: "Starts ₱500" },
    { name: "Extraction", duration: 60, price: "Starts ₱700" },
  ],
  "Orthodontics (Braces, Veneers)": [
    { name: "Orthodontics Installation", duration: 60, price: "₱4,000 DP" },
    { name: "Orthodontics Adjustment", duration: 30, price: "₱1,000" },
    { name: "Veneers / Esthetics", duration: 120, price: "Starts ₱3,500" },
  ],
  "Restorative Treatments": [
    { name: "Root Canal Treatment", duration: 120, price: "Case to Case" },
    { name: "Wisdom Tooth Surgery", duration: 180, price: "Case to Case" },
    { name: "Dentures", duration: 30, price: "Case to Case" },
    { name: "Fixed Bridge", duration: 120, price: "Starts ₱3,500" },
    { name: "Whitening", duration: 90, price: "Case to Case" },
  ],
};

const parseNumericBasePrice = (priceStr) => {
  if (!priceStr) return 0;
  const match = priceStr.replace(/,/g, "").match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

const generateClinicTimes = (selectedServiceDuration, takenTimes, selectedDate) => {
  const isSunday = new Date(selectedDate).getDay() === 0;
  const start = 10 * 60;
  const end = isSunday ? 16 * 60 + 30 : 17 * 60;
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

    const isOccupied = takenTimes.some((appt) => {
      if (!appt) return false;
      const apptTime = appt.appointment_time || appt.time;
      if (!apptTime) return false;

      const [timePart, meridiem] = apptTime.split(" ");
      if (!timePart || !meridiem) return false;

      let [h, m] = timePart.split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return false;

      if (meridiem === "PM" && h !== 12) h += 12;
      if (meridiem === "AM" && h === 12) h = 0;

      const apptStart = h * 60 + m;
      let apptDuration = 60;
      const apptService = appt.service || appt.service_type;

      Object.values(SERVICE_CATEGORIES)
        .flat()
        .forEach((s) => {
          if (s.name === apptService) apptDuration = s.duration;
        });

      const apptEnd = apptStart + apptDuration;
      const newServiceEnd = t + selectedServiceDuration;

      return t < apptEnd && newServiceEnd > apptStart;
    });

    slots.push({ label, taken: isOccupied });
  }

  return slots;
};

export default function BookingScreen({ route, navigation }) {
  const rescheduleId = route?.params?.rescheduleId;

  const [userId, setUserId] = useState(null);
  const [branch, setBranch] = useState(null);
  const [category, setCategory] = useState(null);
  const [service, setService] = useState(null);
  const [dentist, setDentist] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);

  const [takenTimes, setTakenTimes] = useState([]);
  const [userAppointments, setUserAppointments] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  // Modal States
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: "success",
    title: "",
    message: "",
    details: [],
    onPrimaryPress: () => {},
  });

  const isComplete = branch && category && service && dentist && date && time;

  const today = new Date();
  const minDateString = today.toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setMonth(today.getMonth() + 3);
  const maxDateString = maxDate.toISOString().split("T")[0];

  useEffect(() => {
    fetchUserIdAndAppointments();
  }, []);

  const fetchUserIdAndAppointments = async () => {
    try {
      let currentId = null;
      const cachedUserData = await AsyncStorage.getItem("userData");

      if (cachedUserData) {
        const parsedUser = JSON.parse(cachedUserData);
        if (parsedUser && parsedUser.id) {
          currentId = parsedUser.id;
          setUserId(parsedUser.id);
        }
      }

      if (!currentId) {
        const userEmail = await AsyncStorage.getItem("userEmail");
        if (userEmail) {
          const response = await fetch(
            `${API_BASE_URL}/api/user-profile?email=${encodeURIComponent(userEmail)}`
          );
          const data = await response.json();
          if (response.ok && data.id) {
            currentId = data.id;
            setUserId(data.id);
          }
        }
      }

      if (currentId) {
        const apptRes = await fetch(`${API_BASE_URL}/api/appointments?userId=${currentId}`);
        if (apptRes.ok) {
          const apptData = await apptRes.json();
          setUserAppointments(Array.isArray(apptData) ? apptData : apptData.appointments || []);
        }
      }
    } catch (error) {
      console.error("Failed to load user ID and appointments:", error);
    }
  };

  const fetchTakenTimes = async (selectedDate) => {
    if (!selectedDate) {
      setTakenTimes([]);
      return;
    }

    setLoadingSlots(true);

    try {
      let combinedTaken = [];

      if (dentist) {
        const response = await fetch(
          `${API_BASE_URL}/api/booked-times?date=${encodeURIComponent(
            selectedDate
          )}&dentist=${encodeURIComponent(dentist)}`
        );

        const rawText = await response.text();
        let resObj = {};
        try {
          resObj = rawText ? JSON.parse(rawText) : {};
        } catch (e) {}

        const slotsList = Array.isArray(resObj)
          ? resObj
          : Array.isArray(resObj.bookedTimes)
          ? resObj.bookedTimes
          : [];

        combinedTaken = [...slotsList];
      }

      const userConflicts = userAppointments
        .filter((a) => {
          const apptDate = a.appointment_date || a.date;
          const status = (a.status || "").toLowerCase();
          return (
            apptDate === selectedDate &&
            status !== "cancelled" &&
            (!rescheduleId || a.id !== rescheduleId)
          );
        })
        .map((a) => ({
          appointment_time: a.appointment_time || a.time,
          service: a.service_type || a.service,
        }));

      combinedTaken = [...combinedTaken, ...userConflicts];
      setTakenTimes(combinedTaken);
    } catch (error) {
      console.error("FETCH TAKEN TIMES ERROR:", error);
      setTakenTimes([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleOpenConfirm = () => {
    if (!isComplete || bookingLoading) return;

    const hasExistingSlot = userAppointments.some((a) => {
      const apptDate = a.appointment_date || a.date;
      const apptTime = a.appointment_time || a.time;
      const status = (a.status || "").toLowerCase();
      return (
        apptDate === date &&
        apptTime === time &&
        status !== "cancelled" &&
        (!rescheduleId || a.id !== rescheduleId)
      );
    });

    if (hasExistingSlot) {
      setAlertConfig({
        visible: true,
        type: "warning",
        title: "Slot Unavailable",
        message: "You already have an appointment scheduled at this time. Please select another slot.",
        details: [],
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    setConfirmModalVisible(true);
  };

  const submitBooking = async () => {
    if (bookingLoading) return;

    let currentUserId = userId;

    if (!currentUserId) {
      try {
        const cachedUserData = await AsyncStorage.getItem("userData");
        if (cachedUserData) {
          const parsedUser = JSON.parse(cachedUserData);
          if (parsedUser?.id) currentUserId = parsedUser.id;
        }
      } catch (e) {}
    }

    if (!currentUserId) {
      setConfirmModalVisible(false);
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Session Error",
        message: "Could not identify your account. Please log in again.",
        details: [],
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    const calculatedBasePrice = parseNumericBasePrice(service.price);

    const payload = {
      userId: Number(currentUserId),
      dentist: dentist,
      service: service.name,
      date: date,
      time: time,
      branch: branch,
      basePrice: calculatedBasePrice,

      user_id: Number(currentUserId),
      dentist_name: dentist,
      service_type: service.name,
      appointment_date: date,
      appointment_time: time,
      base_price: calculatedBasePrice,
      price: calculatedBasePrice,
      service_price: calculatedBasePrice,
    };

    setBookingLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/book-appointment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      let resData = {};
      try {
        resData = rawText ? JSON.parse(rawText) : {};
      } catch (parseError) {
        resData = { message: rawText || "Invalid response from server." };
      }

      if (!response.ok) {
        throw new Error(resData?.message || `Booking failed with status ${response.status}`);
      }

      if (rescheduleId) {
        try {
          await fetch(`${API_BASE_URL}/api/update-appointment-status`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              appointment_id: rescheduleId,
              status: "Rescheduled",
            }),
          });
        } catch (rescheduleError) {
          console.warn("Reschedule update warning:", rescheduleError);
        }
      }

      setConfirmModalVisible(false);

      const bookingReference = resData?.booking_ref || resData?.reference || "Confirmed";

      setAlertConfig({
        visible: true,
        type: "success",
        title: "Appointment Booked!",
        message: "Your appointment request has been submitted to the clinic.",
        details: [
          { label: "Service", value: service.name },
          { label: "Base Price", value: service.price, highlight: true },
          { label: "Reference", value: bookingReference },
        ],
        onPrimaryPress: () => {
          setAlertConfig((prev) => ({ ...prev, visible: false }));
          navigation.goBack();
        },
      });
    } catch (error) {
      setConfirmModalVisible(false);
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Booking Failed",
        message: error?.message || "Unable to connect to the booking server.",
        details: [],
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const availableTimes = useMemo(() => {
    if (!service || !date) return [];
    return generateClinicTimes(service.duration, takenTimes, date);
  }, [service, date, takenTimes]);

  const markedDates = useMemo(() => {
    let marks = {};
    if (date) {
      marks[date] = {
        selected: true,
        selectedColor: "#001166",
      };
    }
    return marks;
  }, [date]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Book Appointment" showBack={true} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* BRANCH */}
        <Text style={styles.label}>Select Branch</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setOpenDropdown(openDropdown === "branch" ? null : "branch")}
        >
          <View style={styles.dropdownRow}>
            <Text style={styles.dropdownText}>{branch || "Choose a clinic branch"}</Text>
            <Ionicons name="chevron-down" size={18} color="#6B7280" />
          </View>
        </TouchableOpacity>

        {openDropdown === "branch" && (
          <View style={styles.dropdownList}>
            {BRANCHES.map((b) => (
              <TouchableOpacity
                key={b}
                style={styles.dropdownItem}
                onPress={() => {
                  setBranch(b);
                  setDentist(null);
                  setDate(null);
                  setTime(null);
                  setTakenTimes([]);
                  setOpenDropdown(null);
                }}
              >
                <Text style={styles.itemText}>{b}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* CATEGORY */}
        <Text style={styles.label}>Select Category</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setOpenDropdown(openDropdown === "cat" ? null : "cat")}
        >
          <View style={styles.dropdownRow}>
            <Text style={styles.dropdownText}>{category || "Choose a category"}</Text>
            <Ionicons name="chevron-down" size={18} color="#6B7280" />
          </View>
        </TouchableOpacity>

        {openDropdown === "cat" && (
          <View style={styles.dropdownList}>
            {Object.keys(SERVICE_CATEGORIES).map((c) => (
              <TouchableOpacity
                key={c}
                style={styles.dropdownItem}
                onPress={() => {
                  setCategory(c);
                  setService(null);
                  setDate(null);
                  setTime(null);
                  setTakenTimes([]);
                  setOpenDropdown(null);
                }}
              >
                <Text style={styles.itemText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* SERVICE */}
        {category && (
          <>
            <Text style={styles.label}>Choose Service</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setOpenDropdown(openDropdown === "srv" ? null : "srv")}
            >
              <View style={styles.dropdownRow}>
                <Text style={styles.dropdownText}>
                  {service
                    ? `${service.name} • ${service.price} (${service.duration / 60}hr)`
                    : "Choose service"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
              </View>
            </TouchableOpacity>

            {openDropdown === "srv" && (
              <View style={styles.dropdownList}>
                {SERVICE_CATEGORIES[category].map((s) => (
                  <TouchableOpacity
                    key={s.name}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setService(s);
                      setDate(null);
                      setTime(null);
                      setTakenTimes([]);
                      setOpenDropdown(null);
                    }}
                  >
                    <Text style={styles.itemText}>
                      {s.name} • {s.price} ({(s.duration / 60).toFixed(1).replace(".0", "")}hr)
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={15} color="#001166" style={{ marginRight: 6, marginTop: 1 }} />
              <Text style={styles.infoText}>
                Prices marked as "Case to Case" or "Starts at" depend on materials and severity. Final costs are set during consultation.
              </Text>
            </View>
          </>
        )}

        {/* DENTIST */}
        <Text style={styles.label}>Available Dentist</Text>
        {!branch ? (
          <Text style={styles.helper}>Please select a branch first</Text>
        ) : (
          <>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setOpenDropdown(openDropdown === "den" ? null : "den")}
            >
              <View style={styles.dropdownRow}>
                <Text style={styles.dropdownText}>{dentist || "Choose a dentist"}</Text>
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
              </View>
            </TouchableOpacity>

            {openDropdown === "den" && (
              <View style={styles.dropdownList}>
                {DENTISTS_BY_BRANCH[branch]?.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setDentist(d);
                      setDate(null);
                      setTime(null);
                      setTakenTimes([]);
                      setOpenDropdown(null);
                    }}
                  >
                    <Text style={styles.itemText}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* DATE */}
        <Text style={styles.label}>Available Date</Text>
        {!dentist ? (
          <Text style={styles.helper}>Please select a dentist first</Text>
        ) : (
          <View style={styles.calendarContainer}>
            <Calendar
              minDate={minDateString}
              maxDate={maxDateString}
              onDayPress={(day) => {
                setDate(day.dateString);
                setTime(null);
                fetchTakenTimes(day.dateString);
              }}
              markedDates={markedDates}
              theme={{
                todayTextColor: "#001166",
                arrowColor: "#001166",
                selectedDayBackgroundColor: "#001166",
              }}
            />
          </View>
        )}

        {/* TIME */}
        {date && (
          <>
            <Text style={styles.label}>Choose Time</Text>
            {loadingSlots ? (
              <ActivityIndicator size="small" color="#001166" style={{ marginTop: 14 }} />
            ) : (
              <View style={styles.timeGrid}>
                {availableTimes.map((t) => (
                  <TouchableOpacity
                    key={t.label}
                    disabled={t.taken}
                    style={[
                      styles.timeBtn,
                      t.taken && styles.timeDisabled,
                      time === t.label && styles.timeSelected,
                    ]}
                    onPress={() => setTime(t.label)}
                  >
                    <Text
                      style={[
                        styles.timeText,
                        t.taken && styles.timeTextDisabled,
                        time === t.label && styles.timeTextSelected,
                      ]}
                    >
                      {t.label} {t.taken ? "(Occupied)" : ""}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={bookingLoading}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={!isComplete || bookingLoading}
          onPress={handleOpenConfirm}
          style={[
            styles.confirmBtn,
            (!isComplete || bookingLoading) && { backgroundColor: "#9CA3AF" },
          ]}
        >
          {bookingLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* CONFIRMATION POPUP */}
      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="calendar" size={24} color="#001166" style={{ marginRight: 8 }} />
              <Text style={styles.modalTitle}>Confirm Appointment</Text>
            </View>

            <View style={styles.modalDetailsList}>
              <View style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>Service</Text>
                <Text style={styles.modalRowValue}>{service?.name}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>Base Price</Text>
                <Text style={[styles.modalRowValue, styles.priceHighlight]}>{service?.price}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>Dentist</Text>
                <Text style={styles.modalRowValue}>{dentist}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>Branch</Text>
                <Text style={styles.modalRowValue}>{branch}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>Date</Text>
                <Text style={styles.modalRowValue}>{date}</Text>
              </View>
              <View style={[styles.modalRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.modalRowLabel}>Time</Text>
                <Text style={styles.modalRowValue}>{time}</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setConfirmModalVisible(false)}
                disabled={bookingLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={submitBooking}
                disabled={bookingLoading}
              >
                {bookingLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Confirm & Book</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* REUSABLE CUSTOM ALERT (SUCCESS / ERROR) */}
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
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 16, paddingBottom: 120 },
  label: { marginTop: 14, marginBottom: 6, fontFamily: fonts.medium, color: "#111827" },
  dropdown: {
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 24,
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  dropdownText: { color: "#374151", fontFamily: fonts.regular },
  dropdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dropdownList: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    marginTop: 6,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderColor: "#F3F4F6" },
  itemText: { fontFamily: fonts.medium, color: "#374151" },
  infoRow: { flexDirection: "row", marginTop: 8, paddingHorizontal: 4, alignItems: "flex-start" },
  infoText: { fontSize: 11, color: "#6B7280", fontFamily: fonts.medium, flex: 1, lineHeight: 16 },
  helper: { textAlign: "center", color: "#6B7280", marginTop: 10, fontFamily: fonts.medium },
  calendarContainer: { marginTop: 4, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "#E5E7EB" },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10, justifyContent: "space-between" },
  timeBtn: {
    width: "48%",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  timeSelected: { backgroundColor: "#001166", borderColor: "#001166" },
  timeText: { color: "#374151", fontFamily: fonts.medium, fontSize: 13 },
  timeTextSelected: { color: "#FFFFFF", fontFamily: fonts.semiBold },
  timeDisabled: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB", opacity: 0.6 },
  timeTextDisabled: { color: "#9CA3AF" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
  },
  cancelBtn: { flex: 1, backgroundColor: "#F3F4F6", padding: 16, borderRadius: 24, alignItems: "center" },
  cancelText: { fontFamily: fonts.semiBold, color: "#374151" },
  confirmBtn: {
    flex: 1,
    backgroundColor: "#001166",
    padding: 16,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  confirmText: { color: "#FFFFFF", fontFamily: fonts.semiBold },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#001166",
  },
  modalDetailsList: {
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#EEF2FF",
    marginBottom: 20,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalRowLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#6B7280",
  },
  modalRowValue: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: "#111827",
    maxWidth: "60%",
    textAlign: "right",
  },
  priceHighlight: {
    color: "#001166",
    fontFamily: fonts.bold,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    height: 48,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelText: {
    color: "#4B5563",
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
  modalSubmitBtn: {
    flex: 1.5,
    backgroundColor: "#001166",
    height: 48,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSubmitText: {
    color: "#FFFFFF",
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
});