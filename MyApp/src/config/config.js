import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * 🚨 ORAVISTA API CONFIGURATION 🚨
 * Mobile App Backend Connection
 */

export const API_BASE_URL = "https://oravista-server-474976105474.asia-southeast1.run.app";

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