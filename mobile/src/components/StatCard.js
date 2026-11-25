import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export default function StatCard({ label, value, subValue, isPositive, isNegative, icon }) {
  let valueColor = colors.textPrimary;
  if (isPositive) valueColor = colors.bullish;
  if (isNegative) valueColor = colors.bearish;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      {subValue ? <Text style={styles.subValue}>{subValue}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minWidth: 100,
    flex: 1
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
    marginBottom: 4,
    textTransform: "uppercase"
  },
  value: {
    fontSize: 16,
    fontWeight: "700"
  },
  subValue: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  }
});
