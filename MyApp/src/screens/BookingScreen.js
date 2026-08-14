import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Calendar } from "react-native-calendars";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader";
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
    {
      name: "Oral Prophylaxis",
      duration: 30,
      price: "Starts ₱500",
    },
    {
      name: "Restoration",
      duration: 60,
      price: "Starts ₱500",
    },
    {
      name: "Extraction",
      duration: 60,
      price: "Starts ₱700",
    },
  ],

  "Orthodontics (Braces, Veneers)": [
    {
      name: "Orthodontics Installation",
      duration: 60,
      price: "₱4,000 DP",
    },
    {
      name: "Orthodontics Adjustment",
      duration: 30,
      price: "₱1,000",
    },
    {
      name: "Veneers / Esthetics",
      duration: 120,
      price: "Starts ₱3,500",
    },
  ],

  "Restorative Treatments": [
    {
      name: "Root Canal Treatment",
      duration: 120,
      price: "Case to Case",
    },
    {
      name: "Wisdom Tooth Surgery",
      duration: 180,
      price: "Case to Case",
    },
    {
      name: "Dentures",
      duration: 30,
      price: "Case to Case",
    },
    {
      name: "Fixed Bridge",
      duration: 120,
      price: "Starts ₱3,500",
    },
    {
      name: "Whitening",
      duration: 90,
      price: "Case to Case",
    },
  ],
};

// ---------------------------------------------------------
// CLINIC TIME / OVERLAP LOGIC
// ---------------------------------------------------------

const generateClinicTimes = (
  selectedServiceDuration,
  takenTimes,
  selectedDate
) => {
  const isSunday = new Date(selectedDate).getDay() === 0;

  const start = 10 * 60; // 10:00 AM
  const end = isSunday ? 16 * 60 + 30 : 17 * 60; // Sunday 4:30 PM, Mon-Sat 5:00 PM

  const lunchStart = 12 * 60;
  const lunchEnd = 13 * 60;

  let slots = [];

  for (
    let t = start;
    t + selectedServiceDuration <= end;
    t += 30
  ) {
    // Skip lunch
    if (t >= lunchStart && t < lunchEnd) {
      continue;
    }

    // Do not create a slot that overlaps the lunch period
    if (
      t < lunchStart &&
      t + selectedServiceDuration > lunchStart
    ) {
      continue;
    }

    const hour = Math.floor(t / 60);
    const min = t % 60;

    const suffix = hour >= 12 ? "PM" : "AM";

    const displayHour =
      hour > 12
        ? hour - 12
        : hour === 0
        ? 12
        : hour;

    const label = `${displayHour
      .toString()
      .padStart(2, "0")}:${min
      .toString()
      .padStart(2, "0")} ${suffix}`;

    // Check if this slot overlaps an existing appointment
    const isOccupied = takenTimes.some((appt) => {
      if (!appt || !appt.time) {
        return false;
      }

      const [timePart, meridiem] = appt.time.split(" ");

      if (!timePart || !meridiem) {
        return false;
      }

      let [h, m] = timePart.split(":").map(Number);

      if (Number.isNaN(h) || Number.isNaN(m)) {
        return false;
      }

      if (meridiem === "PM" && h !== 12) {
        h += 12;
      }

      if (meridiem === "AM" && h === 12) {
        h = 0;
      }

      const apptStart = h * 60 + m;

      // Default appointment duration
      let apptDuration = 60;

      Object.values(SERVICE_CATEGORIES)
        .flat()
        .forEach((s) => {
          if (s.name === appt.service_type) {
            apptDuration = s.duration;
          }
        });

      const apptEnd = apptStart + apptDuration;

      const newServiceEnd =
        t + selectedServiceDuration;

      return (
        t < apptEnd &&
        newServiceEnd > apptStart
      );
    });

    slots.push({
      label,
      taken: isOccupied,
    });
  }

  return slots;
};

