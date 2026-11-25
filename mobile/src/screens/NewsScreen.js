import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { api } from "../services/api";
import Header from "../components/Header";
import NewsCard from "../components/NewsCard";

export default function NewsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [news, setNews] = useState([]);
  const [activeSymbolFilter, setActiveSymbolFilter] = useState("");

  const loadNews = async () => {
    try {
      const res = await api.getNews(40, activeSymbolFilter);
      setNews(res.news || []);
    } catch (e) {
      console.warn("Failed to load news:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, [activeSymbolFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNews();
  };

  return (
    <View style={styles.container}>
      <Header
        title="Market News"
        subtitle="Sharesansar & Merolagani Live Feed"
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {activeSymbolFilter ? (
        <View style={styles.filterBar}>
          <Text style={styles.filterBarText}>
            Showing news for: <Text style={styles.filterSymbol}>{activeSymbolFilter}</Text>
          </Text>
          <TouchableOpacity onPress={() => setActiveSymbolFilter("")} style={styles.clearFilterBtn}>
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            <Text style={styles.clearFilterText}>Show All</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Fetching Financial News...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {news.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="newspaper-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No news found</Text>
              <Text style={styles.emptySubtitle}>
                No articles matched the current criteria.
              </Text>
            </View>
          ) : (
            news.map((item) => (
              <NewsCard
                key={item.id || item.title}
                item={item}
                onSelectSymbol={(sym) => setActiveSymbolFilter(sym)}
              />
            ))
          )}
        </ScrollView>
      )}
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
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  filterBarText: {
    fontSize: 13,
    color: colors.textSecondary
  },
  filterSymbol: {
    fontWeight: "700",
    color: colors.cyan
  },
  clearFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  clearFilterText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  scrollContent: {
    padding: 16
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
