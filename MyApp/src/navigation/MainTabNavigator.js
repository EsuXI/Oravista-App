import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

import HomeScreen from "../screens/HomeScreen";
import ServicesScreen from "../screens/ServicesScreen";
import AppointmentsScreen from "../screens/AppointmentsScreen";
import RecordsScreen from "../screens/RecordsScreen";
import ProfileStackNavigator from "./ProfileStackNavigator";

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: colors.aquaSoft,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontFamily: fonts.semiBold, fontSize: 10 },
        tabBarItemStyle: { borderRadius: 22, marginHorizontal: 3, paddingVertical: 5 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 66 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          paddingHorizontal: 6,
          elevation: 0,
        },
        tabBarIcon: ({ color, focused }) => {
          let iconName;

          if (route.name === "Home") iconName = "home-outline";
          else if (route.name === "Services") iconName = "briefcase-outline";
          else if (route.name === "Appointments") iconName = "calendar-outline";
          else if (route.name === "Records") iconName = "document-text-outline";
          else if (route.name === "Profile") iconName = "person-outline";

          return <Ionicons name={focused ? iconName.replace('-outline', '') : iconName} size={21} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Services" component={ServicesScreen} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} options={{ tabBarLabel: 'Visits' }} />
      <Tab.Screen name="Records" component={RecordsScreen} />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Reset to the root profile screen whenever tab is pressed
            navigation.navigate("Profile", { screen: "ProfileMain" });
          },
        })}
      />
    </Tab.Navigator>
  );
}
