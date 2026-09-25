import { colors } from '../theme/colors';
import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";

export default function AuthGate({ navigation }) {
  useEffect(() => {
    // Remembered email is a convenience, never proof of a verified session.
    // Resume authentication only after a server session-validation API exists.
    navigation.replace('Login');
  }, [navigation]);

  // Loading spinner while deciding where to send the user
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.canvas
  }
});