import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

export default function StockDetailModal({
  visible,
  stock,
  onClose,
  isWatched,
  onToggleWatchlist
}) {
  if (!stock) return null;

  const isPositive = (stock.pct_change || 0) >= 0;
  const turnoverCrores = stock.turnover ? (stock.turnover / 10_000_000).toFixed(2) : "0.00";

  let rangePct = 50;
  if (stock.high_52 > stock.low_52 && stock.ltp) {
    rangePct = Math.max(0, Math.min(100, ((stock.ltp - stock.low_52) / (stock.high_52 - stock.low_52)) * 100));
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Modal Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{stock.symbol} Overview</Text>
          <TouchableOpacity
            onPress={() => onToggleWatchlist && onToggleWatchlist(stock.symbol)}
            style={styles.starBtn}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isWatched ? "star" : "star-outline"}
              size={22}
              color={isWatched ? colors.neutral : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Hero Price Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroSymbol}>{stock.symbol}</Text>
                <Text style={styles.heroSector}>{stock.sector || "NEPSE Listed"}</Text>
              </View>
              <View style={styles.heroPriceGroup}>
                <Text style={styles.heroLtp}>Rs. {stock.ltp ? stock.ltp.toLocaleString() : "--"}</Text>
                <View
                  style={[
                    styles.heroChangeBadge,
                    { backgroundColor: isPositive ? colors.bullishBg : colors.bearishBg }
                  ]}
                >
                  <Text
                    style={[
                      styles.heroChangeText,
                      { color: isPositive ? colors.bullish : colors.bearish }
                    ]}
                  >
                    {isPositive ? "+" : ""}
                    {stock.point_change ? stock.point_change.toFixed(2) : "0.00"} ({isPositive ? "+" : ""}
                    {stock.pct_change ? stock.pct_change.toFixed(2) : "0.00"}%)
                  </Text>
                </View>
              </View>
            </View>

            {/* 52-Week Range Bar */}
            <View style={styles.rangeSection}>
              <View style={styles.rangeLabelsRow}>
                <Text style={styles.rangeLabel}>52W Low: Rs. {stock.low_52 || "--"}</Text>
                <Text style={styles.rangeLabel}>52W High: Rs. {stock.high_52 || "--"}</Text>
              </View>
              <View style={styles.rangeTrack}>
                <View style={[styles.rangeThumb, { left: `${rangePct}%` }]} />
              </View>
              <Text style={styles.rangePositionText}>
                Trading at {rangePct.toFixed(1)}% of 52-Week Range
              </Text>
            </View>
          </View>

          {/* Key Trading Metrics Grid */}
          <Text style={styles.sectionHeader}>Key Trading Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Open</Text>
              <Text style={styles.metricValue}>Rs. {stock.open || "--"}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Day High</Text>
              <Text style={[styles.metricValue, { color: colors.bullish }]}>Rs. {stock.high || "--"}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Day Low</Text>
              <Text style={[styles.metricValue, { color: colors.bearish }]}>Rs. {stock.low || "--"}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Prev. Close</Text>
              <Text style={styles.metricValue}>Rs. {stock.prev_close || "--"}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>VWAP</Text>
              <Text style={styles.metricValue}>Rs. {stock.vwap || "--"}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Volume</Text>
              <Text style={styles.metricValue}>{stock.volume ? stock.volume.toLocaleString() : "--"} sh</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Turnover</Text>
              <Text style={styles.metricValue}>Rs. {turnoverCrores} Cr</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Trades</Text>
              <Text style={styles.metricValue}>{stock.transactions || "--"}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>120-Day MA</Text>
              <Text style={styles.metricValue}>Rs. {stock.avg_120 || "--"}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>180-Day MA</Text>
              <Text style={styles.metricValue}>Rs. {stock.avg_180 || "--"}</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary
  },
  starBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center"
  },
  scrollContent: {
    padding: 16
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 20
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16
  },
  heroSymbol: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 0.5
  },
  heroSector: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2
  },
  heroPriceGroup: {
    alignItems: "flex-end"
  },
  heroLtp: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary
  },
  heroChangeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4
  },
  heroChangeText: {
    fontSize: 12,
    fontWeight: "700"
  },
  rangeSection: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  rangeLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  rangeLabel: {
    fontSize: 11,
    color: colors.textMuted
  },
  rangeTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    position: "relative"
  },
  rangeThumb: {
    position: "absolute",
    top: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.cyan,
    marginLeft: -7,
    borderWidth: 2,
    borderColor: "#fff"
  },
  rangePositionText: {
    fontSize: 11,
    color: colors.cyan,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  metricItem: {
    width: "48%",
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 4
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary
  }
});
