import React from "react";
import { ActivityIndicator, View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import AppNavigator from "./src/navigation/AppNavigator";
import { colors } from './src/theme/colors';

export default function App() {
  const [loaded, error] = useFonts({
    Poppins_400Regular: require('@expo-google-fonts/poppins/400Regular/Poppins_400Regular.ttf'),
    Poppins_500Medium: require('@expo-google-fonts/poppins/500Medium/Poppins_500Medium.ttf'),
    Poppins_600SemiBold: require('@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf'),
    Poppins_700Bold: require('@expo-google-fonts/poppins/700Bold/Poppins_700Bold.ttf'),
  });
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.accent} accessibilityLabel="Loading OraVista" /><Text style={{ color: colors.ink, marginTop: 12 }}>OraVista</Text></View>;
  return <SafeAreaProvider initialMetrics={initialWindowMetrics}><StatusBar style="dark" /><AppNavigator /></SafeAreaProvider>;
}
