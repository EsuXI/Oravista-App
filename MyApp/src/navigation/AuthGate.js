import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AuthGate({ navigation }) {
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // 🚨 TODO FOR DEN: Later, check for a valid backend session token here instead of just "rememberMe"
        // Example: const token = await AsyncStorage.getItem("userToken");
        // const isValid = await verifyTokenWithBackend(token);

        const remember = await AsyncStorage.getItem("rememberMe");

        // --- ⬇️ DUMMY DELAY FOR SMOOTH SPLASH TRANSITION ⬇️ ---
        await new Promise(resolve => setTimeout(resolve, 800));

        // If the user previously checked "Remember Me", send them to Home.
        if (remember === "true") {
          navigation.replace("Home");
        } else {
          // Otherwise, force them to Login.
          navigation.replace("Login");
        }
      } catch (error) {
        console.error("AuthGate Error:", error);
        navigation.replace("Login"); // Fallback to login on error
      }
    };

    checkAuthStatus();
  }, [navigation]);

  // Loading spinner while deciding where to send the user
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#001166" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    backgroundColor: "#FFFFFF"
  }
});