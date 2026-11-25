import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { api } from "../services/api";
import Header from "../components/Header";
import StatCard from "../components/StatCard";
import StockCard from "../components/StockCard";
import StockDetailModal from "../components/StockDetailModal";

export default function MarketScreen({ watchlist, onToggleWatchlist }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marketData, setMarketData] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedStock, setSelectedStock] = useState(null);

  const loadData = async () => {
    try {
      const [marketRes, stocksRes] = await Promise.all([
        api.getMarketOverview(),
        api.getStocks(search, "turnover", 40)
      ]);
      setMarketData(marketRes);
      setStocks(stocksRes.stocks || []);
    } catch (e) {
      console.warn("Failed to load market data:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const summary = marketData?.summary || {};
  const turnoverCr = summary.total_turnover ? (summary.total_turnover / 10_000_000).toFixed(2) : "0.00";
  const isIndexPositive = (summary.index_change || 0) >= 0;

  return (
    <View style={styles.container}>
      <Header
        title="NepseRadar"
        subtitle="Nepal Stock Exchange Live"
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Loading NEPSE Data...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {/* Hero NEPSE Index Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.indexLabel}>NEPSE INDEX</Text>
                <Text style={styles.indexValue}>
                  {summary.nepse_index ? summary.nepse_index.toFixed(2) : "2,720.45"}
                </Text>
              </View>
              <View
                style={[
                  styles.indexChangeBadge,
                  { backgroundColor: isIndexPositive ? colors.bullishBg : colors.bearishBg }
                ]}
              >
                <Ionicons
                  name={isIndexPositive ? "trending-up" : "trending-down"}
                  size={16}
                  color={isIndexPositive ? colors.bullish : colors.bearish}
                />
                <Text
                  style={[
                    styles.indexChangeText,
                    { color: isIndexPositive ? colors.bullish : colors.bearish }
                  ]}
                >
                  {isIndexPositive ? "+" : ""}
                  {summary.index_change ? summary.index_change.toFixed(2) : "0.00"} (
                  {isIndexPositive ? "+" : ""}
                  {summary.index_pct_change ? summary.index_pct_change.toFixed(2) : "0.00"}%)
                </Text>
              </View>
            </View>

            {/* Breadth Bar: Advances vs Declines */}
            <View style={styles.breadthContainer}>
              <View style={styles.breadthLabelRow}>
                <Text style={[styles.breadthText, { color: colors.bullish }]}>
                  ▲ {summary.advances || 0} Advances
                </Text>
                <Text style={[styles.breadthText, { color: colors.textMuted }]}>
                  • {summary.unchanged || 0}
                </Text>
                <Text style={[styles.breadthText, { color: colors.bearish }]}>
                  ▼ {summary.declines || 0} Declines
                </Text>
              </View>
              <View style={styles.breadthTrack}>
                <View
                  style={[
                    styles.breadthFillGreen,
                    {
                      flex: Math.max(1, summary.advances || 1)
                    }
                  ]}
                />
                <View
                  style={[
                    styles.breadthFillRed,
                    {
                      flex: Math.max(1, summary.declines || 1)
                    }
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Market Stat Chips */}
          <View style={styles.statGrid}>
            <StatCard label="Turnover" value={`Rs. ${turnoverCr} Cr`} subValue="Total Value" />
            <StatCard
              label="Shares"
              value={summary.total_shares ? `${(summary.total_shares / 100000).toFixed(1)}L` : "--"}
              subValue="Volume"
            />
            <StatCard
              label="Trades"
              value={summary.total_transactions ? summary.total_transactions.toLocaleString() : "--"}
              subValue="Transactions"
            />
          </View>

          {/* Search Bar */}
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search 350+ stocks (e.g. NABIL, SHL)..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="characters"
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Stocks List */}
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionTitle}>
              {search ? `Search Results (${stocks.length})` : "Active Trading Securities"}
            </Text>
            <Text style={styles.sortedByText}>By Turnover</Text>
          </View>

          {stocks.map((item) => (
            <StockCard
              key={item.symbol}
              item={item}
              onPress={setSelectedStock}
              isWatched={watchlist.includes(item.symbol)}
              onToggleWatchlist={onToggleWatchlist}
            />
          ))}
        </ScrollView>
      )}

      {/* Stock Deep-Dive Modal */}
      <StockDetailModal
        visible={!!selectedStock}
        stock={selectedStock}
        onClose={() => setSelectedStock(null)}
        isWatched={selectedStock ? watchlist.includes(selectedStock.symbol) : false}
        onToggleWatchlist={onToggleWatchlist}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  loaderText: {
    color: colors.textSecondary,
    fontSize: 14
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
    marginBottom: 14
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14
  },
  indexLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.5
  },
  indexValue: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 2
  },
  indexChangeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  indexChangeText: {
    fontSize: 13,
    fontWeight: "700"
  },
  breadthContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  breadthLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6
  },
  breadthText: {
    fontSize: 11,
    fontWeight: "600"
  },
  breadthTrack: {
    height: 6,
    borderRadius: 3,
    flexDirection: "row",
    overflow: "hidden"
  },
  breadthFillGreen: {
    backgroundColor: colors.bullish
  },
  breadthFillRed: {
    backgroundColor: colors.bearish
  },
  statGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary
  },
  sortedByText: {
    fontSize: 12,
    color: colors.textMuted
  }
});
