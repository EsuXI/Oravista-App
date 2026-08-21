import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * 🚨 ORAVISTA API CONFIGURATION 🚨
 * Mobile App Backend Connection
 */
// ✅ FIXED: Pointing to the local backend for testing. 
// REPLACE 192.168.1.X WITH YOUR ACTUAL IPV4 ADDRESS!
export const API_BASE_URL = "https://oravistabackend.vercel.app";

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