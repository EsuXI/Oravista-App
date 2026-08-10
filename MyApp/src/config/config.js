import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * 🚨 ORAVISTA API CONFIGURATION 🚨
 * Mobile App Backend Connection
 */
// ✅ FIXED: Removed the "/api" at the end so it doesn't double up in your screens!
export const API_BASE_URL = "http://192.168.68.105:5000"; 

/**
 * 🔹 Helper Function: Get Authorized Headers
 */
export const getAuthHeaders = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    return {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    };
  } catch (error) {
    console.error("Error getting auth headers:", error);
    return { "Content-Type": "application/json" };
  }
};