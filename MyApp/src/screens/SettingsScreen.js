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
  Image
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "../theme/fonts";
import ScreenHeader from "../components/ScreenHeader"; 

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
        if (gestureState.dy > 150 || gestureState.vy > 1.5) onClose();
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
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            {children}
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// ==========================================
// MAIN SETTINGS SCREEN
// ==========================================
export default function SettingsScreen({ navigation }) {
  // --- BOTTOM SHEET STATES ---
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showHelp, setShowHelp] = useState(false);   // 🔹 NEW
  const [showAbout, setShowAbout] = useState(false); // 🔹 NEW

  // --- DUMMY TOGGLE & DROPDOWN STATES ---
  const [reminders, setReminders] = useState(true);
  const [promos, setPromos] = useState(false);
  const [alerts, setAlerts] = useState(true);
  const [language, setLanguage] = useState("English");
  const [timezone, setTimezone] = useState("Asia/Manila (PHT)");

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

      {/* =========================================
          📱 HELP CENTER SHEET (NEW)
          ========================================= */}
      <DraggableBottomSheet visible={showHelp} onClose={() => setShowHelp(false)} title="Help Center" icon="help-buoy">
        <Text style={styles.subSectionLabel}>FREQUENTLY ASKED QUESTIONS</Text>
        
        {/* Dummy FAQ Items */}
        <TouchableOpacity style={styles.faqRow}>
          <Text style={styles.faqText}>How do I book an appointment?</Text>
          <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.faqRow}>
          <Text style={styles.faqText}>Can I cancel or reschedule?</Text>
          <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        <View style={styles.divider} />

        <TouchableOpacity style={styles.faqRow}>
          <Text style={styles.faqText}>What are the clinic hours?</Text>
          <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Contact Support Button */}
        <TouchableOpacity style={styles.contactBtn} onPress={() => alert("Open Email/Chat Support")}>
          <Ionicons name="chatbubbles" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.sheetBtnText}>Contact Support</Text>
        </TouchableOpacity>
      </DraggableBottomSheet>

      {/* =========================================
          📱 ABOUT ORAVISTA SHEET (NEW)
          ========================================= */}
      <DraggableBottomSheet visible={showAbout} onClose={() => setShowAbout(false)} title="About OraVista" icon="information-circle">
        
        <View style={styles.aboutContainer}>
          <View style={styles.aboutLogoBox}>
             <Ionicons name="medical" size={40} color="#001166" />
          </View>
          <Text style={styles.aboutTitle}>OraVista Dental</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
          <Text style={styles.aboutDesc}>
            Providing premium dental care scheduling directly from your mobile device. Built to make your smile brighter.
          </Text>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.policyRow}>
          <Text style={styles.policyText}>Terms of Service</Text>
          <Ionicons name="open-outline" size={18} color="#9CA3AF" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.policyRow}>
          <Text style={styles.policyText}>Privacy Policy</Text>
          <Ionicons name="open-outline" size={18} color="#9CA3AF" />
        </TouchableOpacity>

      </DraggableBottomSheet>

      {/* ... (Keep your existing Prefs, Privacy, and Notif sheets here exactly as they were) ... */}

      {/* PREFERENCES SHEET */}
      <DraggableBottomSheet visible={showPrefs} onClose={() => setShowPrefs(false)} title="Preferences" icon="globe">
        <Text style={styles.inputLabel}>Language</Text>
        <TouchableOpacity style={styles.dropdownBox}>
          <Text style={styles.dropdownText}>{language}</Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>

        <Text style={styles.inputLabel}>Timezone</Text>
        <TouchableOpacity style={styles.dropdownBox}>
          <Text style={styles.dropdownText}>{timezone}</Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.sheetBtn} onPress={() => setShowPrefs(false)}>
          <Text style={styles.sheetBtnText}>Save Changes</Text>
        </TouchableOpacity>
      </DraggableBottomSheet>

      {/* PRIVACY SHEET */}
      <DraggableBottomSheet visible={showPrivacy} onClose={() => setShowPrivacy(false)} title="Privacy & Security" icon="shield-checkmark">
        <View style={styles.securityCard}>
          <View style={styles.securityIconBox}>
            <Ionicons name="finger-print" size={20} color="#16A34A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.securityCardTitle}>Two-Factor Authentication</Text>
            <Text style={styles.securityCardSub}>Email Verification (OTP) is Active</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
        </View>

        <Text style={styles.subSectionLabel}>RECENT LOGINS</Text>
        <View style={styles.loginRow}>
          <View style={styles.deviceIcon}>
            <Ionicons name="phone-portrait-outline" size={20} color="#001166" />
          </View>
          <View>
            <Text style={styles.deviceTitle}>Mobile App (Current)</Text>
            <Text style={styles.deviceSub}>IP: 192.168.1.45 • Manila, PH</Text>
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
            <Text style={styles.toggleSub}>Emails 24h before your visit.</Text>
          </View>
          <Switch trackColor={{ false: "#E5E7EB", true: "#001166" }} thumbColor="#FFFFFF" onValueChange={setReminders} value={reminders} />
        </View>
        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.toggleTitle}>Marketing & Promos</Text>
            <Text style={styles.toggleSub}>Dental discounts and news.</Text>
          </View>
          <Switch trackColor={{ false: "#E5E7EB", true: "#001166" }} thumbColor="#FFFFFF" onValueChange={setPromos} value={promos} />
        </View>
        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.toggleTitle}>System Alerts</Text>
            <Text style={styles.toggleSub}>Security and login alerts.</Text>
          </View>
          <Switch trackColor={{ false: "#E5E7EB", true: "#001166" }} thumbColor="#FFFFFF" onValueChange={setAlerts} value={alerts} />
        </View>

        <TouchableOpacity style={styles.sheetBtn} onPress={() => setShowNotif(false)}>
          <Text style={styles.sheetBtnText}>Save Preferences</Text>
        </TouchableOpacity>
      </DraggableBottomSheet>

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

  /* --- BOTTOM SHEET STYLES --- */
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheetContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingBottom: 40, width: "100%", maxHeight: "85%" },
  dragArea: { paddingTop: 12, paddingBottom: 10, width: "100%" },
  grabber: { width: 40, height: 5, backgroundColor: "#D1D5DB", borderRadius: 5, alignSelf: "center", marginBottom: 20 },
  sheetHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  sheetTitle: { fontSize: 22, fontFamily: fonts.bold, color: "#001166", marginLeft: 10 },

  /* Prefs, Privacy, Notifs Styles */
  inputLabel: { fontSize: 14, fontFamily: fonts.bold, color: "#111827", marginBottom: 8, marginTop: 10 },
  dropdownBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 8, backgroundColor: "#FFFFFF" },
  dropdownText: { fontSize: 15, fontFamily: fonts.medium, color: "#374151" },
  securityCard: { flexDirection: "row", backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#DCFCE7", padding: 16, borderRadius: 16, alignItems: "center", marginBottom: 24, marginTop: 10 },
  securityIconBox: { width: 36, height: 36, backgroundColor: "#DCFCE7", borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  securityCardTitle: { fontSize: 14, fontFamily: fonts.bold, color: "#166534" },
  securityCardSub: { fontSize: 12, fontFamily: fonts.medium, color: "#16A34A", marginTop: 2 },
  subSectionLabel: { fontSize: 12, fontFamily: fonts.bold, color: "#9CA3AF", letterSpacing: 1, marginBottom: 12 },
  loginRow: { flexDirection: "row", alignItems: "center", marginBottom: 30 },
  deviceIcon: { width: 44, height: 44, backgroundColor: "#F3F4F6", borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 14 },
  deviceTitle: { fontSize: 15, fontFamily: fonts.bold, color: "#111827" },
  deviceSub: { fontSize: 13, fontFamily: fonts.medium, color: "#6B7280", marginTop: 2 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  toggleTextWrap: { flex: 1, paddingRight: 15 },
  toggleTitle: { fontSize: 15, fontFamily: fonts.bold, color: "#111827" },
  toggleSub: { fontSize: 13, fontFamily: fonts.medium, color: "#6B7280", marginTop: 4 },
  divider: { height: 1, backgroundColor: "#F3F4F6", width: "100%", marginVertical: 4 },

  sheetBtn: { backgroundColor: "#001166", paddingVertical: 16, borderRadius: 16, alignItems: "center", marginTop: 24 },
  sheetBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: fonts.bold },

  /* 🔹 HELP CENTER STYLES (NEW) */
  faqRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16 },
  faqText: { fontSize: 15, fontFamily: fonts.medium, color: "#374151" },
  contactBtn: { flexDirection: "row", backgroundColor: "#001166", paddingVertical: 16, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 24 },

  /* 🔹 ABOUT ORAVISTA STYLES (NEW) */
  aboutContainer: { alignItems: "center", paddingVertical: 20 },
  aboutLogoBox: { width: 80, height: 80, backgroundColor: "#F0F4FF", borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  aboutTitle: { fontSize: 22, fontFamily: fonts.bold, color: "#001166" },
  aboutVersion: { fontSize: 14, fontFamily: fonts.medium, color: "#6B7280", marginTop: 4 },
  aboutDesc: { textAlign: "center", fontSize: 14, fontFamily: fonts.regular, color: "#4B5563", marginTop: 12, lineHeight: 22, paddingHorizontal: 20 },
  policyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  policyText: { fontSize: 15, fontFamily: fonts.medium, color: "#001166" },
});