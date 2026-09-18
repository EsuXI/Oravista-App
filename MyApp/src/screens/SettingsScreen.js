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

// ==========================================
// 🛠️ REUSABLE DRAGGABLE BOTTOM SHEET
// ==========================================
function DraggableBottomSheet({ visible, onClose, title, icon, children }) {
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
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[styles.sheetContent, { transform: [{ translateY: panY }] }]}>
          <View {...panResponder.panHandlers} style={styles.dragArea}>
            <View style={styles.grabber} />
            <View style={styles.sheetHeader}>
              <Ionicons name={icon} size={24} color="#001166" />
              <Text style={styles.sheetTitle}>{title}</Text>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </TouchableOpacity>
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

  // Settings State persisted via AsyncStorage
  const [reminders, setReminders] = useState(true);
  const [promos, setPromos] = useState(false);
  const [alerts, setAlerts] = useState(true);
  const [language, setLanguage] = useState("English");

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

      const savedSettings = await AsyncStorage.getItem("@user_settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (typeof parsed.reminders === "boolean") setReminders(parsed.reminders);
        if (typeof parsed.promos === "boolean") setPromos(parsed.promos);
        if (typeof parsed.alerts === "boolean") setAlerts(parsed.alerts);
        if (parsed.language) setLanguage(parsed.language);
      }
    } catch (e) {
      console.log("Failed to load settings:", e);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      const current = { reminders, promos, alerts, language, ...newSettings };
      await AsyncStorage.setItem("@user_settings", JSON.stringify(current));
    } catch (e) {
      console.log("Failed to save settings:", e);
    }
  };

  const handleToggle = (key, value, setter) => {
    setter(value);
    saveSettings({ [key]: value });
  };

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const handleContactSupport = () => {
    setShowHelp(false);
    Linking.openURL("mailto:support@oravista.com?subject=OraVista%20App%20Inquiry").catch(() => {
      setAlertConfig({
        visible: true,
        type: "info",
        title: "Contact Support",
        message: "You can reach the clinic team directly at support@oravista.com or via branch hotline.",
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Settings" showBack={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

        <TouchableOpacity style={styles.faqRow} onPress={() => toggleFaq(0)}>
          <Text style={styles.faqText}>How do I book an appointment?</Text>
          <Ionicons name={expandedFaq === 0 ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
        </TouchableOpacity>
        {expandedFaq === 0 && (
          <Text style={styles.faqAnswer}>
            Go to the Appointments tab and tap "Book an Appointment", then select your branch, dental procedure, preferred doctor, date, and available slot.
          </Text>
        )}
        <View style={styles.divider} />

        <TouchableOpacity style={styles.faqRow} onPress={() => toggleFaq(1)}>
          <Text style={styles.faqText}>Can I cancel or reschedule?</Text>
          <Ionicons name={expandedFaq === 1 ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
        </TouchableOpacity>
        {expandedFaq === 1 && (
          <Text style={styles.faqAnswer}>
            Yes. Open your Appointments list and tap "Cancel Appointment" on any pending visit. Once cancelled, you can reschedule at any time.
          </Text>
        )}
        <View style={styles.divider} />

        <TouchableOpacity style={styles.faqRow} onPress={() => toggleFaq(2)}>
          <Text style={styles.faqText}>What are clinic opening hours?</Text>
          <Ionicons name={expandedFaq === 2 ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
        </TouchableOpacity>
        {expandedFaq === 2 && (
          <Text style={styles.faqAnswer}>
            Mon - Sat: 10:00 AM – 5:00 PM{"\n"}Sunday: 10:00 AM – 4:30 PM{"\n"}Lunch Break: 12:00 PM – 1:00 PM
          </Text>
        )}

        <TouchableOpacity style={styles.contactBtn} onPress={handleContactSupport}>
          <Ionicons name="chatbubbles" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.sheetBtnText}>Contact Support</Text>
        </TouchableOpacity>
      </DraggableBottomSheet>

      {/* ABOUT SHEET */}
      <DraggableBottomSheet visible={showAbout} onClose={() => setShowAbout(false)} title="About OraVista" icon="information-circle">
        <View style={styles.aboutContainer}>
          <View style={styles.aboutLogoBox}>
            <Ionicons name="medical" size={40} color="#001166" />
          </View>
          <Text style={styles.aboutTitle}>OraVista Dental</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0 (Release)</Text>
          <Text style={styles.aboutDesc}>
            Comprehensive dental care scheduling, patient records, and diagnostic tracking built directly for mobile and web.
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.policyRow}>
          <Text style={styles.policyText}>Privacy & Data Protection</Text>
          <Text style={styles.policySub}>Protected by End-to-End Auth</Text>
        </View>
      </DraggableBottomSheet>

      {/* PREFERENCES SHEET */}
      <DraggableBottomSheet visible={showPrefs} onClose={() => setShowPrefs(false)} title="Preferences" icon="globe">
        <Text style={styles.inputLabel}>Language</Text>
        <TouchableOpacity
          style={styles.dropdownBox}
          onPress={() => {
            const nextLang = language === "English" ? "Filipino / Tagalog" : "English";
            setLanguage(nextLang);
            saveSettings({ language: nextLang });
          }}
        >
          <Text style={styles.dropdownText}>{language}</Text>
          <Ionicons name="swap-horizontal" size={18} color="#001166" />
        </TouchableOpacity>

        <Text style={styles.inputLabel}>Region & Timezone</Text>
        <View style={[styles.dropdownBox, { backgroundColor: "#F9FAFB" }]}>
          <Text style={styles.dropdownText}>Asia/Manila (GMT+8)</Text>
          <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
        </View>

        <TouchableOpacity style={styles.sheetBtn} onPress={() => setShowPrefs(false)}>
          <Text style={styles.sheetBtnText}>Save Changes</Text>
        </TouchableOpacity>
      </DraggableBottomSheet>

      {/* PRIVACY SHEET */}
      <DraggableBottomSheet visible={showPrivacy} onClose={() => setShowPrivacy(false)} title="Privacy & Security" icon="shield-checkmark">
        <View style={styles.securityCard}>
          <View style={styles.securityIconBox}>
            <Ionicons name="shield-checkmark" size={20} color="#16A34A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.securityCardTitle}>Two-Factor Authentication</Text>
            <Text style={styles.securityCardSub}>Email Verification (OTP) is Active</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
        </View>

        <Text style={styles.subSectionLabel}>ACTIVE ACCOUNT SESSION</Text>
        <View style={styles.loginRow}>
          <View style={styles.deviceIcon}>
            <Ionicons name="phone-portrait-outline" size={20} color="#001166" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.deviceTitle}>Mobile App Session</Text>
            <Text style={styles.deviceSub}>{userEmail || "Signed In User"}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.sheetBtn} onPress={() => setShowPrivacy(false)}>
          <Text style={styles.sheetBtnText}>Done</Text>
        </TouchableOpacity>
      </DraggableBottomSheet>

      {/* NOTIFICATIONS SHEET */}
      <DraggableBottomSheet visible={showNotif} onClose={() => setShowNotif(false)} title="Notifications" icon="notifications">
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.toggleTitle}>Appointment Reminders</Text>
            <Text style={styles.toggleSub}>Email and in-app alerts before your scheduled visit.</Text>
          </View>
          <Switch
            trackColor={{ false: "#E5E7EB", true: "#001166" }}
            thumbColor="#FFFFFF"
            onValueChange={(val) => handleToggle("reminders", val, setReminders)}
            value={reminders}
          />
        </View>
        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.toggleTitle}>Marketing & Promos</Text>
            <Text style={styles.toggleSub}>Clinic special discounts and dental health tips.</Text>
          </View>
          <Switch
            trackColor={{ false: "#E5E7EB", true: "#001166" }}
            thumbColor="#FFFFFF"
            onValueChange={(val) => handleToggle("promos", val, setPromos)}
            value={promos}
          />
        </View>
        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.toggleTitle}>System & Security Alerts</Text>
            <Text style={styles.toggleSub}>Notifications regarding account updates and OTPs.</Text>
          </View>
          <Switch
            trackColor={{ false: "#E5E7EB", true: "#001166" }}
            thumbColor="#FFFFFF"
            onValueChange={(val) => handleToggle("alerts", val, setAlerts)}
            value={alerts}
          />
        </View>

        <TouchableOpacity style={styles.sheetBtn} onPress={() => setShowNotif(false)}>
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
    <TouchableOpacity style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconBg}>
        <Ionicons name={icon} size={18} color="#001166" />
      </View>
      <Text style={styles.menuText}>{text}</Text>
      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { paddingBottom: 40, paddingTop: 10 },
  sectionLabel: { marginHorizontal: 24, marginTop: 24, marginBottom: 8, fontSize: 12, fontFamily: fonts.bold, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1 },
  menuGroup: { backgroundColor: "#FFFFFF", marginHorizontal: 20, borderRadius: 24, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  iconBg: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#E0E7FF", justifyContent: "center", alignItems: "center", marginRight: 14 },
  menuText: { flex: 1, fontSize: 15, color: "#374151", fontFamily: fonts.medium },
  versionText: { textAlign: "center", marginTop: 40, fontSize: 12, color: "#9CA3AF", fontFamily: fonts.medium },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheetContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingBottom: 40, width: "100%", maxHeight: "85%" },
  dragArea: { paddingTop: 12, paddingBottom: 10, width: "100%" },
  grabber: { width: 40, height: 5, backgroundColor: "#D1D5DB", borderRadius: 5, alignSelf: "center", marginBottom: 20 },
  sheetHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  sheetTitle: { fontSize: 22, fontFamily: fonts.bold, color: "#001166", marginLeft: 10 },
  inputLabel: { fontSize: 14, fontFamily: fonts.bold, color: "#111827", marginBottom: 8, marginTop: 10 },
  dropdownBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 8, backgroundColor: "#FFFFFF" },
  dropdownText: { fontSize: 15, fontFamily: fonts.medium, color: "#374151" },
  securityCard: { flexDirection: "row", backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#DCFCE7", padding: 16, borderRadius: 20, alignItems: "center", marginBottom: 24, marginTop: 10 },
  securityIconBox: { width: 36, height: 36, backgroundColor: "#DCFCE7", borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  securityCardTitle: { fontSize: 14, fontFamily: fonts.bold, color: "#166534" },
  securityCardSub: { fontSize: 12, fontFamily: fonts.medium, color: "#16A34A", marginTop: 2 },
  subSectionLabel: { fontSize: 12, fontFamily: fonts.bold, color: "#9CA3AF", letterSpacing: 1, marginBottom: 12 },
  loginRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  deviceIcon: { width: 44, height: 44, backgroundColor: "#EEF2FF", borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 14 },
  deviceTitle: { fontSize: 15, fontFamily: fonts.bold, color: "#111827" },
  deviceSub: { fontSize: 13, fontFamily: fonts.medium, color: "#6B7280", marginTop: 2 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  toggleTextWrap: { flex: 1, paddingRight: 15 },
  toggleTitle: { fontSize: 15, fontFamily: fonts.bold, color: "#111827" },
  toggleSub: { fontSize: 13, fontFamily: fonts.medium, color: "#6B7280", marginTop: 4 },
  divider: { height: 1, backgroundColor: "#F3F4F6", width: "100%", marginVertical: 4 },
  sheetBtn: { backgroundColor: "#001166", paddingVertical: 16, borderRadius: 20, alignItems: "center", marginTop: 24 },
  sheetBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: fonts.bold },
  faqRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
  faqText: { fontSize: 15, fontFamily: fonts.medium, color: "#374151", flex: 1 },
  faqAnswer: { fontSize: 13, fontFamily: fonts.regular, color: "#6B7280", lineHeight: 20, paddingBottom: 8, paddingHorizontal: 4 },
  contactBtn: { flexDirection: "row", backgroundColor: "#001166", paddingVertical: 16, borderRadius: 20, alignItems: "center", justifyContent: "center", marginTop: 24 },
  aboutContainer: { alignItems: "center", paddingVertical: 20 },
  aboutLogoBox: { width: 80, height: 80, backgroundColor: "#EEF2FF", borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  aboutTitle: { fontSize: 22, fontFamily: fonts.bold, color: "#001166" },
  aboutVersion: { fontSize: 14, fontFamily: fonts.medium, color: "#6B7280", marginTop: 4 },
  aboutDesc: { textAlign: "center", fontSize: 14, fontFamily: fonts.regular, color: "#4B5563", marginTop: 12, lineHeight: 22, paddingHorizontal: 20 },
  policyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16 },
  policyText: { fontSize: 14, fontFamily: fonts.medium, color: "#374151" },
  policySub: { fontSize: 12, fontFamily: fonts.medium, color: "#16A34A" },
});