import { profileAge, profileSex } from './profileFields';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/config';
import { requestJson, dateKey } from './patientData';

// Read the shared profile when a patient screen gains focus, while retaining cached data offline.
export async function refreshUserProfile(cached) {
  const id = cached?.id || cached?.user_id;
  if (!id) return null;
  const snapshot = await AsyncStorage.getItem('userData');
  const token = await AsyncStorage.getItem('userToken');
  const fresh = await requestJson(`${API_BASE_URL}/api/user-profile?userId=${encodeURIComponent(id)}`);
  if (String(fresh.id) !== String(id)) throw new Error('The profile does not match the signed-in account.');
  const current = JSON.parse(await AsyncStorage.getItem('userData') || 'null');
  if (!current || String(current.id || current.user_id) !== String(id) || await AsyncStorage.getItem('userToken') !== token || await AsyncStorage.getItem('userData') !== snapshot) return null;
  const allowed = ['id','user_id','email','phone','dob','age','sex','occupation','blood_type','allergies','insurance','policy_number','role','branch','selectedBranch'];
  const merged = { ...current, ...fresh };
  const profile = Object.fromEntries(allowed.filter(key => key in merged).map(key => [key, merged[key]]));
  profile.firstName = profile.first_name = fresh.first_name ?? fresh.firstName ?? '';
  profile.lastName = profile.last_name = fresh.last_name ?? fresh.lastName ?? '';
  profile.dob = dateKey(profile.dob);
  profile.age = profileAge(profile.dob);
  profile.sex = profileSex(profile.sex);
  const photo = fresh.profile_picture ?? fresh.profile_pic ?? fresh.profile_image ?? null;
  profile.profile_picture = profile.profile_pic = profile.profile_image = photo;
  await AsyncStorage.setItem('userData', JSON.stringify(profile));
  return profile;
}
