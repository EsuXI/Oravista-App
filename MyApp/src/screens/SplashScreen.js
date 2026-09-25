import BrandLogo from '../components/BrandLogo';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity, Image } from "react-native";
import { fonts } from "../theme/fonts";

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <TouchableOpacity accessibilityRole="button"
      style={styles.container}
      activeOpacity={1}
      onPress={() => navigation.replace("Landing")}
    >
      <ScreenBackground />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

        {/* 🔹 YOUR OFFICIAL LOGO */}
        <View style={styles.logoWrapper}>
          <BrandLogo variant="stacked" width={200} />
        </View>

        <Text style={styles.subtitle}>Your Smile, Our Priority</Text>

        <View style={styles.divider} />

        <Text style={styles.clinic}>King Epres Dental Clinic</Text>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.tapText}>Tap to continue</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    width: "100%",
  },

  logoWrapper: {
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 220,
    height: 220,
    resizeMode: "contain",
  },

  subtitle: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.muted,
    marginTop: 20, // Pulls it slightly closer to the logo text
  },
  divider: {
    height: 2,
    width: 40,
    backgroundColor: colors.border,
    marginVertical: 26,
  },
  clinic: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.5
  },

  footer: {
    position: "absolute",
    bottom: 45,
    alignItems: "center",
  },
  tapText: {
    fontSize: 12,
    color: colors.muted,
    fontFamily: fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4
  },
  version: {
    fontSize: 11,
    color: colors.muted,
    fontFamily: fonts.regular
  },
});