import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

export default function Header({ title = "NepseRadar", subtitle, onRefresh, isRefreshing }) {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View style={styles.logoBadge}>
          <Ionicons name="pulse" size={18} color="#fff" />
        </View>
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      {onRefresh && (
        <TouchableOpacity
          style={[styles.refreshBtn, isRefreshing && styles.refreshing]}
          onPress={onRefresh}
          disabled={isRefreshing}
          activeOpacity={0.7}
        >
          <Ionicons
            name="refresh"
            size={18}
            color={isRefreshing ? colors.textMuted : colors.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.3
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center"
  },
  refreshing: {
    opacity: 0.5
  }
});
