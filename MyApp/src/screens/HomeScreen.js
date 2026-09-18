import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import { API_BASE_URL } from "../config/config";
import CustomAlertModal from "../components/CustomAlertModal";

export default function HomeScreen({ navigation }) {
  const [userData, setUserData] = useState({ id: null, firstName: "User", branch: "Main Branch" });
  const [upcomingAppt, setUpcomingAppt] = useState(null);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [selectedCancelNotif, setSelectedCancelNotif] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Custom Alert state
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
    onPrimaryPress: () => {},
  });

  // Load user session
  const loadUser = useCallback(async () => {
    try {
      let activeId = null;

      const stored = await AsyncStorage.getItem("userData");
      if (stored) {
        const parsed = JSON.parse(stored);
        activeId = parsed.id || parsed.user_id;
        setUserData({
          id: activeId,
          firstName: parsed.firstName || parsed.first_name || "User",
          branch: parsed.branch || "Gil Puyat, Pasay",
        });
      }

      if (!activeId) {
        const email = await AsyncStorage.getItem("userEmail");
        if (email) {
          const res = await fetch(`${API_BASE_URL}/api/user-profile?email=${encodeURIComponent(email)}`);
          if (res.ok) {
            const profile = await res.json();
            activeId = profile.id;
            setUserData({
              id: profile.id,
              firstName: profile.first_name || profile.firstName || "User",
              branch: profile.branch || "Gil Puyat, Pasay",
            });
            await AsyncStorage.setItem("userData", JSON.stringify(profile));
          }
        }
      }

      return activeId;
    } catch (e) {
      console.log("Error reading stored user:", e);
    }
    return null;
  }, []);

  // Fetch appointments for upcoming card & history
  const fetchAppointments = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/user-appointments/${userId}`);
      if (res.ok) {
        const data = await res.json();
        const appts = Array.isArray(data) ? data : data.appointments || [];
        setRecentAppointments(appts.slice(0, 5));

        const upcoming = appts.find((a) =>
          ["pending", "approved", "confirmed"].includes((a.status || "").toLowerCase())
        );
        setUpcomingAppt(upcoming || null);
      }
    } catch (err) {
      console.log("Failed to fetch appointments on Home:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Notifications (declared only once)
  const fetchNotifications = useCallback(async (userId) => {
    if (!userId) return;
    setNotifLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.log("Failed to fetch notifications:", err);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  // Sync on screen focus
  useFocusEffect(
    useCallback(() => {
      let activeUserId = null;
      loadUser().then((id) => {
        activeUserId = id;
        if (id) {
          fetchAppointments(id);
          fetchNotifications(id);
        }
      });

      const interval = setInterval(() => {
        if (activeUserId) fetchNotifications(activeUserId);
      }, 15000);

      return () => clearInterval(interval);
    }, [loadUser, fetchAppointments, fetchNotifications])
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    if (!userData.id) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userData.id }),
      });
    } catch (e) {
      console.log("Failed to mark notification read:", e);
    }
  };

  // Handle Late/No-Show Reschedule Click
  const handleLateNoShowReschedule = async (notif) => {
    await markAsRead(notif.id);
    setShowNotificationModal(false);

    const targetAppt = recentAppointments.find(
      (a) => String(a.id) === String(notif.appointment_id)
    );

    navigation.navigate("Booking", {
      mode: "reschedule",
      rescheduleId: notif.appointment_id,
      currentDentist: targetAppt?.dentist_name || "",
      currentService: targetAppt?.service_type || "",
    });
  };

  // Handle Late/No-Show Cancel Click
  const handleConfirmCancelLateAppt = async () => {
    if (!selectedCancelNotif || !userData.id) return;
    setShowCancelModal(false);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/appointments/${selectedCancelNotif.appointment_id}/cancel`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userData.id }),
        }
      );

      if (res.ok) {
        await markAsRead(selectedCancelNotif.id);
        fetchAppointments(userData.id);
        fetchNotifications(userData.id);
        setAlertConfig({
          visible: true,
          type: "success",
          title: "Appointment Cancelled",
          message: "Your late/no-show appointment has been cancelled successfully.",
          onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
        });
      } else {
        const errorData = await res.json().catch(() => ({}));
        setAlertConfig({
          visible: true,
          type: "error",
          title: "Cancellation Failed",
          message: errorData.message || "Unable to cancel appointment right now.",
          onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
        });
      }
    } catch (err) {
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Connection Error",
        message: "Network error while cancelling appointment.",
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setSelectedCancelNotif(null);
    }
  };

  const renderNotificationItem = ({ item }) => {
    const isLateNoShow = item.notification_type === "appointment_late_no_show";

    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.is_read && styles.notifCardUnread]}
        onPress={() => {
          if (!item.is_read) markAsRead(item.id);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.notifHeaderRow}>
          <View style={styles.notifTitleGroup}>
            {!item.is_read && <View style={styles.unreadDot} />}
            <Text style={styles.notifTitle}>{item.title}</Text>
          </View>
          <Text style={styles.notifTime}>
            {item.created_at
              ? new Date(item.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              : "Recent"}
          </Text>
        </View>

        <Text style={styles.notifMessage}>{item.message}</Text>

        {isLateNoShow && (
          <View style={styles.notifActionRow}>
            <TouchableOpacity
              style={styles.notifCancelBtn}
              onPress={() => {
                setSelectedCancelNotif(item);
                setShowCancelModal(true);
              }}
            >
              <Text style={styles.notifCancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.notifRescheduleBtn}
              onPress={() => handleLateNoShowReschedule(item)}
            >
              <Text style={styles.notifRescheduleBtnText}>Reschedule</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeSubtitle}>Mabuhay,</Text>
          <Text style={styles.welcomeTitle}>{userData.firstName}</Text>
          <Text style={styles.branchSubtitle}>
            <Ionicons name="location-outline" size={12} color="#C7D2FF" />{" "}
            {userData.branch}
          </Text>
        </View>

        {/* Bell Notification Icon with Unread Red Badge */}
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => {
            setShowNotificationModal(true);
            if (userData.id) fetchNotifications(userData.id);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              if (userData.id) {
                fetchAppointments(userData.id);
                fetchNotifications(userData.id);
              }
            }}
            colors={["#001166"]}
          />
        }
      >
        {/* Upcoming Appointment Card */}
        <Text style={styles.sectionHeader}>Upcoming Appointment</Text>
        <View style={styles.upcomingCard}>
          {upcomingAppt ? (
            <View>
              <View style={styles.cardHeaderRow}>
                <View style={styles.badgeUpcoming}>
                  <Text style={styles.badgeUpcomingText}>{upcomingAppt.status}</Text>
                </View>
                <Text style={styles.upcomingPrice}>
                  ₱{Number(upcomingAppt.base_price || upcomingAppt.amount || 0).toLocaleString()}
                </Text>
              </View>
              <Text style={styles.upcomingService}>{upcomingAppt.service_type}</Text>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={15} color="#C7D2FF" />
                <Text style={styles.detailText}>
                  {new Date(upcomingAppt.appointment_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  • {upcomingAppt.appointment_time}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={15} color="#C7D2FF" />
                <Text style={styles.detailText}>{upcomingAppt.dentist_name}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-clear-outline" size={36} color="#9CA3AF" />
              <Text style={styles.emptyUpcomingText}>No upcoming appointments scheduled.</Text>
              <TouchableOpacity
                style={styles.bookShortcutBtn}
                onPress={() => navigation.navigate("Appointments")}
              >
                <Text style={styles.bookShortcutBtnText}>Book Appointment</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionHeader}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Booking")}
          >
            <View style={[styles.actionIconBox, { backgroundColor: "#EEF2FF" }]}>
              <Ionicons name="calendar" size={24} color="#001166" />
            </View>
            <Text style={styles.actionCardTitle}>Book Visit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Appointments")}
          >
            <View style={[styles.actionIconBox, { backgroundColor: "#ECFDF5" }]}>
              <Ionicons name="time" size={24} color="#059669" />
            </View>
            <Text style={styles.actionCardTitle}>My Visits</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Profile", { screen: "Billings" })}
          >
            <View style={[styles.actionIconBox, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="wallet" size={24} color="#D97706" />
            </View>
            <Text style={styles.actionCardTitle}>Billings</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Appointments */}
        <View style={styles.recentHeaderRow}>
          <Text style={styles.sectionHeader}>Recent Activity</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Appointments")}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {recentAppointments.length === 0 ? (
          <Text style={styles.emptyListText}>No past history found.</Text>
        ) : (
          recentAppointments.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyService}>{item.service_type}</Text>
                <Text style={styles.historySub}>
                  {new Date(item.appointment_date).toLocaleDateString()} • {item.dentist_name}
                </Text>
              </View>
              <View
                style={[
                  styles.statusTag,
                  (item.status || "").toLowerCase() === "confirmed"
                    ? styles.tagConfirmed
                    : (item.status || "").toLowerCase() === "cancelled"
                    ? styles.tagCancelled
                    : styles.tagPending,
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    (item.status || "").toLowerCase() === "confirmed"
                      ? styles.tagTextConfirmed
                      : (item.status || "").toLowerCase() === "cancelled"
                      ? styles.tagTextCancelled
                      : styles.tagTextPending,
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* 🔔 NOTIFICATIONS MODAL */}
      <Modal
        visible={showNotificationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="notifications" size={22} color="#001166" />
                <Text style={styles.modalTitle}>Notifications</Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadCountBadge}>
                    <Text style={styles.unreadCountBadgeText}>{unreadCount} new</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowNotificationModal(false)}
              >
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {notifLoading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color="#001166" />
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderNotificationItem}
                contentContainerStyle={{ paddingBottom: 24 }}
                ListEmptyComponent={
                  <View style={styles.emptyNotifBox}>
                    <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyNotifText}>You have no notifications.</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Cancellation Dialog */}
      <CustomAlertModal
        visible={showCancelModal}
        type="warning"
        title="Cancel Appointment?"
        message="Are you sure you want to cancel this late/no-show appointment?"
        primaryText="Yes, Cancel"
        secondaryText="Keep It"
        onPrimaryPress={handleConfirmCancelLateAppt}
        onSecondaryPress={() => {
          setShowCancelModal(false);
          setSelectedCancelNotif(null);
        }}
      />

      {/* Feedback Dialog */}
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
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    backgroundColor: "#001166",
    paddingTop: Platform.OS === "ios" ? 55 : 45,
    paddingBottom: 25,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 5,
  },
  welcomeSubtitle: { fontFamily: fonts.regular, fontSize: 13, color: "#C7D2FF" },
  welcomeTitle: { fontFamily: fonts.bold, fontSize: 24, color: "#FFFFFF", marginTop: -2 },
  branchSubtitle: { fontFamily: fonts.medium, fontSize: 12, color: "#C7D2FF", marginTop: 4 },
  bellButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#001166",
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontFamily: fonts.bold },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionHeader: { fontFamily: fonts.bold, fontSize: 16, color: "#111827", marginBottom: 12 },
  upcomingCard: {
    backgroundColor: "#001166",
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badgeUpcoming: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeUpcomingText: { color: "#FFFFFF", fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase" },
  upcomingPrice: { color: "#34D399", fontFamily: fonts.bold, fontSize: 16 },
  upcomingService: { color: "#FFFFFF", fontFamily: fonts.bold, fontSize: 19, marginVertical: 10 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  detailText: { color: "#C7D2FF", fontFamily: fonts.medium, fontSize: 13 },
  emptyCard: { alignItems: "center", paddingVertical: 20 },
  emptyUpcomingText: { color: "#E5E7EB", fontFamily: fonts.regular, fontSize: 13, marginTop: 8 },
  bookShortcutBtn: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
  },
  bookShortcutBtnText: { color: "#001166", fontFamily: fonts.bold, fontSize: 12 },
  actionGrid: { flexDirection: "row", gap: 12, marginBottom: 24 },
  actionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
  },
  actionIconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  actionCardTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: "#111827" },
  recentHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  viewAllText: { color: "#001166", fontFamily: fonts.bold, fontSize: 13 },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  historyService: { fontFamily: fonts.semiBold, fontSize: 15, color: "#111827" },
  historySub: { fontFamily: fonts.regular, fontSize: 12, color: "#6B7280", marginTop: 2 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusTagText: { fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase" },
  tagConfirmed: { backgroundColor: "#D1FAE5" },
  tagTextConfirmed: { color: "#065F46" },
  tagPending: { backgroundColor: "#FEF3C7" },
  tagTextPending: { color: "#92400E" },
  tagCancelled: { backgroundColor: "#FEE2E2" },
  tagTextCancelled: { color: "#991B1B" },
  emptyListText: { textAlign: "center", color: "#9CA3AF", fontFamily: fonts.regular, marginVertical: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: "80%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: { fontSize: 18, fontFamily: fonts.bold, color: "#001166" },
  modalCloseBtn: { padding: 4 },
  unreadCountBadge: { backgroundColor: "#FEE2E2", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  unreadCountBadgeText: { color: "#DC2626", fontSize: 11, fontFamily: fonts.bold },
  centerBox: { padding: 30, alignItems: "center" },
  notifCard: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  notifCardUnread: {
    backgroundColor: "#F0F4FF",
    borderColor: "#C7D2FF",
  },
  notifHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  notifTitleGroup: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#001166" },
  notifTitle: { fontSize: 14, fontFamily: fonts.bold, color: "#001166" },
  notifTime: { fontSize: 11, fontFamily: fonts.regular, color: "#9CA3AF" },
  notifMessage: { fontSize: 13, fontFamily: fonts.regular, color: "#4B5563", lineHeight: 18 },
  notifActionRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  notifCancelBtn: {
    backgroundColor: "#DC2626",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  notifCancelBtnText: { color: "#FFFFFF", fontFamily: fonts.bold, fontSize: 12 },
  notifRescheduleBtn: {
    backgroundColor: "#001166",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  notifRescheduleBtnText: { color: "#FFFFFF", fontFamily: fonts.bold, fontSize: 12 },
  emptyNotifBox: { alignItems: "center", paddingVertical: 40 },
  emptyNotifText: { color: "#9CA3AF", fontFamily: fonts.medium, fontSize: 14, marginTop: 10 },
});