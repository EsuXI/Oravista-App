import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
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
        return { name: "information-circle", color: "#001166", bg: "#EEF2FF" };
    }
  };

  const icon = getIconConfig();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onPrimaryPress}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: icon.bg }]}>
            <Ionicons name={icon.name} size={36} color={icon.color} />
          </View>

          <Text style={styles.title}>{title}</Text>
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
              <TouchableOpacity style={styles.secondaryBtn} onPress={onSecondaryPress}>
                <Text style={styles.secondaryText}>{secondaryText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.primaryBtn} onPress={onPrimaryPress}>
              <Text style={styles.primaryText}>{primaryText}</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  detailsContainer: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#EEF2FF",
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: "#111827",
    maxWidth: "60%",
    textAlign: "right",
  },
  highlightText: {
    color: "#001166",
    fontFamily: fonts.bold,
  },
  buttonRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    height: 50,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: "#4B5563",
  },
  primaryBtn: {
    flex: 1.2,
    backgroundColor: "#001166",
    height: 50,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: "#FFFFFF",
  },
});