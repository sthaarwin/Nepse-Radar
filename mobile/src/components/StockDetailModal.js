import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  Linking,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

function calculateTechnicals(stock) {
  const ltp = stock.ltp || stock.close || 0;
  const high = stock.high || ltp;
  const low = stock.low || ltp;
  const close = stock.close || ltp;
  const vwap = stock.vwap || 0;
  const avg120 = stock.avg_120 || 0;
  const avg180 = stock.avg_180 || 0;

  // Classic Floor Trader Pivot Points
  const pp = high && low && close ? (high + low + close) / 3 : ltp;
  const r1 = pp && low ? 2 * pp - low : ltp;
  const r2 = pp && high && low ? pp + (high - low) : ltp;
  const s1 = pp && high ? 2 * pp - high : ltp;
  const s2 = pp && high && low ? pp - (high - low) : ltp;

  // Moving Average & VWAP Differences (%)
  const vwapDiff = vwap > 0 ? ((ltp - vwap) / vwap) * 100 : null;
  const ma120Diff = avg120 > 0 ? ((ltp - avg120) / avg120) * 100 : null;
  const ma180Diff = avg180 > 0 ? ((ltp - avg180) / avg180) * 100 : null;

  // 52-Week Distances
  const dist52High = stock.high_52 > 0 ? ((stock.high_52 - ltp) / stock.high_52) * 100 : null;
  const dist52Low = stock.low_52 > 0 ? ((ltp - stock.low_52) / stock.low_52) * 100 : null;
  const dayRange = high && low ? high - low : 0;
  const dayRangePct = low > 0 ? (dayRange / low) * 100 : 0;

  // Algorithmic Sentiment Scoring
  let bullishCount = 0;
  let totalCount = 0;

  if (vwapDiff !== null) {
    totalCount++;
    if (vwapDiff >= 0) bullishCount++;
  }
  if (ma120Diff !== null) {
    totalCount++;
    if (ma120Diff >= 0) bullishCount++;
  }
  if (ma180Diff !== null) {
    totalCount++;
    if (ma180Diff >= 0) bullishCount++;
  }
  if (pp > 0) {
    totalCount++;
    if (ltp >= pp) bullishCount++;
  }

  let overallSignal = "NEUTRAL CONSOLIDATION";
  let signalColor = colors.neutral;
  let signalBg = colors.neutralBg;
  let signalDescription = "Price is hovering near equilibrium benchmarks.";

  if (totalCount > 0) {
    const ratio = bullishCount / totalCount;
    if (ratio >= 0.75) {
      overallSignal = "BULLISH BIAS";
      signalColor = colors.bullish;
      signalBg = colors.bullishBg;
      signalDescription = "Trading above key moving averages and VWAP with buyer strength.";
    } else if (ratio <= 0.25) {
      overallSignal = "BEARISH BIAS";
      signalColor = colors.bearish;
      signalBg = colors.bearishBg;
      signalDescription = "Trading below VWAP and moving averages with seller dominance.";
    }
  }

  return {
    pp: pp ? pp.toFixed(1) : "--",
    r1: r1 ? r1.toFixed(1) : "--",
    r2: r2 ? r2.toFixed(1) : "--",
    s1: s1 ? s1.toFixed(1) : "--",
    s2: s2 ? s2.toFixed(1) : "--",
    vwapDiff,
    ma120Diff,
    ma180Diff,
    dist52High,
    dist52Low,
    dayRange: dayRange ? dayRange.toFixed(2) : "0.00",
    dayRangePct: dayRangePct ? dayRangePct.toFixed(2) : "0.00",
    overallSignal,
    signalColor,
    signalBg,
    signalDescription
  };
}

