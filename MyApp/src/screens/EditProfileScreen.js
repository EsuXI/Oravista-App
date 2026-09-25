import { requestJson, fileUrl, validBirthDate, dateKey } from '../utils/patientData';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import { API_BASE_URL } from "../config/config";
import CustomAlertModal from "../components/CustomAlertModal";

export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const savingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [occupation, setOccupation] = useState("");

  const [profileImage, setProfileImage] = useState(null);
  const [newImagePickerAsset, setNewImagePickerAsset] = useState(null);

  const [errors, setErrors] = useState({});

  // Central Custom Alert Modal State
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: "success",
    title: "",
    message: "",
    onPrimaryPress: () => {},
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem("userData");
      if (!stored) throw new Error('Please log in again to edit your profile.');
      if (stored) {
        const cached = JSON.parse(stored);
        const accountEmail = cached.email || await AsyncStorage.getItem('userEmail');
        if (!accountEmail) throw new Error('Please log in again to edit your profile.');
        const fresh = await requestJson(`${API_BASE_URL}/api/user-profile?email=${encodeURIComponent(accountEmail)}`);
        if (!fresh.id || String(fresh.id) !== String(cached.id || cached.user_id)) throw new Error('Could not load your profile. Please log in again.');
        const profileFields = ['id', 'user_id', 'email', 'first_name', 'last_name', 'firstName', 'lastName', 'phone', 'dob', 'age', 'sex', 'occupation', 'blood_type', 'allergies', 'insurance', 'policy_number', 'profile_picture', 'profile_pic', 'profile_image', 'profileImage', 'role', 'branch', 'selectedBranch'];
        const merged = { ...cached, ...fresh };
        const parsed = Object.fromEntries(profileFields.filter(key => key in merged).map(key => [key, merged[key]]));
        setUser(parsed);
        setFirstName(parsed.first_name || parsed.firstName || "");
        setLastName(parsed.last_name || parsed.lastName || "");
        setEmail(parsed.email || "");
        setPhone(parsed.phone || "");
        setDob(dateKey(parsed.dob));
        setAge(parsed.age != null ? String(parsed.age) : "");
        setSex(parsed.sex || "");
        setOccupation(parsed.occupation || "");
        setProfileImage(fileUrl(parsed.profile_picture || parsed.profile_pic || parsed.profile_image || parsed.profileImage, API_BASE_URL));
      }
    } catch (err) {
      setAlertConfig({ visible: true, type: 'error', title: 'Profile Unavailable', message: err.message || 'Please try again.', onPrimaryPress: () => { setAlertConfig(prev => ({ ...prev, visible: false })); navigation.goBack(); } });
    } finally { setLoading(false); }
  };

  const pickImage = async () => {
    if (loading) return;
    try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAlertConfig({
        visible: true,
        type: "warning",
        title: "Permission Needed",
        message: "Please allow access to your photo library to choose an avatar.",
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
      setNewImagePickerAsset(result.assets[0]);
    }
    } catch { setAlertConfig({ visible: true, type: 'error', title: 'Photo Unavailable', message: 'Could not open your photo library. Please try again.', onPrimaryPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }); }
  };

  const validateForm = () => {
    const newErrors = {};
    const nameRegex = /^[\p{L}\p{M} '-]{1,50}$/u;
    const phPhoneRegex = /^(09|\+639)\d{9}$/;

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required.";
    } else if (!nameRegex.test(firstName.trim())) {
      newErrors.firstName = "Use up to 50 letters, spaces, apostrophes or hyphens.";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required.";
    } else if (!nameRegex.test(lastName.trim())) {
      newErrors.lastName = "Use up to 50 letters, spaces, apostrophes or hyphens.";
    }

    if (phone.trim()) {
      const cleanPhone = phone.replace(/[\s-]/g, "");
      if (!phPhoneRegex.test(cleanPhone)) {
        newErrors.phone = "Must be valid PH number (e.g., 09123456789).";
      }
    }

    if (dob.trim() && !validBirthDate(dob.trim())) newErrors.dob = 'Enter a real date in YYYY-MM-DD format, no later than today.';
    if (age.trim() && !/^\d+$/.test(age.trim())) newErrors.age = 'Enter a whole, non-negative age.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (savingRef.current || loading || !validateForm()) return;
    if (!user || !user.id) {
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Session Error",
        message: "Could not locate your account session. Please log in again.",
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    savingRef.current = true;
    setLoading(true);
    let savedOnServer = false;
    let finalProfilePicUrl = profileImage;

    try {
      if (newImagePickerAsset) {
        const asset = newImagePickerAsset;
        const formData = new FormData();
        const type = asset.mimeType || 'image/jpeg';
        const filename = asset.fileName || `avatar_${user.id}.${type === 'image/png' ? 'png' : 'jpg'}`;
        formData.append('userId', String(user.id));
        if (Platform.OS === 'web') {
          const local = await fetch(asset.uri);
          formData.append('profileImage', await local.blob(), filename);
        } else {
          formData.append('profileImage', { uri: asset.uri, name: filename, type });
        }
        const uploaded = await requestJson(`${API_BASE_URL}/api/upload-profile-picture`, { method: 'POST', body: formData });
        finalProfilePicUrl = fileUrl(uploaded.imageUrl || uploaded.imagePath, API_BASE_URL);
        if (!finalProfilePicUrl) throw new Error('The photo upload did not return an image address. Please try again.');
        setProfileImage(finalProfilePicUrl);
        setNewImagePickerAsset(null);
      }

      let formattedPhone = phone.trim();
      if (formattedPhone.startsWith("+63")) {
        formattedPhone = "0" + formattedPhone.slice(3);
      }
      formattedPhone = formattedPhone.replace(/[\s-]/g, "");

      const payload = {
        id: user.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: formattedPhone || null,
        dob: dob.trim() || null,
        age: age.trim() ? parseInt(age.trim(), 10) : null,
        sex: sex.trim() || null,
        occupation: occupation.trim() || null,
        profilePic: finalProfilePicUrl || null,
        profile_image: finalProfilePicUrl || null,
        // The web server replaces these columns even though this form does not edit them.
        blood_type: user.blood_type ?? null,
        allergies: user.allergies ?? null,
        insurance: user.insurance ?? null,
        policy_number: user.policy_number ?? null,
      };

      await requestJson(`${API_BASE_URL}/api/update-profile`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      savedOnServer = true;
      {
        const updatedUser = {
          ...user,
          first_name: firstName.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          last_name: lastName.trim(),
          phone: formattedPhone,
          dob: dob.trim(),
          age: age.trim() ? parseInt(age.trim(), 10) : null,
          sex: sex.trim(),
          occupation: occupation.trim(),
          profile_picture: finalProfilePicUrl,
          profile_pic: finalProfilePicUrl,
          profile_image: finalProfilePicUrl,
        };

        await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));
        await AsyncStorage.setItem("userEmail", email.trim());
        setNewImagePickerAsset(null);

        setAlertConfig({
          visible: true,
          type: "success",
          title: "Profile Updated",
          message: "Your profile information has been saved successfully.",
          onPrimaryPress: () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            navigation.goBack();
          },
        });
      }
    } catch (err) {
      console.log("Profile update error:", err);
      setAlertConfig({
        visible: true,
        type: "error",
        title: savedOnServer ? "Profile Saved" : "Update Not Completed",
        message: savedOnServer ? "Your profile was saved, but this device could not refresh its local copy. Please log in again." : (err.message || "Could not save your profile. Please try again."),
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      savingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />

      <View style={[styles.header, { paddingTop: insets.top + 20, overflow: "hidden" }]}><ScreenBackground header />
        <TouchableOpacity accessibilityRole="button"
          accessibilityLabel="Go back" style={[styles.backButton, { top: insets.top + 12, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.placeholderAvatar}>
                <Ionicons name="person" size={50} color={colors.muted} />
              </View>
            )}

            <TouchableOpacity accessibilityLabel="Change profile photo" hitSlop={8} accessibilityRole="button" style={styles.cameraBtn} onPress={pickImage}>
              <Ionicons name="camera" size={18} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <Text style={styles.changePhotoText}>Tap camera to select photo</Text>
          {newImagePickerAsset && (
            <Text style={styles.stagedBadge}>Photo selected (Tap Save Changes to apply)</Text>
          )}
        </View>

        {/* Form Inputs */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput accessibilityLabel="First Name (letters only)"
              style={[styles.input, errors.firstName && styles.inputError]}
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                if (errors.firstName) setErrors({ ...errors, firstName: null });
              }}
              placeholder="First Name (letters only)"
              placeholderTextColor={colors.muted}
              maxLength={30}
            />
            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput accessibilityLabel="Last Name (letters only)"
              style={[styles.input, errors.lastName && styles.inputError]}
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                if (errors.lastName) setErrors({ ...errors, lastName: null });
              }}
              placeholder="Last Name (letters only)"
              placeholderTextColor={colors.muted}
              maxLength={30}
            />
            {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address (Read-only)</Text>
            <TextInput accessibilityLabel="Email"
              style={[styles.input, styles.disabledInput]}
              value={email}
              editable={false}
              placeholder="Email"
              placeholderTextColor={colors.muted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number (Philippines)</Text>
            <TextInput accessibilityLabel="09XXXXXXXXX"
              style={[styles.input, errors.phone && styles.inputError]}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (errors.phone) setErrors({ ...errors, phone: null });
              }}
              placeholder="09XXXXXXXXX"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              maxLength={13}
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Date of Birth</Text>
              <TextInput accessibilityLabel="YYYY-MM-DD"
                style={[styles.input, errors.dob && styles.inputError]}
                value={dob}
                onChangeText={(text) => {
                  setDob(text);
                  if (errors.dob) setErrors({ ...errors, dob: null });
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                maxLength={10}
              />
              {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Age</Text>
              <TextInput accessibilityLabel="Age"
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="Age"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                maxLength={3}
              />
              {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sex / Gender</Text>
            <TextInput accessibilityLabel="e.g. Male / Female"
              style={styles.input}
              value={sex}
              onChangeText={setSex}
              placeholder="e.g. Male / Female"
              placeholderTextColor={colors.muted}
              maxLength={20}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Occupation</Text>
            <TextInput accessibilityLabel="e.g. Student, Engineer"
              style={styles.input}
              value={occupation}
              onChangeText={setOccupation}
              placeholder="e.g. Student, Engineer"
              placeholderTextColor={colors.muted}
              maxLength={50}
            />
          </View>
        </View>

        <TouchableOpacity accessibilityRole="button" style={styles.saveBtn} onPress={handleSave} disabled={loading || !user}>
          {loading ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Reusable Custom Rounded Alert */}
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
  container: { flex: 1, backgroundColor: colors.canvas },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 55,
    paddingBottom: 28,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 55,
    padding: 4,
    zIndex: 10,
  },
  headerTitle: {
    flexShrink: 1, marginHorizontal: 44, textAlign: 'center',
    color: colors.ink,
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 , maxWidth: 680, width: '100%', alignSelf: 'center' },
  avatarSection: { alignItems: "center", marginVertical: 20 },
  avatarContainer: { position: "relative" },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  placeholderAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: colors.surface,
  },
  changePhotoText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.medium,
  },
  stagedBadge: {
    marginTop: 4,
    fontSize: 12,
    color: "#2563EB",
    fontFamily: fonts.medium,
  },
  form: { marginTop: 4 , maxWidth: 680, width: '100%', alignSelf: 'center' },
  inputGroup: { marginBottom: 16 },
  row: { flexDirection: "row" },
  label: { fontSize: 13, color: colors.ink, fontFamily: fonts.semiBold, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.ink,
  },
  inputError: { borderColor: "#EF4444" },
  errorText: { color: "#EF4444", fontSize: 12, marginTop: 4, fontFamily: fonts.medium },
  disabledInput: { backgroundColor: colors.aquaSoft, color: colors.muted },
  saveBtn: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  saveBtnText: { color: colors.ink, fontSize: 16, fontFamily: fonts.semiBold },
});
