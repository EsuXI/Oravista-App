import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AuthGate from "./AuthGate";
import MainTabNavigator from "./MainTabNavigator";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen"; 
import OtpVerificationScreen from "../screens/OtpVerificationScreen";
import BookingScreen from "../screens/BookingScreen";
import SplashScreen from "../screens/SplashScreen";
import LandingScreen from "../screens/LandingScreen";

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ['oravista://'],
  config: {
    screens: {
      ResetPassword: 'reset-password', 
    },
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
        
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="AuthGate" component={AuthGate} />

        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} /> 
        
        <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} /> 

        <Stack.Screen name="Home" component={MainTabNavigator} />
        <Stack.Screen name="Booking" component={BookingScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}