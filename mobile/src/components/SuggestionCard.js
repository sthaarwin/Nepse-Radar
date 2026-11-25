import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

const SIGNAL_CONFIG = {
  VOLUME_SURGE: {
    label: "Heavy Volume",
    icon: "flame",
    color: colors.orange,
    bg: colors.orangeBg
  },
  "52W_BREAKOUT": {
    label: "52W Breakout",
    icon: "rocket",
    color: colors.purple,
    bg: colors.purpleBg
  },
  "52W_REBOUND": {
    label: "Dip Rebound",
    icon: "trending-up",
    color: colors.cyan,
    bg: colors.cyanBg
  },
  CORPORATE_CATALYST: {
    label: "Catalyst Event",
    icon: "flash",
    color: colors.neutral,
    bg: colors.neutralBg
  },
  TREND_UP: {
    label: "MA Uptrend",
    icon: "stats-chart",
    color: colors.bullish,
    bg: colors.bullishBg
  }
};

export default function SuggestionCard({
  item,
  onPress,
  isWatched,
  onToggleWatchlist
}) {
  const signal = SIGNAL_CONFIG[item.signal_type] || {
    label: item.signal_type || "Signal",
    icon: "bulb",
    color: colors.primary,
    bg: "rgba(56, 139, 253, 0.15)"
  };

  const isPositive = (item.pct_change || 0) >= 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(item)}
      activeOpacity={0.8}
    >
      {/* Top Header: Symbol, Price, & Watch button */}
      <View style={styles.topRow}>
        <View style={styles.symbolGroup}>
          <Text style={styles.symbol}>{item.symbol}</Text>
          <View style={[styles.signalBadge, { backgroundColor: signal.bg }]}>
            <Ionicons name={signal.icon} size={12} color={signal.color} />
            <Text style={[styles.signalText, { color: signal.color }]}>
              {signal.label}
            </Text>
          </View>
        </View>

        <View style={styles.priceGroup}>
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
      </View>

      {/* Rationale explanation */}
      <Text style={styles.rationale} numberOfLines={3}>
        {item.rationale || item.title}
      </Text>

      {/* Bottom Bar: Conviction Score & Action */}
      <View style={styles.bottomRow}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Conviction Score</Text>
          <View style={styles.scoreBarTrack}>
            <View
              style={[
                styles.scoreBarFill,
                { width: `${Math.min(100, item.score || 70)}%` }
              ]}
            />
          </View>
          <Text style={styles.scoreValue}>{item.score || 80}/100</Text>
        </View>

        <TouchableOpacity
          style={[styles.watchBtn, isWatched && styles.watchBtnActive]}
          onPress={() => onToggleWatchlist && onToggleWatchlist(item.symbol)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isWatched ? "star" : "star-outline"}
            size={14}
            color={isWatched ? colors.neutral : colors.textSecondary}
          />
          <Text style={[styles.watchBtnText, isWatched && styles.watchBtnTextActive]}>
            {isWatched ? "Watching" : "Watch"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10
  },
  symbolGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    flex: 1
  },
  symbol: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.5
  },
  signalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  signalText: {
    fontSize: 11,
    fontWeight: "600"
  },
  priceGroup: {
    alignItems: "flex-end"
  },
  ltp: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary
  },
  changeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2
  },
  changeText: {
    fontSize: 12,
    fontWeight: "600"
  },
  rationale: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1
  },
  scoreLabel: {
    fontSize: 11,
    color: colors.textMuted
  },
  scoreBarTrack: {
    width: 60,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: "hidden"
  },
  scoreBarFill: {
    height: "100%",
    backgroundColor: colors.bullish,
    borderRadius: 3
  },
  scoreValue: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textPrimary
  },
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.cardHover,
    borderWidth: 1,
    borderColor: colors.cardBorder
  },
  watchBtnActive: {
    borderColor: colors.neutral
  },
  watchBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500"
  },
  watchBtnTextActive: {
    color: colors.neutral,
    fontWeight: "600"
  }
});
