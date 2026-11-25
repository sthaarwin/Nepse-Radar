import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { api } from "../services/api";
import Header from "../components/Header";
import StockCard from "../components/StockCard";
import StockDetailModal from "../components/StockDetailModal";

export default function WatchlistScreen({ watchlist, onToggleWatchlist }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [watchedStocks, setWatchedStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  
  // Add Stock Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allStocks, setAllStocks] = useState([]);

  const loadWatchlistData = async () => {
    try {
      if (watchlist.length === 0) {
        setWatchedStocks([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const allRes = await api.getStocks("", "turnover", 350);
      const matched = (allRes.stocks || []).filter((s) => watchlist.includes(s.symbol));
      setWatchedStocks(matched);
      setAllStocks(allRes.stocks || []);
    } catch (e) {
      console.warn("Failed to load watchlist:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWatchlistData();
  }, [watchlist]);

  const onRefresh = () => {
    setRefreshing(true);
    loadWatchlistData();
  };

  const filteredSearchStocks = allStocks.filter(
    (s) =>
      s.symbol.includes(searchQuery.toUpperCase()) ||
      (s.name && s.name.toUpperCase().includes(searchQuery.toUpperCase()))
  );

  return (
    <View style={styles.container}>
      <Header
        title="My Watchlist"
        subtitle={`${watchlist.length} Securities Tracked`}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Loading Watchlist...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {/* Add Stock Action Bar */}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color={colors.primary} />
            <Text style={styles.addBtnText}>Add Symbol to Watchlist</Text>
          </TouchableOpacity>

          {watchlist.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Your Watchlist is Empty</Text>
              <Text style={styles.emptySubtitle}>
                Tap the star icon on any stock from Market or Radar to track it here.
              </Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.browseBtnText}>Search & Add Stocks</Text>
              </TouchableOpacity>
            </View>
          ) : (
            watchedStocks.map((item) => (
              <StockCard
                key={item.symbol}
                item={item}
                onPress={setSelectedStock}
                isWatched={true}
                onToggleWatchlist={onToggleWatchlist}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Add Stock Search Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={false} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalTopBar}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add to Watchlist</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.modalSearchRow}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search symbol (e.g. NABIL, ADBL, SHL)..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="characters"
              autoFocus
            />
          </View>

          <ScrollView contentContainerStyle={styles.modalList}>
            {filteredSearchStocks.slice(0, 30).map((s) => {
              const isAdded = watchlist.includes(s.symbol);
              return (
                <TouchableOpacity
                  key={s.symbol}
                  style={styles.modalStockRow}
                  onPress={() => onToggleWatchlist(s.symbol)}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={styles.modalStockSymbol}>{s.symbol}</Text>
                    <Text style={styles.modalStockPrice}>Rs. {s.ltp || "--"}</Text>
                  </View>
                  <View style={[styles.modalActionChip, isAdded && styles.modalActionChipAdded]}>
                    <Ionicons
                      name={isAdded ? "checkmark" : "add"}
                      size={14}
                      color={isAdded ? colors.bullish : colors.primary}
                    />
                    <Text style={[styles.modalActionText, isAdded && styles.modalActionTextAdded]}>
                      {isAdded ? "Added" : "Track"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

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
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 10
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18
  },
  browseBtn: {
    marginTop: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  browseBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background
  },
  modalTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center"
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary
  },
  modalSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 10,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder
  },
  modalSearchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14
  },
  modalList: {
    paddingHorizontal: 16
  },
  modalStockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder
  },
  modalStockSymbol: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary
  },
  modalStockPrice: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  modalActionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "rgba(56, 139, 253, 0.15)"
  },
  modalActionChipAdded: {
    backgroundColor: colors.bullishBg
  },
  modalActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary
  },
  modalActionTextAdded: {
    color: colors.bullish
  }
});
