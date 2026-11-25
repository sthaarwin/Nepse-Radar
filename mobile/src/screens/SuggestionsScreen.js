import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { api } from "../services/api";
import Header from "../components/Header";
import SuggestionCard from "../components/SuggestionCard";
import StockDetailModal from "../components/StockDetailModal";

const FILTERS = [
  { key: "ALL", label: "All Signals", icon: "sparkles" },
  { key: "VOLUME_SURGE", label: "Heavy Volume", icon: "flame" },
  { key: "52W_BREAKOUT", label: "52W Breakout", icon: "rocket" },
  { key: "CORPORATE_CATALYST", label: "Catalysts", icon: "flash" },
  { key: "TREND_UP", label: "MA Uptrend", icon: "trending-up" },
  { key: "52W_REBOUND", label: "Dip Rebound", icon: "stats-chart" }
];

export default function SuggestionsScreen({ watchlist, onToggleWatchlist }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);

  const loadSuggestions = async () => {
    try {
      const res = await api.getSuggestions(selectedFilter);
      setSuggestions(res.suggestions || []);
    } catch (e) {
      console.warn("Failed to load suggestions:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, [selectedFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSuggestions();
  };

  const handleCardPress = async (item) => {
    try {
      const res = await api.getStockDetail(item.symbol);
      setSelectedStock(res.stock || item);
    } catch {
      setSelectedStock(item);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Stock Radar"
        subtitle="Algorithmic Ideas & Setups"
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {/* Filter Horizontal Scroll */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => {
            const active = selectedFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedFilter(f.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={f.icon}
                  size={13}
                  color={active ? "#fff" : colors.textSecondary}
                  style={styles.filterIcon}
                />
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Scanning Market for Signals...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {/* Signal Count Banner */}
          <View style={styles.banner}>
            <Ionicons name="scan" size={18} color={colors.primary} />
            <Text style={styles.bannerText}>
              <Text style={styles.bannerCount}>{suggestions.length}</Text> high-conviction ideas identified
            </Text>
          </View>

          {suggestions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No matching setups</Text>
              <Text style={styles.emptySubtitle}>
                No stocks currently meet this filter's technical criteria.
              </Text>
            </View>
          ) : (
            suggestions.map((item, index) => (
              <SuggestionCard
                key={`${item.symbol}-${index}`}
                item={item}
                onPress={handleCardPress}
                isWatched={watchlist.includes(item.symbol)}
                onToggleWatchlist={onToggleWatchlist}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Detail Modal */}
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
  filterContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  filterIcon: {
    marginRight: 5
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary
  },
  filterTextActive: {
    color: "#fff"
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
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(56, 139, 253, 0.1)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(56, 139, 253, 0.2)"
  },
  bannerText: {
    fontSize: 13,
    color: colors.textPrimary
  },
  bannerCount: {
    fontWeight: "700",
    color: colors.primary
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center"
  }
});
