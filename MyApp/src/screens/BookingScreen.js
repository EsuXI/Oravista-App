import { BRANCHES, DENTISTS_BY_BRANCH, SERVICE_CATEGORIES } from '../data/clinicCatalog';
import { requestJson, requireArray, clinicDate, dateKey, timeMinutes } from '../utils/patientData';
import LoadError from '../components/LoadError';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
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

// Match stored web service names when loading an existing appointment on mobile.
const rescheduleServiceDetails = (appointment) => {
  const aliases = {
    'Braces Installation': 'Orthodontics Installation',
    'Braces Adjustment': 'Orthodontics Adjustment',
    Veneers: 'Veneers / Esthetics',
    'Root Canal (RCT)': 'Root Canal Treatment',
    'Teeth Whitening': 'Whitening',
  };
  const durations = {
    'Oral Prophylaxis': 30, Restoration: 60, Extraction: 60,
    'Braces Installation': 60, 'Braces Adjustment': 30, Veneers: 120,
    'Root Canal (RCT)': 120, 'Wisdom Tooth Surgery': 180, Dentures: 30,
    'Fixed Bridge': 120, 'Teeth Whitening': 90,
  };
  const name = String(appointment.service_type || '').trim();
  const entry = Object.entries(SERVICE_CATEGORIES).find(([, services]) =>
    services.some(s => s.name === name || s.name === aliases[name]));
  const catalogService = entry?.[1].find(s => s.name === name || s.name === aliases[name]);
  const hours = name.match(/(\d+(?:\.\d+)?)\s*hrs?/i);
  const minutes = name.match(/(\d+)\s*mins?/i);
  return {
    category: entry?.[0] || 'Existing appointment',
    service: {
      name,
      duration: durations[name] || catalogService?.duration ||
        ((hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0)) || 30,
      price: appointment.amount != null
        ? `₱${Number(appointment.amount).toLocaleString('en-PH')}`
        : catalogService?.price || 'Not provided',
    },
  };
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
  const isReschedule = rescheduleId != null;
  const [originalAppointment, setOriginalAppointment] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');
  const [rescheduleRetry, setRescheduleRetry] = useState(0);

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

  const rescheduleReady = !isReschedule || (originalAppointment &&
    String(originalAppointment.id) === String(rescheduleId) && !rescheduleLoading && !rescheduleError);
  const unchangedSchedule = isReschedule && originalAppointment && date && time &&
    dateKey(originalAppointment.appointment_date) === date &&
    timeMinutes(originalAppointment.appointment_time) === timeMinutes(time);
  const isComplete = branch && category && service && dentist && date && time && slotsReady && !loadingSlots && !slotError && !bookingCreated && rescheduleReady && !unchangedSchedule;

  const today = new Date();
  const minDateString = clinicDate(today);
  const maxDate = new Date();
  maxDate.setMonth(today.getMonth() + 3);
  const maxDateString = clinicDate(maxDate);

  const fetchUserIdAndAppointments = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (!isReschedule) {
      setOriginalAppointment(null);
      return;
    }
    let active = true;
    setRescheduleLoading(true);
    setRescheduleError('');
    setOriginalAppointment(null);
    setBookingCreated(false);
    setDate(null);
    setTime(null);
    setOpenDropdown(null);
    fetchUserIdAndAppointments().then(({ currentId, appointments }) => {
      if (!active) return;
      const appointment = appointments.find(a => String(a.id) === String(rescheduleId));
      if (!appointment) throw new Error('Appointment not found. Return to Visits and refresh.');
      if (!['Confirmed', 'Late / No Show'].includes(appointment.status)) {
        throw new Error('Only confirmed or late/no-show appointments can be rescheduled. Return to Visits and refresh.');
      }
      if (!appointment.service_type || !appointment.dentist_name) {
        throw new Error('Appointment details are incomplete. Please contact the clinic.');
      }
      const details = rescheduleServiceDetails(appointment);
      setOriginalAppointment(appointment);
      setUserId(currentId);
      setUserAppointments(appointments);
      setBranch(appointment.branch || 'Main Branch');
      setCategory(details.category);
      setService(details.service);
      setDentist(appointment.dentist_name);
    }).catch(error => {
      if (active) setRescheduleError(error.message || 'Unable to load the appointment.');
    }).finally(() => { if (active) setRescheduleLoading(false); });
    return () => { active = false; };
  }, [isReschedule, rescheduleId, rescheduleRetry, fetchUserIdAndAppointments]);

  const fetchTakenTimes = useCallback(async (selectedDate) => {
    const requestId = ++slotRequest.current;
    setTime(null);
    setSlotsReady(false);
    setSlotError('');
    if (!selectedDate || !dentist || (isReschedule && !originalAppointment)) { setLoadingSlots(false); return; }
    setLoadingSlots(true);
    try {
      const [{ currentId, appointments }, data] = await Promise.all([
        fetchUserIdAndAppointments(),
        requestJson(`${API_BASE_URL}/api/appointments/check-availability?date=${encodeURIComponent(selectedDate)}&dentist=${encodeURIComponent(dentist)}${isReschedule ? `&excludeAppointmentId=${encodeURIComponent(rescheduleId)}` : ''}`),
      ]);
      if (isReschedule) {
        const current = appointments.find(a => String(a.id) === String(rescheduleId));
        if (!current || !['Confirmed', 'Late / No Show'].includes(current.status) ||
            ['service_type', 'dentist_name', 'branch', 'appointment_date', 'appointment_time'].some(key =>
              current[key] !== originalAppointment[key])) {
          throw new Error('This appointment changed. Return to Visits and reopen the reschedule request.');
        }
      }
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
  }, [dentist, isReschedule, rescheduleId, originalAppointment, fetchUserIdAndAppointments]);

  useEffect(() => {
    fetchTakenTimes(date);
    return () => { slotRequest.current += 1; };
  }, [date, branch, service, fetchTakenTimes]);

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

    if (isReschedule) {
      try {
        await requestJson(`${API_BASE_URL}/api/request-reschedule`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointment_id: originalAppointment.id,
            user_id: Number(currentUserId),
            requested_date: date,
            requested_time: time,
          }),
        });
        setBookingCreated(true);
        setConfirmModalVisible(false);
        setAlertConfig({
          visible: true, type: 'success', title: 'Reschedule Request Submitted',
          message: 'Your requested date and time are awaiting clinic approval. Your existing schedule remains unchanged until approved.',
          details: [
            { label: 'Reference', value: originalAppointment.booking_ref || 'Not provided' },
            { label: 'Requested Date', value: date },
            { label: 'Requested Time', value: time },
          ],
          onPrimaryPress: () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            navigation.goBack();
          },
        });
      } catch (error) {
        setConfirmModalVisible(false);
        setAlertConfig({
          visible: true, type: 'error', title: 'Reschedule Request Failed',
          message: `${error?.message || 'Unable to submit your request.'} Check your Visits list before trying again.`,
          details: [],
          onPrimaryPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
        });
      } finally {
        bookingBusy.current = false;
        setBookingLoading(false);
      }
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
      setConfirmModalVisible(false);

      const bookingReference = resData?.booking_ref || resData?.reference || "Not provided";

      setAlertConfig({
        visible: true,
        type: "success",
        title: "Appointment Requested",
        message: "Your appointment request has been submitted. Please wait for clinic confirmation.",
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
        message: `${error?.message || "Unable to connect to the booking server."} Check your Appointments list before submitting again in case the request was received.`,
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
      <ScreenHeader title={isReschedule ? "Reschedule Appointment" : "Book Appointment"} showBack={true} />

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isReschedule && <Text style={styles.helper}>Only the date and time can be changed. The clinic must approve your request.</Text>}
        {isReschedule && rescheduleLoading && <ActivityIndicator size="small" color={colors.accent} />}
        {isReschedule && rescheduleError && <LoadError message={rescheduleError} onRetry={() => setRescheduleRetry(value => value + 1)} />}
        <View style={styles.bookingSection}>
        <Text style={styles.sectionTitle}>1 - Choose your care</Text>
        {/* BRANCH */}
        <Text style={styles.label}>Select Branch</Text>
        <TouchableOpacity accessibilityRole="button"
          style={styles.dropdown}
          disabled={isReschedule}
          accessibilityState={{ disabled: isReschedule }}
          onPress={() => setOpenDropdown(openDropdown === "branch" ? null : "branch")}
        >
          <View style={styles.dropdownRow}>
            <Text style={styles.dropdownText}>{branch || "Choose a clinic branch"}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </View>
        </TouchableOpacity>

        {!isReschedule && openDropdown === "branch" && (
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
          disabled={isReschedule}
          accessibilityState={{ disabled: isReschedule }}
          onPress={() => setOpenDropdown(openDropdown === "cat" ? null : "cat")}
        >
          <View style={styles.dropdownRow}>
            <Text style={styles.dropdownText}>{category || "Choose a category"}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </View>
        </TouchableOpacity>

        {!isReschedule && openDropdown === "cat" && (
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
              disabled={isReschedule}
          accessibilityState={{ disabled: isReschedule }}
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

            {!isReschedule && openDropdown === "srv" && (
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
              disabled={isReschedule}
          accessibilityState={{ disabled: isReschedule }}
          onPress={() => setOpenDropdown(openDropdown === "den" ? null : "den")}
            >
              <View style={styles.dropdownRow}>
                <Text style={styles.dropdownText}>{dentist || "Choose a dentist"}</Text>
                <Ionicons name="chevron-down" size={18} color={colors.muted} />
              </View>
            </TouchableOpacity>

            {!isReschedule && openDropdown === "den" && (
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

        </View>
        <View style={styles.bookingSection}>
        <Text style={styles.sectionTitle}>2 · Choose a time</Text>
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
                if (bookingBusy.current || !rescheduleReady) return;
                setDate(day.dateString);
                setTime(null);

              }}
              markedDates={markedDates}
                theme={{
                  calendarBackground: colors.surface,
                  textSectionTitleColor: colors.ink,
                  dayTextColor: colors.ink,
                  textDisabledColor: colors.muted,
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
                    disabled={t.taken || bookingLoading || !rescheduleReady}
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
        </View>
        <View style={styles.bookingSection}><Text style={styles.sectionTitle}>Your visit</Text><Text style={styles.infoText}>{service?.name || 'Choose a service'} · {branch || 'Choose a clinic'}</Text><Text style={styles.infoText}>{date || 'Choose a date'} · {time || 'Choose a time'}</Text></View>
      </ScrollView>

      {unchangedSchedule && <Text style={styles.helper}>Choose a different date or time.</Text>}
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
            (!isComplete || bookingLoading) && { backgroundColor: colors.border },
          ]}
        >
          {bookingLoading ? (
            <ActivityIndicator size="small" color={colors.ink} />
          ) : (
            <Text style={styles.confirmText}>{isReschedule ? "Submit Request" : "Confirm Booking"}</Text>
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
              <Text style={styles.modalTitle}>{isReschedule ? "Submit Reschedule Request" : "Confirm Appointment"}</Text>
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
                  <Text style={styles.modalSubmitText}>{isReschedule ? "Submit Request" : "Confirm & Book"}</Text>
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
  bookingSection: {backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:16,padding:12,marginBottom:12},
  sectionTitle: {fontFamily:fonts.semiBold,fontSize:15,color:colors.accent},
  container: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 16, paddingBottom: 120 },
  label: { marginTop: 14, marginBottom: 6, fontFamily: fonts.medium, color: colors.ink },
  dropdown: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.surface,
  },
  dropdownText: { flex:1, marginRight:8, color: colors.ink, fontFamily: fonts.regular },
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
  calendarContainer: { marginTop: 4, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10, justifyContent: "space-between" },
  timeBtn: {
    width: "48%",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
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
  cancelBtn: { flex: 1, backgroundColor: colors.dangerSoft, padding: 16, borderRadius: 14, alignItems: "center" },
  cancelText: { fontFamily: fonts.semiBold, color: colors.ink },
  confirmBtn: {
    flex: 1,
    backgroundColor: colors.confirmedSoft,
    padding: 16,
    borderRadius: 14,
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
    padding: 16,
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
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
    marginBottom: 16,
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
    borderRadius: 14,
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
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSubmitText: {
    color: colors.ink,
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
});
