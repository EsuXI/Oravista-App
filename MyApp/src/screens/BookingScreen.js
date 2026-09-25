import { BRANCHES, DENTISTS_BY_BRANCH, SERVICE_CATEGORIES } from '../data/clinicCatalog';
import { requestJson, requireArray, clinicDate, dateKey, timeMinutes } from '../utils/patientData';
import LoadError from '../components/LoadError';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import React, { useState, useMemo, useEffect, useRef } from "react";
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

const parseNumericBasePrice = (priceStr) => {
  if (!priceStr) return 0;
  const match = priceStr.replace(/,/g, "").match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

const generateClinicTimes = (selectedServiceDuration, takenTimes, selectedDate) => {
  const isSunday = new Date(`${selectedDate}T12:00:00`).getDay() === 0;
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

      const apptStart = timeMinutes(apptTime);
      // Unreadable occupied slots must not be treated as free time.
      if (apptStart === null) return true;
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

    const now = new Date();
    const clinicNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const past = selectedDate === clinicDate(now) && t <= clinicNow.getUTCHours() * 60 + clinicNow.getUTCMinutes();
    slots.push({ label, taken: isOccupied || past });
  }

  return slots;
};

export default function BookingScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const slotRequest = useRef(0);
  const bookingBusy = useRef(false);
  const [slotError, setSlotError] = useState('');
  const [slotsReady, setSlotsReady] = useState(false);
  const [bookingCreated, setBookingCreated] = useState(false);
  const rescheduleId = route?.params?.rescheduleId;

  const [userId, setUserId] = useState(null);
  const [branch, setBranch] = useState(BRANCHES.includes(route?.params?.initialBranch) ? route.params.initialBranch : null);
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

  const isComplete = branch && category && service && dentist && date && time && slotsReady && !loadingSlots && !slotError && !bookingCreated;

  const today = new Date();
  const minDateString = clinicDate(today);
  const maxDate = new Date();
  maxDate.setMonth(today.getMonth() + 3);
  const maxDateString = clinicDate(maxDate);

  const fetchUserIdAndAppointments = async () => {
    const stored = await AsyncStorage.getItem('userData');
    const parsed = stored ? JSON.parse(stored) : null;
    let currentId = parsed?.id || parsed?.user_id;
    if (!currentId) {
      const email = await AsyncStorage.getItem('userEmail');
      if (email) currentId = (await requestJson(`${API_BASE_URL}/api/user-profile?email=${encodeURIComponent(email)}`)).id;
    }
    if (!currentId) throw new Error('Could not identify your account. Please log in again.');
    const data = await requestJson(`${API_BASE_URL}/api/user-appointments/${encodeURIComponent(currentId)}`);
    return { currentId, appointments: requireArray(data, 'appointments') };
  };

  const fetchTakenTimes = async (selectedDate) => {
    const requestId = ++slotRequest.current;
    setTime(null);
    setSlotsReady(false);
    setSlotError('');
    if (!selectedDate || !dentist) { setLoadingSlots(false); return; }
    setLoadingSlots(true);
    try {
      const [{ currentId, appointments }, data] = await Promise.all([
        fetchUserIdAndAppointments(),
        requestJson(`${API_BASE_URL}/api/appointments/check-availability?date=${encodeURIComponent(selectedDate)}&dentist=${encodeURIComponent(dentist)}`),
      ]);
      const slots = requireArray(data, 'bookedTimes');
      if (slots.some(a => timeMinutes(a.appointment_time || a.time) === null)) throw new Error('Availability could not be read. Please retry or contact the clinic.');
      if (requestId !== slotRequest.current) return;
      const conflicts = appointments.filter(a => dateKey(a.appointment_date || a.date) === selectedDate &&
        !['cancelled', 'rescheduled', 'completed'].includes(String(a.status || '').trim().toLowerCase()) &&
        (!rescheduleId || String(a.id) !== String(rescheduleId)));
      setUserId(currentId);
      setUserAppointments(appointments);
      setTakenTimes([...slots, ...conflicts]);
      setSlotsReady(true);
    } catch (error) {
      if (requestId === slotRequest.current) setSlotError(error.message || 'Unable to check availability. Please try again.');
    } finally {
      if (requestId === slotRequest.current) setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchTakenTimes(date);
    return () => { slotRequest.current += 1; };
  }, [date, dentist, branch, service, rescheduleId]);

  const handleOpenConfirm = () => {
    if (!isComplete || bookingLoading) return;

    const hasExistingSlot = userAppointments.some((a) => {
      const apptDate = a.appointment_date || a.date;
      const apptTime = a.appointment_time || a.time;
      const status = (a.status || "").toLowerCase();
      return (
        dateKey(apptDate) === date &&
        timeMinutes(apptTime) === timeMinutes(time) &&
        status !== "cancelled" &&
        (!rescheduleId || String(a.id) !== String(rescheduleId))
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
    if (bookingBusy.current || !isComplete) return;
    if (date < clinicDate()) { setDate(null); return; }
    if (date === clinicDate()) {
      const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
      if (timeMinutes(time) <= now.getUTCHours() * 60 + now.getUTCMinutes()) { fetchTakenTimes(date); return; }
    }
    bookingBusy.current = true;
    setBookingLoading(true);
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
      bookingBusy.current = false;
      setBookingLoading(false);
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
      amount: calculatedBasePrice,

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
      const resData = await requestJson(`${API_BASE_URL}/api/book-appointment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      setBookingCreated(true);
      let rescheduleFailed = false;
      if (rescheduleId) {
        try {
          await requestJson(`${API_BASE_URL}/api/update-appointment-status`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appointment_id: rescheduleId, status: 'Rescheduled' }),
          });
        } catch { rescheduleFailed = true; }
      }
      setConfirmModalVisible(false);

      const bookingReference = resData?.booking_ref || resData?.reference || "Not provided";

      setAlertConfig({
        visible: true,
        type: rescheduleFailed ? "warning" : "success",
        title: rescheduleFailed ? "New Appointment Booked" : "Appointment Requested",
        message: rescheduleFailed ? "Your new request was created, but the previous appointment could not be updated. Please review your visits and contact the clinic. Do not submit another booking." : "Your appointment request has been submitted. Please wait for clinic confirmation.",
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
        message: `${error?.message || "Unable to connect to the booking server."} Check your Visits list before submitting again in case the request was received.`,
        details: [],
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      bookingBusy.current = false;
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
          selectedColor: colors.primary,
          selectedTextColor: colors.ink,
      };
    }
    return marks;
  }, [date]);

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <ScreenHeader title="Book Appointment" showBack={true} />

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* BRANCH */}
        <Text style={styles.label}>Select Branch</Text>
        <TouchableOpacity accessibilityRole="button"
          style={styles.dropdown}
          onPress={() => setOpenDropdown(openDropdown === "branch" ? null : "branch")}
        >
          <View style={styles.dropdownRow}>
            <Text style={styles.dropdownText}>{branch || "Choose a clinic branch"}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </View>
        </TouchableOpacity>

        {openDropdown === "branch" && (
          <View style={styles.dropdownList}>
            {BRANCHES.map((b) => (
              <TouchableOpacity accessibilityRole="button"
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
        <TouchableOpacity accessibilityRole="button"
          style={styles.dropdown}
          onPress={() => setOpenDropdown(openDropdown === "cat" ? null : "cat")}
        >
          <View style={styles.dropdownRow}>
            <Text style={styles.dropdownText}>{category || "Choose a category"}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </View>
        </TouchableOpacity>

        {openDropdown === "cat" && (
          <View style={styles.dropdownList}>
            {Object.keys(SERVICE_CATEGORIES).map((c) => (
              <TouchableOpacity accessibilityRole="button"
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
            <TouchableOpacity accessibilityRole="button"
              style={styles.dropdown}
              onPress={() => setOpenDropdown(openDropdown === "srv" ? null : "srv")}
            >
              <View style={styles.dropdownRow}>
                <Text style={styles.dropdownText}>
                  {service
                    ? `${service.name} • ${service.price} (${service.duration / 60}hr)`
                    : "Choose service"}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.muted} />
              </View>
            </TouchableOpacity>

            {openDropdown === "srv" && (
              <View style={styles.dropdownList}>
                {SERVICE_CATEGORIES[category].map((s) => (
                  <TouchableOpacity accessibilityRole="button"
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
              <Ionicons name="information-circle" size={15} color={colors.accent} style={{ marginRight: 6, marginTop: 1 }} />
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
            <TouchableOpacity accessibilityRole="button"
              style={styles.dropdown}
              onPress={() => setOpenDropdown(openDropdown === "den" ? null : "den")}
            >
              <View style={styles.dropdownRow}>
                <Text style={styles.dropdownText}>{dentist || "Choose a dentist"}</Text>
                <Ionicons name="chevron-down" size={18} color={colors.muted} />
              </View>
            </TouchableOpacity>

            {openDropdown === "den" && (
              <View style={styles.dropdownList}>
                {DENTISTS_BY_BRANCH[branch]?.map((d) => (
                  <TouchableOpacity accessibilityRole="button"
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

              }}
              markedDates={markedDates}
                theme={{
                  calendarBackground: colors.surface,
                  textSectionTitleColor: colors.ink,
                  dayTextColor: colors.ink,
                  textDisabledColor: colors.ink,
                  monthTextColor: colors.ink,
                  textDayFontFamily: fonts.semiBold,
                  textMonthFontFamily: fonts.bold,
                  todayTextColor: colors.accent,
                  arrowColor: colors.accent,
                  selectedDayBackgroundColor: colors.primary,
                  selectedDayTextColor: colors.ink,
              }}
            />
          </View>
        )}

        {/* TIME */}
        {date && (
          <>
            <Text style={styles.label}>Choose Time</Text>
            {loadingSlots ? (
              <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 14 }} />
            ) : slotError ? (
              <LoadError message={slotError} onRetry={() => fetchTakenTimes(date)} />
            ) : !service ? (<Text style={styles.helper}>Choose a service to see appointment times.</Text>) : (
              <View style={styles.timeGrid}>
                {availableTimes.map((t) => (
                  <TouchableOpacity accessibilityRole="button"
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
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity accessibilityRole="button"
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={bookingLoading}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button"
          disabled={!isComplete || bookingLoading}
          onPress={handleOpenConfirm}
          style={[
            styles.confirmBtn,
            (!isComplete || bookingLoading) && { backgroundColor: colors.muted },
          ]}
        >
          {bookingLoading ? (
            <ActivityIndicator size="small" color={colors.ink} />
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
        onRequestClose={() => { if (!bookingBusy.current) setConfirmModalVisible(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="calendar" size={24} color={colors.accent} style={{ marginRight: 8 }} />
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
              <TouchableOpacity accessibilityRole="button"
                style={styles.modalCancelBtn}
                onPress={() => setConfirmModalVisible(false)}
                disabled={bookingLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity accessibilityRole="button"
                style={styles.modalSubmitBtn}
                onPress={submitBooking}
                disabled={bookingLoading}
              >
                {bookingLoading ? (
                  <ActivityIndicator size="small" color={colors.ink} />
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
  container: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 16, paddingBottom: 120 },
  label: { marginTop: 14, marginBottom: 6, fontFamily: fonts.medium, color: colors.ink },
  dropdown: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 16,
    backgroundColor: colors.surface,
  },
  dropdownText: { color: colors.ink, fontFamily: fonts.regular },
  dropdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dropdownList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    marginTop: 6,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderColor: colors.aquaSoft },
  itemText: { fontFamily: fonts.medium, color: colors.ink },
  infoRow: { flexDirection: "row", marginTop: 8, paddingHorizontal: 4, alignItems: "flex-start" },
  infoText: { fontSize: 11, color: colors.muted, fontFamily: fonts.medium, flex: 1, lineHeight: 16 },
  helper: { textAlign: "center", color: colors.muted, marginTop: 10, fontFamily: fonts.medium },
  calendarContainer: { marginTop: 4, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10, justifyContent: "space-between" },
  timeBtn: {
    width: "48%",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  timeSelected: { backgroundColor: colors.primary, borderColor: colors.accent },
  timeText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 13 },
  timeTextSelected: { color: colors.ink, fontFamily: fonts.semiBold },
  timeDisabled: { backgroundColor: colors.aquaSoft, borderColor: colors.border, opacity: 0.6 },
  timeTextDisabled: { color: colors.muted },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  cancelBtn: { flex: 1, backgroundColor: colors.aquaSoft, padding: 16, borderRadius: 999, alignItems: "center" },
  cancelText: { fontFamily: fonts.semiBold, color: colors.ink },
  confirmBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  confirmText: { color: colors.ink, fontFamily: fonts.semiBold },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.accent,
  },
  modalDetailsList: {
    backgroundColor: colors.input,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.lavender,
    marginBottom: 20,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.aquaSoft,
  },
  modalRowLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.muted,
  },
  modalRowValue: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.ink,
    maxWidth: "60%",
    textAlign: "right",
  },
  priceHighlight: {
    color: colors.accent,
    fontFamily: fonts.bold,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: colors.aquaSoft,
    height: 48,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelText: {
    color: colors.muted,
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
  modalSubmitBtn: {
    flex: 1.5,
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSubmitText: {
    color: colors.ink,
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
});