export default function StockDetailModal({
  visible,
  stock,
  onClose,
  isWatched,
  onToggleWatchlist
}) {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "technical"

  if (!stock) return null;

  const isPositive = (stock.pct_change || 0) >= 0;
  const turnoverCrores = stock.turnover ? (stock.turnover / 10_000_000).toFixed(2) : "0.00";

  let rangePct = 50;
  if (stock.high_52 > stock.low_52 && stock.ltp) {
    rangePct = Math.max(0, Math.min(100, ((stock.ltp - stock.low_52) / (stock.high_52 - stock.low_52)) * 100));
  }

  const technicals = calculateTechnicals(stock);

  const handleOpenUrl = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Cannot Open URL", `Unable to launch browser for: ${url}`);
      }
    } catch {
      Linking.openURL(url).catch(() => {});
    }
  };

  const nepseAlphaUrl = `https://nepsealpha.com/trading/chart?symbol=${stock.symbol}`;
  const merolaganiUrl = `https://merolagani.com/CompanyDetail.aspx?symbol=${stock.symbol}`;
  const chukulUrl = `https://chukul.com/technical-chart?symbol=${stock.symbol}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} translucent={false} />
        
        <View style={styles.container}>
          {/* Modal Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>{stock.symbol} Overview</Text>
              <Text style={styles.headerSubtitle}>{stock.sector || "NEPSE Listed"}</Text>
            </View>

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

          {/* Segmented Tab Selector */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "overview" && styles.tabBtnActive]}
              onPress={() => setActiveTab("overview")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="stats-chart"
                size={16}
                color={activeTab === "overview" ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.tabBtnText, activeTab === "overview" && styles.tabBtnTextActive]}>
                Key Metrics
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "technical" && styles.tabBtnActive]}
              onPress={() => setActiveTab("technical")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="analytics"
                size={16}
                color={activeTab === "technical" ? colors.cyan : colors.textMuted}
              />
              <Text style={[styles.tabBtnText, activeTab === "technical" && styles.tabBtnTextActive]}>
                Technical Analysis
              </Text>
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>CHART</Text>
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Hero Price Card (Always visible) */}
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

            {/* TAB 1: OVERVIEW & KEY METRICS */}
            {activeTab === "overview" && (
              <View>
                {/* Technical Analysis Quick Banner Button */}
                <TouchableOpacity
                  style={styles.techBannerBtn}
                  onPress={() => setActiveTab("technical")}
                  activeOpacity={0.8}
                >
                  <View style={styles.techBannerLeft}>
                    <View style={styles.techBannerIcon}>
                      <Ionicons name="analytics" size={20} color={colors.cyan} />
                    </View>
                    <View>
                      <Text style={styles.techBannerTitle}>Technical Analysis & Live Chart</Text>
                      <Text style={styles.techBannerSub}>
                        Pivots, Moving Averages & TradingView Candles
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.cyan} />
                </TouchableOpacity>

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
                    <Text style={styles.metricValue}>
                      {stock.volume ? stock.volume.toLocaleString() : "--"} sh
                    </Text>
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
              </View>
            )}

            {/* TAB 2: TECHNICAL ANALYSIS & CHART */}
            {activeTab === "technical" && (
              <View>
                {/* Live Interactive Chart Launchers */}
                <Text style={styles.sectionHeader}>Interactive Technical Charts</Text>

                <TouchableOpacity
                  style={styles.chartLaunchBtn}
                  onPress={() => handleOpenUrl(nepseAlphaUrl)}
                  activeOpacity={0.8}
                >
                  <View style={styles.chartLaunchIcon}>
                    <Ionicons name="trending-up" size={22} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chartLaunchTitle}>Open Live TradingView Chart</Text>
                    <Text style={styles.chartLaunchSub}>
                      Candlesticks, RSI, MACD & Drawing Tools (NepseAlpha)
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color="#fff" />
                </TouchableOpacity>

                <View style={styles.secondaryChartRow}>
                  <TouchableOpacity
                    style={styles.secondaryChartBtn}
                    onPress={() => handleOpenUrl(merolaganiUrl)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
                    <Text style={styles.secondaryChartText}>Merolagani Profile</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryChartBtn}
                    onPress={() => handleOpenUrl(chukulUrl)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="analytics-outline" size={16} color={colors.cyan} />
                    <Text style={styles.secondaryChartText}>Chukul Technicals</Text>
                  </TouchableOpacity>
                </View>

                {/* Overall Technical Bias Card */}
                <View style={styles.sentimentCard}>
                  <View style={styles.sentimentTop}>
                    <View>
                      <Text style={styles.sentimentLabel}>Algorithmic Sentiment</Text>
                      <Text style={styles.sentimentSub}>{technicals.signalDescription}</Text>
                    </View>
                    <View style={[styles.sentimentBadge, { backgroundColor: technicals.signalBg }]}>
                      <Text style={[styles.sentimentBadgeText, { color: technicals.signalColor }]}>
                        {technicals.overallSignal}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Moving Average & Benchmark Comparison */}
                <Text style={styles.sectionHeader}>Trend & Moving Averages</Text>
                <View style={styles.taGrid}>
                  <View style={styles.taCard}>
                    <Text style={styles.taLabel}>VWAP (Intraday Benchmark)</Text>
                    <Text style={styles.taValue}>Rs. {stock.vwap || "--"}</Text>
                    {technicals.vwapDiff !== null && (
                      <Text
                        style={[
                          styles.taSubText,
                          { color: technicals.vwapDiff >= 0 ? colors.bullish : colors.bearish }
                        ]}
                      >
                        {technicals.vwapDiff >= 0 ? "+" : ""}
                        {technicals.vwapDiff.toFixed(2)}% vs LTP
                      </Text>
                    )}
                  </View>

                  <View style={styles.taCard}>
                    <Text style={styles.taLabel}>120-Day Moving Avg</Text>
                    <Text style={styles.taValue}>Rs. {stock.avg_120 || "--"}</Text>
                    {technicals.ma120Diff !== null && (
                      <Text
                        style={[
                          styles.taSubText,
                          { color: technicals.ma120Diff >= 0 ? colors.bullish : colors.bearish }
                        ]}
                      >
                        {technicals.ma120Diff >= 0 ? "+" : ""}
                        {technicals.ma120Diff.toFixed(2)}% (Medium-term)
                      </Text>
                    )}
                  </View>

                  <View style={styles.taCard}>
                    <Text style={styles.taLabel}>180-Day Moving Avg</Text>
                    <Text style={styles.taValue}>Rs. {stock.avg_180 || "--"}</Text>
                    {technicals.ma180Diff !== null && (
                      <Text
                        style={[
                          styles.taSubText,
                          { color: technicals.ma180Diff >= 0 ? colors.bullish : colors.bearish }
                        ]}
                      >
                        {technicals.ma180Diff >= 0 ? "+" : ""}
                        {technicals.ma180Diff.toFixed(2)}% (Long-term)
                      </Text>
                    )}
                  </View>

                  <View style={styles.taCard}>
                    <Text style={styles.taLabel}>Intraday Volatility Spread</Text>
                    <Text style={styles.taValue}>Rs. {technicals.dayRange}</Text>
                    <Text style={[styles.taSubText, { color: colors.cyan }]}>
                      {technicals.dayRangePct}% High-to-Low
                    </Text>
                  </View>
                </View>

                {/* Classic Floor Trader Pivot Points */}
                <Text style={styles.sectionHeader}>Floor Trader Pivot Points</Text>
                <View style={styles.pivotsCard}>
                  <View style={styles.pivotRow}>
                    <View style={styles.pivotBadgeR}>
                      <Text style={styles.pivotBadgeText}>R2 (Major Resistance)</Text>
                    </View>
                    <Text style={[styles.pivotPrice, { color: colors.bearish }]}>
                      Rs. {technicals.r2}
                    </Text>
                  </View>

                  <View style={styles.pivotRow}>
                    <View style={styles.pivotBadgeR}>
                      <Text style={styles.pivotBadgeText}>R1 (Primary Resistance)</Text>
                    </View>
                    <Text style={[styles.pivotPrice, { color: colors.bearish }]}>
                      Rs. {technicals.r1}
                    </Text>
                  </View>

                  <View style={[styles.pivotRow, styles.pivotRowPivot]}>
                    <View style={styles.pivotBadgePP}>
                      <Text style={styles.pivotBadgePPText}>Pivot Point (PP)</Text>
                    </View>
                    <Text style={[styles.pivotPrice, { color: colors.cyan, fontWeight: "800" }]}>
                      Rs. {technicals.pp}
                    </Text>
                  </View>

                  <View style={styles.pivotRow}>
                    <View style={styles.pivotBadgeS}>
                      <Text style={styles.pivotBadgeText}>S1 (Primary Support)</Text>
                    </View>
                    <Text style={[styles.pivotPrice, { color: colors.bullish }]}>
                      Rs. {technicals.s1}
                    </Text>
                  </View>

                  <View style={styles.pivotRow}>
                    <View style={styles.pivotBadgeS}>
                      <Text style={styles.pivotBadgeText}>S2 (Major Demand Floor)</Text>
                    </View>
                    <Text style={[styles.pivotPrice, { color: colors.bullish }]}>
                      Rs. {technicals.s2}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === "android" ? Math.max(StatusBar.currentHeight || 0, 36) : 0
  },
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
  titleContainer: {
    alignItems: "center"
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1
  },
  starBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center"
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6
  },
  tabBtnActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted
  },
  tabBtnTextActive: {
    color: colors.textPrimary,
    fontWeight: "700"
  },
  tabBadge: {
    backgroundColor: colors.cyanBg,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4
  },
  tabBadgeText: {
    color: colors.cyan,
    fontSize: 9,
    fontWeight: "800"
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
    marginBottom: 16
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
  techBannerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(57, 197, 207, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(57, 197, 207, 0.25)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16
  },
  techBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1
  },
  techBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.cyanBg,
    alignItems: "center",
    justifyContent: "center"
  },
  techBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary
  },
  techBannerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 6
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
  },
  chartLaunchBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 10
  },
  chartLaunchIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center"
  },
  chartLaunchTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff"
  },
  chartLaunchSub: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2
  },
  secondaryChartRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16
  },
  secondaryChartBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder
  },
  secondaryChartText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary
  },
  sentimentCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16
  },
  sentimentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sentimentLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary
  },
  sentimentSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    maxWidth: 220
  },
  sentimentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  sentimentBadgeText: {
    fontSize: 11,
    fontWeight: "800"
  },
  taGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16
  },
  taCard: {
    width: "48%",
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder
  },
  taLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4
  },
  taValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary
  },
  taSubText: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4
  },
  pivotsCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 20
  },
  pivotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  pivotRowPivot: {
    backgroundColor: "rgba(57, 197, 207, 0.06)",
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  pivotBadgeR: {
    backgroundColor: colors.bearishBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  pivotBadgeS: {
    backgroundColor: colors.bullishBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  pivotBadgePP: {
    backgroundColor: colors.cyanBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  pivotBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary
  },
  pivotBadgePPText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.cyan
  },
  pivotPrice: {
    fontSize: 14,
    fontWeight: "700"
  }
});
