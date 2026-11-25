import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

export default function StockCard({ item, onPress, isWatched, onToggleWatchlist }) {
  const isPositive = (item.pct_change || 0) >= 0;
  const turnoverCrores = item.turnover ? (item.turnover / 10_000_000).toFixed(2) : "0.00";

  // Calculate 52w position percentage
  let rangePct = 50;
  if (item.high_52 > item.low_52 && item.ltp) {
    rangePct = Math.max(0, Math.min(100, ((item.ltp - item.low_52) / (item.high_52 - item.low_52)) * 100));
  }

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress && onPress(item)} activeOpacity={0.7}>
      <View style={styles.leftCol}>
        <View style={styles.symbolRow}>
          <Text style={styles.symbol}>{item.symbol}</Text>
          <TouchableOpacity
            onPress={() => onToggleWatchlist && onToggleWatchlist(item.symbol)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isWatched ? "star" : "star-outline"}
              size={16}
              color={isWatched ? colors.neutral : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.subText}>
          {item.transactions ? `${item.transactions} trades • ` : ""}
          Rs. {turnoverCrores} Cr
        </Text>
      </View>

      <View style={styles.rightCol}>
        <Text style={styles.ltp}>Rs. {item.ltp ? item.ltp.toLocaleString() : "--"}</Text>
        <View
          style={[
            styles.changeBadge,
            { backgroundColor: isPositive ? colors.bullishBg : colors.bearishBg }
          ]}
        >
          <Text
            style={[
              styles.changeText,
              { color: isPositive ? colors.bullish : colors.bearish }
            ]}
          >
            {isPositive ? "+" : ""}
            {item.pct_change?.toFixed(2)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder
  },
  leftCol: {
    flex: 1
  },
  symbolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3
  },
  symbol: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.3
  },
  subText: {
    fontSize: 11,
    color: colors.textSecondary
  },
  rightCol: {
    alignItems: "flex-end"
  },
  ltp: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 3
  },
  changeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  changeText: {
    fontSize: 11,
    fontWeight: "600"
  }
});
