import { colors } from '../theme/colors';
import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "../theme/fonts";

export default function CustomAlertModal({
  visible,
  type = "success", // 'success' | 'error' | 'warning' | 'info'
  title,
  message,
  details = [], // Array of { label: string, value: string, highlight?: boolean }
  primaryText = "OK",
  secondaryText = null,
  onPrimaryPress,
  onSecondaryPress,
}) {
  const getIconConfig = () => {
    switch (type) {
      case "success":
        return { name: "checkmark-circle", color: "#10B981", bg: "#ECFDF5" };
      case "error":
        return { name: "alert-circle", color: "#EF4444", bg: "#FEF2F2" };
      case "warning":
        return { name: "warning", color: "#F59E0B", bg: "#FFFBEB" };
      default:
        return { name: "information-circle", color: colors.accent, bg: colors.lavender };
    }
  };

  const icon = getIconConfig();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSecondaryPress || onPrimaryPress}>
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityViewIsModal>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ alignItems: 'center' }} showsVerticalScrollIndicator={false}>
          <View style={[styles.iconCircle, { backgroundColor: icon.bg }]}>
            <Ionicons name={icon.name} size={36} color={icon.color} />
          </View>

          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {details && details.length > 0 && (
            <View style={styles.detailsContainer}>
              {details.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.detailRow,
                    idx === details.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <Text style={styles.detailLabel}>{item.label}</Text>
                  <Text style={[styles.detailValue, item.highlight && styles.highlightText]}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.buttonRow}>
            {secondaryText && (
              <TouchableOpacity accessibilityRole="button" style={styles.secondaryBtn} onPress={onSecondaryPress}>
                <Text style={styles.secondaryText}>{secondaryText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity accessibilityRole="button" style={styles.primaryBtn} onPress={onPrimaryPress}>
              <Text style={styles.primaryText}>{primaryText}</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.ink,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  detailsContainer: {
    width: "100%",
    backgroundColor: colors.input,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.lavender,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.aquaSoft,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.muted,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.ink,
    maxWidth: "60%",
    textAlign: "right",
  },
  highlightText: {
    color: colors.accent,
    fontFamily: fonts.bold,
  },
  buttonRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.aquaSoft,
    minHeight: 50,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.muted,
  },
  primaryBtn: {
    flex: 1.2,
    backgroundColor: colors.primary,
    minHeight: 50,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.ink,
  },
});
