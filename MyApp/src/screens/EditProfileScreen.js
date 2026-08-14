import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import { API_BASE_URL } from '../config/config';
import ScreenHeader from "../components/ScreenHeader"; 

export default function EditProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null); 
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState(""); 
  const [age, setAge] = useState("");
  const [occupation, setOccupation] = useState("");
  // Address removed as it does not exist in the DB schema
  
  const [profilePic, setProfilePic] = useState(null); 
  const [imageFile, setImageFile] = useState(null); 
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userEmail = await AsyncStorage.getItem("userEmail");
        const response = await fetch(`${API_BASE_URL}/api/user-profile?email=${userEmail}`);
        const data = await response.json();

        if (response.ok) {
          setUserId(data.id);
          setFirstName(data.first_name || "");
          setLastName(data.last_name || "");
          setEmail(data.email || "");
          setPhone(data.phone || "");
          setDob(data.dob || ""); 
          setAge(data.age ? data.age.toString() : "");
          setOccupation(data.occupation || ""); 
          
          if (data.profile_picture) {
            setProfilePic(data.profile_picture.startsWith('http') ? data.profile_picture : `${API_BASE_URL}/${data.profile_picture}?t=${new Date().getTime()}`);
          }
        }
      } catch (error) {
        console.error("Failed to load profile", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleDobChange = (text) => {
    setDob(text);
    if (text.length === 10) { 
      const birthDate = new Date(text);
      if (!isNaN(birthDate)) {
        const today = new Date();
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
        setAge(calculatedAge > 0 ? calculatedAge.toString() : "");
      }
    }
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "We need access to your photos to change your avatar.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setProfilePic(result.assets[0].uri);
      setImageFile(result.assets[0]); 
    }
  };

  const validate = () => {
    let newErrors = {};

    if (!firstName.trim()) newErrors.firstName = "Required";
    if (!lastName.trim()) newErrors.lastName = "Required";
    
    if (!phone.trim()) newErrors.phone = "Required";
    else if (!/^09[0-9]{9}$/.test(phone)) newErrors.phone = "Must be an 11-digit number starting with 09";
    
    if (!dob.trim()) newErrors.dob = "Required (Format: YYYY-MM-DD)";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      // 1. Image Upload sending URL instead of FormData
      if (imageFile) {
        const imageResponse = await fetch(`${API_BASE_URL}/api/update-profile-picture`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            imageUrl: imageFile.uri 
          })
        });

        if (!imageResponse.ok) {
           Alert.alert("Error", "Failed to update profile picture.");
           setSaving(false);
           return; 
        }
      }

      // 2. Profile Data Update
      const updateResponse = await fetch(`${API_BASE_URL}/api/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          firstName,
          lastName,
          email,
          phone,
          age,
          occupation,
          dob,
          sex: null, blood_type: null, allergies: null, insurance: null, policy_number: null 
        })
      });

      if (updateResponse.ok) {
        Alert.alert("Success", "Profile updated successfully!");
        navigation.goBack();
      } else {
        Alert.alert("Error", "Failed to update profile text details.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Server connection failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#001166" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Edit Profile" showBack={true} />

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarContainer}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={40} color="#9CA3AF" />
            )}
          </View>
          <TouchableOpacity style={styles.cameraBadge} onPress={handleImagePick} activeOpacity={0.8}>
            <Ionicons name="camera" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Label text="First Name" />
        <Input value={firstName} setValue={setFirstName} icon="person-outline" max={50} />
        {errors.firstName && <Error text={errors.firstName} />}

        <Label text="Last Name" />
        <Input value={lastName} setValue={setLastName} icon="person-outline" max={50} />
        {errors.lastName && <Error text={errors.lastName} />}

        <Label text="Birthdate (YYYY-MM-DD)" />
        <Input value={dob} setValue={handleDobChange} icon="calendar-outline" max={10} />
        {errors.dob && <Error text={errors.dob} />}

        <Label text="Age" />
        <Input value={age} setValue={setAge} icon="calculator-outline" editable={false} style={styles.disabledInput} />

        <Label text="Occupation (Optional)" />
        <Input value={occupation} setValue={setOccupation} icon="briefcase-outline" max={50} />

        <Label text="Contact No" />
        <Input value={phone} setValue={setPhone} icon="call-outline" keyboard="phone-pad" max={11} />
        {errors.phone && <Error text={errors.phone} />}

        <Label text="Email (Cannot be changed)" />
        <Input value={email} icon="mail-outline" editable={false} style={styles.disabledInput} />

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Changes</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const Label = ({ text }) => <Text style={styles.label}>{text}</Text>;

function Input({ value, setValue, icon, editable = true, keyboard, max, style }) {
  return (
    <View style={[styles.inputContainer, style]}>
      <Ionicons name={icon} size={20} color={editable ? "#6B7280" : "#D1D5DB"} />
      <TextInput 
        value={value} 
        onChangeText={setValue} 
        editable={editable} 
        keyboardType={keyboard} 
        maxLength={max} 
        style={[styles.input, !editable && { color: "#9CA3AF" }]} 
      />
    </View>
  );
}

const Error = ({ text }) => <Text style={styles.error}>{text}</Text>;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  avatarWrapper: { alignSelf: "center", marginTop: 20, marginBottom: 10, position: "relative" },
  avatarContainer: { width: 110, height: 110, borderRadius: 55, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#E5E7EB", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  cameraBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#001166", width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#FFFFFF", elevation: 4 },
  form: { padding: 24, paddingBottom: 40 },
  label: { marginTop: 16, marginBottom: 6, fontFamily: fonts.medium, color: "#374151", fontSize: 13 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, paddingHorizontal: 14, height: 52 },
  disabledInput: { backgroundColor: "#F3F4F6", borderColor: "#F3F4F6" },
  input: { flex: 1, marginLeft: 10, fontFamily: fonts.regular, color: "#111827", fontSize: 14 },
  error: { color: "#DC2626", fontSize: 12, marginTop: 4, marginLeft: 4, fontFamily: fonts.medium },
  buttonContainer: { marginTop: 32, gap: 12 },
  saveBtn: { backgroundColor: "#001166", height: 56, borderRadius: 999, justifyContent: "center", alignItems: "center" },
  saveText: { color: "#fff", fontSize: 16, fontFamily: fonts.semiBold },
  cancelBtn: { backgroundColor: "#F3F4F6", height: 56, borderRadius: 999, justifyContent: "center", alignItems: "center" },
  cancelText: { color: "#4B5563", fontSize: 16, fontFamily: fonts.semiBold },
});