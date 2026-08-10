import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { fonts } from "../theme/fonts";

export default function ScreenHeader({ title, showBack = false, rightIcon, onRightPress }) {
  const navigation = useNavigation();

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        {showBack ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} /> // Placeholder for balance
        )}

        <Text style={styles.title}>{title}</Text>

        {rightIcon ? (
          <TouchableOpacity onPress={onRightPress} style={styles.rightBtn}>
            <Ionicons name={rightIcon} size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} /> // Placeholder
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#001166",
    paddingTop: 60,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  backBtn: { padding: 4 },
  rightBtn: { padding: 4 },
});