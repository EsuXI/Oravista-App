import React, { useState, useEffect } from "react";
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
    try {
      const stored = await AsyncStorage.getItem("userData");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setFirstName(parsed.first_name || parsed.firstName || "");
        setLastName(parsed.last_name || parsed.lastName || "");
        setEmail(parsed.email || "");
        setPhone(parsed.phone || "");
        setDob(parsed.dob || "");
        setAge(parsed.age ? String(parsed.age) : "");
        setSex(parsed.sex || "");
        setOccupation(parsed.occupation || "");
        setProfileImage(parsed.profile_pic || parsed.profile_image || parsed.profileImage || null);
      }
    } catch (err) {
      console.log("Error loading user data:", err);
    }
  };

  const pickImage = async () => {
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
  };

  const validateForm = () => {
    const newErrors = {};
    const nameRegex = /^[A-Za-zÀ-ÿ\s'-]{2,30}$/;
    const phPhoneRegex = /^(09|\+639)\d{9}$/;

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required.";
    } else if (!nameRegex.test(firstName.trim())) {
      newErrors.firstName = "2-30 letters only. No numbers or symbols.";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required.";
    } else if (!nameRegex.test(lastName.trim())) {
      newErrors.lastName = "2-30 letters only. No numbers or symbols.";
    }

    if (phone.trim()) {
      const cleanPhone = phone.replace(/[\s-]/g, "");
      if (!phPhoneRegex.test(cleanPhone)) {
        newErrors.phone = "Must be valid PH number (e.g., 09123456789).";
      }
    }

    if (dob.trim()) {
      const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dobRegex.test(dob.trim())) {
        newErrors.dob = "Use format YYYY-MM-DD.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
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

    setLoading(true);
    let finalProfilePicUrl = profileImage;

    try {
      if (newImagePickerAsset) {
        try {
          const uri = newImagePickerAsset.uri;
          const fileType = uri.split(".").pop() || "jpg";
          const filename = `avatar_${user.id}_${Date.now()}.${fileType}`;

          const formData = new FormData();
          formData.append("userId", String(user.id));
          formData.append("profileImage", {
            uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
            name: filename,
            type: `image/${fileType === "png" ? "png" : "jpeg"}`,
          });

          const uploadRes = await fetch(`${API_BASE_URL}/api/upload-profile-picture`, {
            method: "POST",
            body: formData,
          });

          const uploadRaw = await uploadRes.text();
          let uploadData = {};
          try { uploadData = JSON.parse(uploadRaw); } catch (e) {}

          if (uploadRes.ok && uploadData.imageUrl) {
            finalProfilePicUrl = uploadData.imageUrl;
          }
        } catch (uploadErr) {
          console.log("Photo upload warning:", uploadErr);
        }
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
      };

      const response = await fetch(`${API_BASE_URL}/api/update-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      let data = {};
      try { data = JSON.parse(rawText); } catch (e) {}

      if (response.ok) {
        const updatedUser = {
          ...user,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: formattedPhone,
          dob: dob.trim(),
          age: age.trim() ? parseInt(age.trim(), 10) : null,
          sex: sex.trim(),
          occupation: occupation.trim(),
          profile_pic: finalProfilePicUrl,
          profile_image: finalProfilePicUrl,
        };

        await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));
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
      } else {
        setAlertConfig({
          visible: true,
          type: "error",
          title: "Update Failed",
          message: data.message || "Could not update profile information.",
          onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
        });
      }
    } catch (err) {
      console.log("Profile update error:", err);
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Connection Error",
        message: "Network request failed. Please verify your connection.",
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001166" />

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.placeholderAvatar}>
                <Ionicons name="person" size={50} color="#9CA3AF" />
              </View>
            )}

            <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
              <Ionicons name="camera" size={18} color="#FFFFFF" />
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
            <TextInput
              style={[styles.input, errors.firstName && styles.inputError]}
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                if (errors.firstName) setErrors({ ...errors, firstName: null });
              }}
              placeholder="First Name (letters only)"
              placeholderTextColor="#9CA3AF"
              maxLength={30}
            />
            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={[styles.input, errors.lastName && styles.inputError]}
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                if (errors.lastName) setErrors({ ...errors, lastName: null });
              }}
              placeholder="Last Name (letters only)"
              placeholderTextColor="#9CA3AF"
              maxLength={30}
            />
            {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address (Read-only)</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={email}
              editable={false}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number (Philippines)</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (errors.phone) setErrors({ ...errors, phone: null });
              }}
              placeholder="09XXXXXXXXX"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={13}
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Date of Birth</Text>
              <TextInput
                style={[styles.input, errors.dob && styles.inputError]}
                value={dob}
                onChangeText={(text) => {
                  setDob(text);
                  if (errors.dob) setErrors({ ...errors, dob: null });
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
                maxLength={10}
              />
              {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="Age"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sex / Gender</Text>
            <TextInput
              style={styles.input}
              value={sex}
              onChangeText={setSex}
              placeholder="e.g. Male / Female"
              placeholderTextColor="#9CA3AF"
              maxLength={20}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Occupation</Text>
            <TextInput
              style={styles.input}
              value={occupation}
              onChangeText={setOccupation}
              placeholder="e.g. Student, Engineer"
              placeholderTextColor="#9CA3AF"
              maxLength={50}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
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
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    backgroundColor: "#001166",
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
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  avatarSection: { alignItems: "center", marginVertical: 20 },
  avatarContainer: { position: "relative" },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  placeholderAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#001166",
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },
  changePhotoText: {
    marginTop: 8,
    fontSize: 13,
    color: "#6B7280",
    fontFamily: fonts.medium,
  },
  stagedBadge: {
    marginTop: 4,
    fontSize: 12,
    color: "#2563EB",
    fontFamily: fonts.medium,
  },
  form: { marginTop: 4 },
  inputGroup: { marginBottom: 16 },
  row: { flexDirection: "row" },
  label: { fontSize: 13, color: "#374151", fontFamily: fonts.semiBold, marginBottom: 6 },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  inputError: { borderColor: "#EF4444" },
  errorText: { color: "#EF4444", fontSize: 12, marginTop: 4, fontFamily: fonts.medium },
  disabledInput: { backgroundColor: "#F3F4F6", color: "#6B7280" },
  saveBtn: {
    backgroundColor: "#001166",
    height: 52,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: fonts.semiBold },
});