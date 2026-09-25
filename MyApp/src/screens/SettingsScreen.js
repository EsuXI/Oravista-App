import ScreenBackground from '../components/ScreenBackground';
import BrandLogo from '../components/BrandLogo';
import { colors } from '../theme/colors';
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
  Animated,
  PanResponder,
  Linking
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import ScreenHeader from "../components/ScreenHeader";
import CustomAlertModal from "../components/CustomAlertModal";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ==========================================
// 🛠️ REUSABLE DRAGGABLE BOTTOM SHEET
// ==========================================
function DraggableBottomSheet({ visible, onClose, title, icon, children }) {
  const insets = useSafeAreaInsets();
  const panY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) panY.setValue(0);
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gestureState) => {
        if (gestureState.dy > 0) panY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 1.2) onClose();
        else {
          Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close sheet" style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <Animated.View accessibilityViewIsModal style={[styles.sheetContent, { paddingBottom: insets.bottom + 24, transform: [{ translateY: panY }] }]}>
          <View {...panResponder.panHandlers} style={styles.dragArea}>
            <View style={styles.grabber} />
            <View style={styles.sheetHeader}>
              <Ionicons name={icon} size={24} color={colors.accent} />
              <Text style={styles.sheetTitle}>{title}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close sheet" onPress={onClose} style={{ marginLeft: 'auto', minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}><Ionicons name="close" size={22} color={colors.ink} /></TouchableOpacity>
            </View>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ==========================================
// MAIN SETTINGS SCREEN
// ==========================================
export default function SettingsScreen({ navigation }) {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // Dynamic user session info
  const [userEmail, setUserEmail] = useState("");

  // Expandable FAQ State
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Custom Alert Modal State
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: "success",
    title: "",
    message: "",
    onPrimaryPress: () => {},
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const email = await AsyncStorage.getItem("userEmail");
      if (email) setUserEmail(email);

    } catch (e) {
      console.log('Could not read the saved account email.');
    }
  };

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const handleContactSupport = () => {
    setShowHelp(false);
    navigation.getParent()?.navigate('Services', { tab: 'branches' });
  };

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <ScreenHeader title="Settings" showBack={true} />

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Account Settings</Text>
        <View style={styles.menuGroup}>
          <SettingItem icon="person-outline" text="Edit Profile" onPress={() => navigation.navigate("EditProfile")} />
          <SettingItem icon="lock-closed-outline" text="Change Password" onPress={() => navigation.navigate("ChangePassword")} isLast={true} />
        </View>

        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.menuGroup}>
          <SettingItem icon="globe-outline" text="Language & Region" onPress={() => setShowPrefs(true)} />
          <SettingItem icon="notifications-outline" text="Notifications" onPress={() => setShowNotif(true)} />
          <SettingItem icon="shield-checkmark-outline" text="Privacy & Security" onPress={() => setShowPrivacy(true)} isLast={true} />
        </View>

        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.menuGroup}>
          <SettingItem icon="help-circle-outline" text="Help Center" onPress={() => setShowHelp(true)} />
          <SettingItem icon="information-circle-outline" text="About OraVista" onPress={() => setShowAbout(true)} isLast={true} />
        </View>

        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>

      {/* HELP CENTER SHEET */}
      <DraggableBottomSheet visible={showHelp} onClose={() => setShowHelp(false)} title="Help Center" icon="help-buoy">
        <Text style={styles.subSectionLabel}>FREQUENTLY ASKED QUESTIONS</Text>

        <TouchableOpacity accessibilityRole="button" style={styles.faqRow} onPress={() => toggleFaq(0)}>
          <Text style={styles.faqText}>How do I book an appointment?</Text>
          <Ionicons name={expandedFaq === 0 ? "chevron-up" : "chevron-down"} size={20} color={colors.muted} />
        </TouchableOpacity>
        {expandedFaq === 0 && (
          <Text style={styles.faqAnswer}>
            On Home, tap "Book Appointment", then select your branch, service, dentist, date and available time. Review the details before confirming your request.
          </Text>
        )}
        <View style={styles.divider} />

        <TouchableOpacity accessibilityRole="button" style={styles.faqRow} onPress={() => toggleFaq(1)}>
          <Text style={styles.faqText}>Can I cancel or reschedule?</Text>
          <Ionicons name={expandedFaq === 1 ? "chevron-up" : "chevron-down"} size={20} color={colors.muted} />
        </TouchableOpacity>
        {expandedFaq === 1 && (
          <Text style={styles.faqAnswer}>
            Yes. Open your Appointments list and tap "Cancel Appointment" on any pending visit. For a cancelled visit, use "Reschedule Appointment" to request another available time. Contact the clinic for changes to confirmed visits.
          </Text>
        )}
        <View style={styles.divider} />

        <TouchableOpacity accessibilityRole="button" style={styles.faqRow} onPress={() => toggleFaq(2)}>
          <Text style={styles.faqText}>What are clinic opening hours?</Text>
          <Ionicons name={expandedFaq === 2 ? "chevron-up" : "chevron-down"} size={20} color={colors.muted} />
        </TouchableOpacity>
        {expandedFaq === 2 && (
          <Text style={styles.faqAnswer}>
            Hours may differ by branch. Tap "Contact a Branch" below to confirm opening hours with the clinic before visiting.
          </Text>
        )}

        <TouchableOpacity accessibilityRole="button" style={styles.contactBtn} onPress={handleContactSupport}>
          <Ionicons name="chatbubbles" size={20} color={colors.ink} style={{ marginRight: 8 }} />
          <Text style={styles.sheetBtnText}>Contact a Branch</Text>
        </TouchableOpacity>
      </DraggableBottomSheet>

      {/* ABOUT SHEET */}
      <DraggableBottomSheet visible={showAbout} onClose={() => setShowAbout(false)} title="About OraVista" icon="information-circle">
        <View style={styles.aboutContainer}>
            <View style={styles.aboutLogoBox}>
              <BrandLogo variant="symbol" width={64} />
          </View>
          <Text style={styles.aboutTitle}>OraVista Dental</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
          <Text style={styles.aboutDesc}>
            Comprehensive dental care scheduling, patient records, and diagnostic tracking built directly for mobile and web.
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.policyRow}>
          <Text style={styles.policyText}>Privacy & Data Protection</Text>
          <Text style={styles.policySub}>Contact your clinic for policy details</Text>
        </View>
      </DraggableBottomSheet>

      {/* PREFERENCES SHEET */}
      <DraggableBottomSheet visible={showPrefs} onClose={() => setShowPrefs(false)} title="Preferences" icon="globe">
        <Text style={styles.inputLabel}>Language</Text>
        <View style={styles.dropdownBox}>
          <Text style={styles.dropdownText}>English</Text>
        </View>
        <Text style={styles.toggleSub}>Filipino / Tagalog translation is not available yet.</Text>

        <Text style={styles.inputLabel}>Region & Timezone</Text>
        <View style={[styles.dropdownBox, { backgroundColor: colors.input }]}>
          <Text style={styles.dropdownText}>Asia/Manila (GMT+8)</Text>
          <Ionicons name="lock-closed" size={16} color={colors.muted} />
        </View>

        <TouchableOpacity accessibilityRole="button" style={styles.sheetBtn} onPress={() => setShowPrefs(false)}>
          <Text style={styles.sheetBtnText}>Done</Text>
        </TouchableOpacity>
      </DraggableBottomSheet>

      {/* PRIVACY SHEET */}
      <DraggableBottomSheet visible={showPrivacy} onClose={() => setShowPrivacy(false)} title="Privacy & Security" icon="shield-checkmark">
        <View style={styles.securityCard}>
          <View style={styles.securityIconBox}>
            <Ionicons name="shield-checkmark" size={20} color="#16A34A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.securityCardTitle}>Email Verification</Text>
            <Text style={styles.securityCardSub}>A code is requested during sign-in.</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
        </View>

        <Text style={styles.subSectionLabel}>ACCOUNT ON THIS DEVICE</Text>
        <View style={styles.loginRow}>
          <View style={styles.deviceIcon}>
            <Ionicons name="phone-portrait-outline" size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.deviceTitle}>Signed-in account</Text>
            <Text style={styles.deviceSub}>{userEmail || "Signed In User"}</Text>
          </View>
        </View>

        <TouchableOpacity accessibilityRole="button" style={styles.sheetBtn} onPress={() => setShowPrivacy(false)}>
          <Text style={styles.sheetBtnText}>Done</Text>
        </TouchableOpacity>
      </DraggableBottomSheet>

      {/* NOTIFICATIONS SHEET */}
      <DraggableBottomSheet visible={showNotif} onClose={() => setShowNotif(false)} title="Notifications" icon="notifications">
        <Text style={[styles.toggleSub, { marginBottom: 16 }]}>Notification controls are coming soon. Email and in-app alerts currently follow clinic settings; these options cannot change delivery yet.</Text>
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.toggleTitle}>Appointment Reminders</Text>
            <Text style={styles.toggleSub}>Email and in-app alerts before your scheduled visit.</Text>
          </View>
          <Text style={styles.toggleSub}>Coming soon</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.toggleTitle}>Marketing & Promos</Text>
            <Text style={styles.toggleSub}>Clinic special discounts and dental health tips.</Text>
          </View>
          <Text style={styles.toggleSub}>Coming soon</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.toggleTitle}>System & Security Alerts</Text>
            <Text style={styles.toggleSub}>Notifications regarding account updates and OTPs.</Text>
          </View>
          <Text style={styles.toggleSub}>Coming soon</Text>
        </View>

        <TouchableOpacity accessibilityRole="button" style={styles.sheetBtn} onPress={() => setShowNotif(false)}>
          <Text style={styles.sheetBtnText}>Done</Text>
        </TouchableOpacity>
      </DraggableBottomSheet>

      {/* Custom Alert Modal */}
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

