import { fileUrl, requestJson, requireArray, nextAppointment, money, displayDate } from '../utils/patientData';
import LoadError from '../components/LoadError';
import BrandLogo from '../components/BrandLogo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
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
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import { API_BASE_URL } from "../config/config";
import CustomAlertModal from "../components/CustomAlertModal";

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [userData, setUserData] = useState({ id: null, firstName: "User", branch: "Main Branch" });
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [upcomingAppt, setUpcomingAppt] = useState(null);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notifError, setNotifError] = useState('');

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
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
      setAvatarFailed(false);

      const stored = await AsyncStorage.getItem("userData");
      if (stored) {
        const parsed = JSON.parse(stored);
        activeId = parsed.id || parsed.user_id;
        setUserData({
          ...parsed,
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
              ...profile,
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
    setLoadError('');
    try {
      if (!userId) throw new Error('Could not identify your account. Please log in again.');
      const data = await requestJson(`${API_BASE_URL}/api/user-appointments/${userId}`);
      const appts = requireArray(data, 'appointments');
      setRecentAppointments(appts.slice(0, 5));
      setUpcomingAppt(nextAppointment(appts));
    } catch (error) { setLoadError(error.message || 'Unable to load appointments.'); }
    finally { setLoading(false); }
  }, []);

  const fetchNotifications = useCallback(async (userId) => {
    if (!userId) return;
    setNotifLoading(true);
    setNotifError('');
    try {
      const data = await requestJson(`${API_BASE_URL}/api/notifications/${userId}`);
      setNotifications(requireArray(data));
    } catch (error) { setNotifError(error.message || 'Unable to load notifications.'); }
    finally { setNotifLoading(false); }
  }, []);

  // Sync on screen focus
  useFocusEffect(
    useCallback(() => {
      let activeUserId = null;
      loadUser().then((id) => {
        activeUserId = id;
        fetchAppointments(id);
        if (id) fetchNotifications(id);
      });

      const interval = setInterval(() => {
        if (activeUserId) fetchNotifications(activeUserId);
      }, 15000);

      return () => clearInterval(interval);
    }, [loadUser, fetchAppointments, fetchNotifications])
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Mark single notification as read
  const markAsRead = async (notificationId) => {
    if (!userData.id) return;
    try {
      await requestJson(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userData.id }),
      });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    } catch { setNotifError('Could not mark the notification as read. Please try again.'); }
  };

  const markAllAsRead = async () => {
    if (!userData.id || unreadCount === 0 || isMarkingAllRead) return;
    setIsMarkingAllRead(true);
    setNotifError('');
    try {
      await Promise.all(notifications.filter(n => !n.is_read).map(n => markAsRead(n.id)));
    } finally { setIsMarkingAllRead(false); }
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
      <View style={[styles.notifCard, !item.is_read && styles.notifCardUnread]}>
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

        {/* Action Row */}
        <View style={styles.notifFooterRow}>
          {isLateNoShow && (
            <View style={styles.notifActionRow}>
              <TouchableOpacity accessibilityRole="button"
                style={styles.notifCancelBtn}
                onPress={() => {
                  setSelectedCancelNotif(item);
                  setShowCancelModal(true);
                }}
              >
                <Text style={styles.notifCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity accessibilityRole="button"
                style={styles.notifRescheduleBtn}
                onPress={() => handleLateNoShowReschedule(item)}
              >
                <Text style={styles.notifRescheduleBtnText}>Reschedule</Text>
              </TouchableOpacity>
            </View>
          )}

          {!item.is_read && (
            <TouchableOpacity accessibilityRole="button"
              style={styles.markReadSingleBtn}
              onPress={() => markAsRead(item.id)}
            >
              <Ionicons name="checkmark-outline" size={14} color={colors.accent} />
              <Text style={styles.markReadSingleText}>Mark as read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenBackground />
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20, overflow: "hidden" }]}><ScreenBackground header />
        <View style={{ flex: 1 }}>
          <BrandLogo width={128} style={{ marginBottom: 12 }} />
          <Text style={styles.welcomeSubtitle}>Mabuhay,</Text>
          <Text style={styles.welcomeTitle}>{userData.firstName}</Text>
          <Text style={styles.branchSubtitle}>
            <Ionicons name="location-outline" size={12} color={colors.muted} />{" "}
            {userData.branch}
          </Text>
        </View>

        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open your profile" onPress={() => navigation.navigate('Profile', { screen: 'ProfileMain' })} style={styles.homeAvatar}>
          {!avatarFailed && fileUrl(userData.profile_picture || userData.profile_pic || userData.profile_image || userData.profileImage, API_BASE_URL)
            ? <Image source={{ uri: fileUrl(userData.profile_picture || userData.profile_pic || userData.profile_image || userData.profileImage, API_BASE_URL) }} style={styles.homeAvatarImage} onError={() => setAvatarFailed(true)} />
            : <Ionicons name="person" size={25} color={colors.accent} />}
        </TouchableOpacity>
        {/* Bell Notification Icon with Unread Red Badge */}
        <TouchableOpacity accessibilityRole="button"
          accessibilityLabel="Open notifications" style={styles.bellButton}
          onPress={() => {
            setShowNotificationModal(true);
            if (userData.id) fetchNotifications(userData.id);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.ink} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              if (userData.id) {
                setLoading(true);
                fetchAppointments(userData.id);
                fetchNotifications(userData.id);
              }
            }}
            colors={[colors.accent]}
          />
        }
      >
        {/* Upcoming Appointment Card */}
        <Text style={styles.sectionHeader}>Upcoming Appointment</Text>
        <View style={styles.upcomingCard}>
          {loading ? <ActivityIndicator color={colors.accent} /> : loadError ? (<LoadError message={loadError} onRetry={() => fetchAppointments(userData.id)} />) : upcomingAppt ? (
            <View>
              <View style={styles.cardHeaderRow}>
                <View style={styles.badgeUpcoming}>
                  <Text style={styles.badgeUpcomingText}>{upcomingAppt.status}</Text>
                </View>
                <Text style={styles.upcomingPrice}>
                  {money(upcomingAppt.amount ?? upcomingAppt.base_price)}
                </Text>
              </View>
              <Text style={styles.upcomingService}>{upcomingAppt.service_type}</Text>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={15} color={colors.muted} />
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
                <Ionicons name="person-outline" size={15} color={colors.muted} />
                <Text style={styles.detailText}>{upcomingAppt.dentist_name}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-clear-outline" size={36} color={colors.muted} />
              <Text style={styles.emptyUpcomingText}>No upcoming appointments scheduled.</Text>
              <TouchableOpacity accessibilityRole="button"
                style={styles.bookShortcutBtn}
                onPress={() => navigation.navigate("Booking")}
              >
                <Text style={styles.bookShortcutBtnText}>Book Appointment</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionHeader}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity accessibilityRole="button"
            style={styles.actionCard}
            onPress={() => navigation.navigate("Booking")}
          >
            <View style={[styles.actionIconBox, { backgroundColor: colors.lavender }]}>
              <Ionicons name="calendar" size={24} color={colors.accent} />
            </View>
            <Text style={styles.actionCardTitle}>Book Visit</Text>
          </TouchableOpacity>

          <TouchableOpacity accessibilityRole="button"
            style={styles.actionCard}
            onPress={() => navigation.navigate("Appointments")}
          >
            <View style={[styles.actionIconBox, { backgroundColor: "#ECFDF5" }]}>
              <Ionicons name="time" size={24} color="#059669" />
            </View>
            <Text style={styles.actionCardTitle}>My Visits</Text>
          </TouchableOpacity>

          <TouchableOpacity accessibilityRole="button"
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
          <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate("Appointments")}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {loading || loadError ? null : recentAppointments.length === 0 ? (
          <Text style={styles.emptyListText}>No appointment activity yet.</Text>
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
                  (item.status || "").toLowerCase() === "completed"
                    ? styles.tagCompleted
                    : (item.status || "").toLowerCase() === "confirmed"
                    ? styles.tagConfirmed
                    : (item.status || "").toLowerCase() === "cancelled"
                    ? styles.tagCancelled
                    : styles.tagPending,
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    (item.status || "").toLowerCase() === "completed"
                      ? styles.tagTextCompleted
                      : (item.status || "").toLowerCase() === "confirmed"
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
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <Ionicons name="notifications" size={22} color={colors.accent} />
                <Text style={styles.modalTitle}>Notifications</Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadCountBadge}>
                    <Text style={styles.unreadCountBadgeText}>{unreadCount} new</Text>
                  </View>
                )}
              </View>

              {unreadCount > 0 && (
                <TouchableOpacity accessibilityRole="button"
                  style={styles.markAllReadBtn}
                  onPress={markAllAsRead}
                  disabled={isMarkingAllRead}
                >
                  <Ionicons name="checkmark-done" size={16} color={colors.accent} />
                  <Text style={styles.markAllReadText}>Mark all as read</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity accessibilityLabel="Close" hitSlop={8} accessibilityRole="button"
                style={styles.modalCloseBtn}
                onPress={() => setShowNotificationModal(false)}
              >
                <Ionicons name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {notifLoading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : notifError ? (<LoadError message={notifError} onRetry={() => fetchNotifications(userData.id)} />) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderNotificationItem}
                contentContainerStyle={{ paddingBottom: 24 }}
                ListEmptyComponent={
                  <View style={styles.emptyNotifBox}>
                    <Ionicons name="notifications-off-outline" size={48} color={colors.muted} />
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
  homeAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center", marginRight: 10, overflow: "hidden" },
  homeAvatarImage: { width: "100%", height: "100%" },
  container: { flex: 1, backgroundColor: colors.canvas },
  header: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === "ios" ? 55 : 45,
    paddingBottom: 25,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 3,
  },
  welcomeSubtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  welcomeTitle: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink, marginTop: -2 },
  branchSubtitle: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 4 },
  bellButton: {
    width: 46,
    height: 46,
    borderRadius: 999,
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
    borderColor: colors.accent,
  },
  badgeText: { color: colors.white, fontSize: 10, fontFamily: fonts.bold },
  scrollContent: { padding: 20, paddingBottom: 40 , maxWidth: 680, width: '100%', alignSelf: 'center' },
  sectionHeader: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink, marginBottom: 12 },
  upcomingCard: {
    backgroundColor: colors.primary,
    borderRadius: 28,
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
  badgeUpcomingText: { color: colors.ink, fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase" },
  upcomingPrice: { color: colors.ink, fontFamily: fonts.bold, fontSize: 16 },
  upcomingService: { color: colors.ink, fontFamily: fonts.bold, fontSize: 19, marginVertical: 10 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  detailText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13 },
  emptyCard: { alignItems: "center", paddingVertical: 20 },
  emptyUpcomingText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, marginTop: 8 },
  bookShortcutBtn: {
    marginTop: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
  },
  bookShortcutBtnText: { color: colors.accent, fontFamily: fonts.bold, fontSize: 12 },
  actionGrid: { flexDirection: "row", gap: 12, marginBottom: 24 },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
  },
  actionIconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  actionCardTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.ink },
  recentHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  viewAllText: { color: colors.accent, fontFamily: fonts.bold, fontSize: 13 },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyService: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.ink },
  historySub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusTagText: { fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase" },
  tagCompleted: { backgroundColor: colors.completedSoft },
  tagTextCompleted: { color: colors.completed },
  tagConfirmed: { backgroundColor: "#D1FAE5" },
  tagTextConfirmed: { color: "#065F46" },
  tagPending: { backgroundColor: "#FEF3C7" },
  tagTextPending: { color: "#92400E" },
  tagCancelled: { backgroundColor: "#FEE2E2" },
  tagTextCancelled: { color: "#991B1B" },
  emptyListText: { textAlign: "center", color: colors.muted, fontFamily: fonts.regular, marginVertical: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: "80%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.aquaSoft,
  },
  modalTitle: { fontSize: 18, fontFamily: fonts.bold, color: colors.accent },
  modalCloseBtn: { padding: 4, marginLeft: 8 },
  unreadCountBadge: { backgroundColor: "#FEE2E2", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  unreadCountBadgeText: { color: "#DC2626", fontSize: 11, fontFamily: fonts.bold },
  markAllReadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.lavender,
  },
  markAllReadText: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.accent },
  centerBox: { padding: 30, alignItems: "center" },
  notifCard: {
    backgroundColor: colors.input,
    padding: 14,
    borderRadius: 28,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifCardUnread: {
    backgroundColor: colors.aquaSoft,
    borderColor: colors.border,
  },
  notifHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  notifTitleGroup: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  notifTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.accent },
  notifTime: { fontSize: 11, fontFamily: fonts.regular, color: colors.muted },
  notifMessage: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted, lineHeight: 18 },
  notifFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    flexWrap: "wrap",
    gap: 8,
  },
  notifActionRow: { flexDirection: "row", gap: 8 },
  notifCancelBtn: {
    backgroundColor: "#DC2626",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  notifCancelBtnText: { color: colors.white, fontFamily: fonts.bold, fontSize: 12 },
  notifRescheduleBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  notifRescheduleBtnText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 12 },
  markReadSingleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: colors.lavender,
    alignSelf: "flex-end",
    marginLeft: "auto",
  },
  markReadSingleText: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.accent },
  emptyNotifBox: { alignItems: "center", paddingVertical: 40 },
  emptyNotifText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14, marginTop: 10 },
});