export default function BookingScreen({
  route,
  navigation,
}) {
  const rescheduleId =
    route?.params?.rescheduleId;

  const [userId, setUserId] = useState(null);
  const [branch, setBranch] = useState(null);
  const [category, setCategory] = useState(null);
  const [service, setService] = useState(null);
  const [dentist, setDentist] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);

  const [takenTimes, setTakenTimes] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // New state to prevent duplicate booking submissions
  const [bookingLoading, setBookingLoading] =
    useState(false);

  const [openDropdown, setOpenDropdown] =
    useState(null);

  // All booking fields must be selected
  const isComplete =
    branch &&
    category &&
    service &&
    dentist &&
    date &&
    time;

  const today = new Date();

  const minDateString =
    today.toISOString().split("T")[0];

  const maxDate = new Date();
  maxDate.setMonth(today.getMonth() + 3);

  const maxDateString =
    maxDate.toISOString().split("T")[0];

  // ---------------------------------------------------------
  // GET CURRENT USER ID
  // ---------------------------------------------------------

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const cachedUserData =
          await AsyncStorage.getItem("userData");

        if (cachedUserData) {
          const parsedUser =
            JSON.parse(cachedUserData);

          if (parsedUser && parsedUser.id) {
            setUserId(parsedUser.id);
            return;
          }
        }

        const userEmail =
          await AsyncStorage.getItem("userEmail");

        if (userEmail) {
          const response = await fetch(
            `${API_BASE_URL}/api/user-profile?email=${encodeURIComponent(
              userEmail
            )}`
          );

          const data = await response.json();

          if (response.ok && data.id) {
            setUserId(data.id);
          }
        }
      } catch (error) {
        console.error(
          "Failed to load user ID:",
          error
        );
      }
    };

    fetchUserId();
  }, []);

  // ---------------------------------------------------------
  // FETCH TAKEN TIMES
  // ---------------------------------------------------------

  const fetchTakenTimes = async (selectedDate) => {
    if (!selectedDate || !dentist) {
      setTakenTimes([]);
      return;
    }

    setLoadingSlots(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/booked-times?date=${encodeURIComponent(
          selectedDate
        )}&dentist=${encodeURIComponent(dentist)}`
      );

      const rawText = await response.text();

      let data = [];

      try {
        data = rawText ? JSON.parse(rawText) : [];
      } catch (error) {
        console.error(
          "Booked times JSON parse error:",
          error
        );
        data = [];
      }

      console.log("BOOKED TIMES RESPONSE:", {
        status: response.status,
        data,
      });

      if (response.ok && Array.isArray(data)) {
        setTakenTimes(data);
      } else {
        setTakenTimes([]);
      }
    } catch (error) {
      console.error(
        "FETCH TAKEN TIMES ERROR:",
        error
      );

      setTakenTimes([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // ---------------------------------------------------------
  // ACTUAL BOOKING REQUEST
  // ---------------------------------------------------------

  const submitBooking = async () => {
    if (bookingLoading) {
      return;
    }

    let currentUserId = userId;

    // Try to get the user ID again if it hasn't loaded yet
    if (!currentUserId) {
      try {
        const cachedUserData =
          await AsyncStorage.getItem("userData");

        if (cachedUserData) {
          const parsedUser =
            JSON.parse(cachedUserData);

          if (parsedUser?.id) {
            currentUserId = parsedUser.id;
          }
        }

        // Second fallback: retrieve user by email
        if (!currentUserId) {
          const userEmail =
            await AsyncStorage.getItem("userEmail");

          if (userEmail) {
            const profileResponse = await fetch(
              `${API_BASE_URL}/api/user-profile?email=${encodeURIComponent(
                userEmail
              )}`
            );

            const profileText =
              await profileResponse.text();

            let profileData = {};

            try {
              profileData = profileText
                ? JSON.parse(profileText)
                : {};
            } catch (error) {
              console.error(
                "Profile response parse error:",
                error
              );
            }

            if (
              profileResponse.ok &&
              profileData?.id
            ) {
              currentUserId = profileData.id;
              setUserId(profileData.id);
            }
          }
        }
      } catch (error) {
        console.error(
          "USER ID RESOLUTION ERROR:",
          error
        );
      }
    }

    // No user
    if (!currentUserId) {
      Alert.alert(
        "Session Error",
        "Could not identify your account. Please log out and log back in."
      );
      return;
    }

    // Make sure the booking data is valid
    if (
      !service?.name ||
      !dentist ||
      !date ||
      !time ||
      !branch
    ) {
      Alert.alert(
        "Incomplete Booking",
        "Please select the branch, service, dentist, date, and time."
      );
      return;
    }

    const payload = {
      user_id: currentUserId,
      service_type: service.name,
      dentist_name: dentist,
      appointment_date: date,
      appointment_time: time,
      branch: branch,
    };

    console.log(
      "===================================="
    );
    console.log("BOOKING REQUEST");
    console.log("API:", `${API_BASE_URL}/api/book-appointment`);
    console.log("PAYLOAD:", payload);
    console.log(
      "===================================="
    );

    setBookingLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/book-appointment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      // Read as text first so we can handle
      // non-JSON responses too.
      const rawText = await response.text();

      let resData = {};

      try {
        resData = rawText
          ? JSON.parse(rawText)
          : {};
      } catch (parseError) {
        console.error(
          "BOOKING RESPONSE JSON PARSE ERROR:",
          parseError
        );

        resData = {
          message:
            rawText ||
            "Invalid response from server.",
        };
      }

      console.log(
        "===================================="
      );
      console.log(
        "BOOKING RESPONSE STATUS:",
        response.status
      );
      console.log(
        "BOOKING RESPONSE DATA:",
        resData
      );
      console.log(
        "===================================="
      );

      if (!response.ok) {
        throw new Error(
          resData?.message ||
            `Booking failed with status ${response.status}`
        );
      }

      // If rescheduling, mark the old appointment
      // as rescheduled
      if (rescheduleId) {
        try {
          const rescheduleResponse =
            await fetch(
              `${API_BASE_URL}/api/update-appointment-status`,
              {
                method: "PUT",
                headers: {
                  "Content-Type":
                    "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({
                  appointment_id:
                    rescheduleId,
                  status: "Rescheduled",
                }),
              }
            );

          if (!rescheduleResponse.ok) {
            const rescheduleText =
              await rescheduleResponse.text();

            console.warn(
              "RESCHEDULE STATUS UPDATE FAILED:",
              rescheduleResponse.status,
              rescheduleText
            );
          }
        } catch (rescheduleError) {
          console.warn(
            "RESCHEDULE STATUS UPDATE ERROR:",
            rescheduleError
          );
        }
      }

      const bookingReference =
        resData?.booking_ref || "N/A";

      Alert.alert(
        "Success!",
        `Appointment booked successfully.\n\nReference: ${bookingReference}`,
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error(
        "===================================="
      );
      console.error("BOOKING ERROR:", error);
      console.error(
        "===================================="
      );

      Alert.alert(
        "Booking Failed",
        error?.message ||
          "Unable to connect to the booking server."
      );
    } finally {
      setBookingLoading(false);
    }
  };

  // ---------------------------------------------------------
  // CONFIRM BOOKING
  // ---------------------------------------------------------

  const handleConfirmBooking = async () => {
    if (!isComplete || bookingLoading) {
      return;
    }

    const message =
      `Service: ${service.name}\n` +
      `Dentist: ${dentist}\n` +
      `Branch: ${branch}\n` +
      `Date: ${date}\n` +
      `Time: ${time}`;

    /*
     * Expo Web:
     * Use window.confirm() instead of Alert.action
     * because confirmation behavior is more reliable
     * on React Native Web.
     */
    if (Platform.OS === "web") {
      let confirmed = true;

      if (
        typeof window !== "undefined" &&
        typeof window.confirm === "function"
      ) {
        confirmed = window.confirm(
          `Confirm Appointment?\n\n${message}`
        );
      }

      if (confirmed) {
        await submitBooking();
      }

      return;
    }

    /*
     * Android / iOS:
     * Use React Native's Alert.
     */
    Alert.alert(
      "Confirm Appointment?",
      message,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: submitBooking,
        },
      ]
    );
  };

  // ---------------------------------------------------------
  // AVAILABLE TIMES
  // ---------------------------------------------------------

  const availableTimes = useMemo(() => {
    if (!service || !date) {
      return [];
    }

    return generateClinicTimes(
      service.duration,
      takenTimes,
      date
    );
  }, [service, date, takenTimes]);

  // ---------------------------------------------------------
  // MARKED DATES
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Book Appointment"
        showBack={true}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* BRANCH */}
        <Text style={styles.label}>
          Select Branch
        </Text>

        <TouchableOpacity
          style={styles.dropdown}
          onPress={() =>
            setOpenDropdown(
              openDropdown === "branch"
                ? null
                : "branch"
            )
          }
        >
          <View style={styles.dropdownRow}>
            <Text style={styles.dropdownText}>
              {branch ||
                "Choose a clinic branch"}
            </Text>

            <Ionicons
              name="chevron-down"
              size={18}
              color="#6B7280"
            />
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
                <Text style={styles.itemText}>
                  {b}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* CATEGORY */}
        <Text style={styles.label}>
          Select Category
        </Text>

        <TouchableOpacity
          style={styles.dropdown}
          onPress={() =>
            setOpenDropdown(
              openDropdown === "cat"
                ? null
                : "cat"
            )
          }
        >
          <View style={styles.dropdownRow}>
            <Text style={styles.dropdownText}>
              {category ||
                "Choose a category"}
            </Text>

            <Ionicons
              name="chevron-down"
              size={18}
              color="#6B7280"
            />
          </View>
        </TouchableOpacity>

        {openDropdown === "cat" && (
          <View style={styles.dropdownList}>
            {Object.keys(
              SERVICE_CATEGORIES
            ).map((c) => (
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
                <Text style={styles.itemText}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* SERVICE */}
        {category && (
          <>
            <Text style={styles.label}>
              Choose Service
            </Text>

            <TouchableOpacity
              style={styles.dropdown}
              onPress={() =>
                setOpenDropdown(
                  openDropdown === "srv"
                    ? null
                    : "srv"
                )
              }
            >
              <View style={styles.dropdownRow}>
                <Text
                  style={styles.dropdownText}
                >
                  {service
                    ? `${service.name} • ${service.price} (${service.duration / 60}hr)`
                    : "Choose service"}
                </Text>

                <Ionicons
                  name="chevron-down"
                  size={18}
                  color="#6B7280"
                />
              </View>
            </TouchableOpacity>

            {openDropdown === "srv" && (
              <View style={styles.dropdownList}>
                {SERVICE_CATEGORIES[
                  category
                ].map((s) => (
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
                    <Text
                      style={styles.itemText}
                    >
                      {s.name} • {s.price} (
                      {(s.duration / 60)
                        .toFixed(1)
                        .replace(".0", "")}
                      hr)
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View
              style={{
                flexDirection: "row",
                marginTop: 10,
                paddingHorizontal: 6,
                alignItems: "flex-start",
              }}
            >
              <Ionicons
                name="information-circle"
                size={15}
                color="#001166"
                style={{
                  marginRight: 6,
                  marginTop: 1,
                }}
              />

              <Text
                style={{
                  fontSize: 11,
                  color: "#6B7280",
                  fontFamily: fonts.medium,
                  flex: 1,
                  lineHeight: 16,
                }}
              >
                Prices marked as "Case to Case" or
                "Starts at" depend on the severity
                of the tooth or materials used.
                Final costs are determined during
                consultation.
              </Text>
            </View>
          </>
        )}

        {/* DENTIST */}
        <Text style={styles.label}>
          Available Dentist
        </Text>

        {!branch ? (
          <Text style={styles.helper}>
            Please select a branch first
          </Text>
        ) : (
          <>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() =>
                setOpenDropdown(
                  openDropdown === "den"
                    ? null
                    : "den"
                )
              }
            >
              <View style={styles.dropdownRow}>
                <Text
                  style={styles.dropdownText}
                >
                  {dentist ||
                    "Choose a dentist"}
                </Text>

                <Ionicons
                  name="chevron-down"
                  size={18}
                  color="#6B7280"
                />
              </View>
            </TouchableOpacity>

            {openDropdown === "den" && (
              <View style={styles.dropdownList}>
                {DENTISTS_BY_BRANCH[
                  branch
                ]?.map((d) => (
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
                    <Text
                      style={styles.itemText}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* DATE */}
        <Text style={styles.label}>
          Available Date
        </Text>

        {!dentist ? (
          <Text style={styles.helper}>
            Please select a dentist first
          </Text>
        ) : (
          <View style={styles.calendarContainer}>
            <Calendar
              minDate={minDateString}
              maxDate={maxDateString}
              onDayPress={(day) => {
                setDate(day.dateString);
                setTime(null);
                fetchTakenTimes(
                  day.dateString
                );
              }}
              markedDates={markedDates}
              theme={{
                todayTextColor: "#001166",
                arrowColor: "#001166",
                selectedDayBackgroundColor:
                  "#001166",
              }}
            />
          </View>
        )}

        {/* TIME */}
        {date && (
          <>
            <Text style={styles.label}>
              Choose Time
            </Text>

            {loadingSlots ? (
              <ActivityIndicator
                size="small"
                color="#001166"
              />
            ) : (
              <View style={styles.timeGrid}>
                {availableTimes.map((t) => (
                  <TouchableOpacity
                    key={t.label}
                    disabled={t.taken}
                    style={[
                      styles.timeBtn,
                      t.taken &&
                        styles.timeDisabled,
                      time === t.label &&
                        styles.timeSelected,
                    ]}
                    onPress={() =>
                      setTime(t.label)
                    }
                  >
                    <Text
                      style={[
                        styles.timeText,
                        t.taken &&
                          styles.timeTextDisabled,
                        time === t.label &&
                          styles.timeTextSelected,
                      ]}
                    >
                      {t.label}{" "}
                      {t.taken
                        ? "(Occupied)"
                        : ""}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* BOTTOM BUTTONS */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={bookingLoading}
        >
          <Text style={styles.cancelText}>
            Cancel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={
            !isComplete || bookingLoading
          }
          onPress={handleConfirmBooking}
          style={[
            styles.confirmBtn,
            (!isComplete || bookingLoading) && {
              backgroundColor: "#9CA3AF",
            },
          ]}
        >
          {bookingLoading ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Text style={styles.confirmText}>
              Confirm Booking
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------
// STYLES
// ---------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  content: {
    padding: 16,
    paddingBottom: 120,
  },

  label: {
    marginTop: 14,
    marginBottom: 6,
    fontFamily: fonts.medium,
  },

  dropdown: {
    borderWidth: 1.5,
    borderColor: "#9CA3AF",
    borderRadius: 999,
    padding: 16,
  },

  dropdownText: {
    color: "#374151",
  },

  dropdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dropdownList: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    marginTop: 6,
  },

  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },

  itemText: {
    fontFamily: fonts.medium,
    color: "#374151",
  },

  helper: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 10,
    fontFamily: fonts.medium,
  },

  calendarContainer: {
    marginTop: 4,
    borderRadius: 12,
    overflow: "hidden",
  },

  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
    justifyContent: "space-between",
  },

  timeBtn: {
    width: "48%",
    borderWidth: 1.5,
    borderColor: "#9CA3AF",
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },

  timeSelected: {
    backgroundColor: "#001166",
    borderColor: "#001166",
  },

  timeText: {
    color: "#374151",
    fontFamily: fonts.medium,
    fontSize: 13,
  },

  timeTextSelected: {
    color: "#FFFFFF",
  },

  timeDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
    opacity: 0.7,
  },

  timeTextDisabled: {
    color: "#9CA3AF",
  },

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

  cancelBtn: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    padding: 16,
    borderRadius: 999,
    alignItems: "center",
  },

  cancelText: {
    fontFamily: fonts.semiBold,
    color: "#374151",
  },

  confirmBtn: {
    flex: 1,
    backgroundColor: "#001166",
    padding: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },

  confirmText: {
    color: "#FFFFFF",
    fontFamily: fonts.semiBold,
  },
});