function SettingItem({ icon, text, onPress, isLast }) {
  return (
    <TouchableOpacity accessibilityRole="button" style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconBg}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <Text style={styles.menuText}>{text}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  scrollContent: { paddingBottom: 40, paddingTop: 10 , maxWidth: 680, width: '100%', alignSelf: 'center' },
  sectionLabel: { marginHorizontal: 24, marginTop: 24, marginBottom: 8, fontSize: 12, fontFamily: fonts.bold, color: colors.muted, textTransform: "uppercase", letterSpacing: 1 },
  menuGroup: { backgroundColor: colors.surface, marginHorizontal: 20, borderRadius: 28, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.aquaSoft },
  iconBg: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.lavender, justifyContent: "center", alignItems: "center", marginRight: 14 },
  menuText: { flex: 1, fontSize: 15, color: colors.ink, fontFamily: fonts.medium },
  versionText: { textAlign: "center", marginTop: 40, fontSize: 12, color: colors.muted, fontFamily: fonts.medium },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheetContent: { backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingBottom: 40, width: "100%", maxHeight: "85%" },
  dragArea: { paddingTop: 12, paddingBottom: 10, width: "100%" },
  grabber: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 5, alignSelf: "center", marginBottom: 20 },
  sheetHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  sheetTitle: { fontSize: 22, fontFamily: fonts.bold, color: colors.accent, marginLeft: 10 },
  inputLabel: { fontSize: 14, fontFamily: fonts.bold, color: colors.ink, marginBottom: 8, marginTop: 10 },
  dropdownBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 8, backgroundColor: colors.surface },
  dropdownText: { fontSize: 15, fontFamily: fonts.medium, color: colors.ink },
  securityCard: { flexDirection: "row", backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#DCFCE7", padding: 16, borderRadius: 28, alignItems: "center", marginBottom: 24, marginTop: 10 },
  securityIconBox: { width: 36, height: 36, backgroundColor: "#DCFCE7", borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  securityCardTitle: { fontSize: 14, fontFamily: fonts.bold, color: "#166534" },
  securityCardSub: { fontSize: 12, fontFamily: fonts.medium, color: "#16A34A", marginTop: 2 },
  subSectionLabel: { fontSize: 12, fontFamily: fonts.bold, color: colors.muted, letterSpacing: 1, marginBottom: 12 },
  loginRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  deviceIcon: { width: 44, height: 44, backgroundColor: colors.lavender, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 14 },
  deviceTitle: { fontSize: 15, fontFamily: fonts.bold, color: colors.ink },
  deviceSub: { fontSize: 13, fontFamily: fonts.medium, color: colors.muted, marginTop: 2 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  toggleTextWrap: { flex: 1, paddingRight: 15 },
  toggleTitle: { fontSize: 15, fontFamily: fonts.bold, color: colors.ink },
  toggleSub: { fontSize: 13, fontFamily: fonts.medium, color: colors.muted, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.aquaSoft, width: "100%", marginVertical: 4 },
  sheetBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 999, alignItems: "center", marginTop: 24 },
  sheetBtnText: { color: colors.ink, fontSize: 16, fontFamily: fonts.bold },
  faqRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
  faqText: { fontSize: 15, fontFamily: fonts.medium, color: colors.ink, flex: 1 },
  faqAnswer: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted, lineHeight: 20, paddingBottom: 8, paddingHorizontal: 4 },
  contactBtn: { flexDirection: "row", backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 999, alignItems: "center", justifyContent: "center", marginTop: 24 },
  aboutContainer: { alignItems: "center", paddingVertical: 20 },
  aboutLogoBox: { width: 80, height: 80, backgroundColor: colors.lavender, borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  aboutTitle: { fontSize: 22, fontFamily: fonts.bold, color: colors.accent },
  aboutVersion: { fontSize: 14, fontFamily: fonts.medium, color: colors.muted, marginTop: 4 },
  aboutDesc: { textAlign: "center", fontSize: 14, fontFamily: fonts.regular, color: colors.muted, marginTop: 12, lineHeight: 22, paddingHorizontal: 20 },
  policyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16 },
  policyText: { fontSize: 14, fontFamily: fonts.medium, color: colors.ink },
  policySub: { fontSize: 12, fontFamily: fonts.medium, color: "#16A34A" },
});
