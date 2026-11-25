import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "./src/theme/colors";
import { storage } from "./src/services/storage";

import MarketScreen from "./src/screens/MarketScreen";
import SuggestionsScreen from "./src/screens/SuggestionsScreen";
import NewsScreen from "./src/screens/NewsScreen";
import WatchlistScreen from "./src/screens/WatchlistScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

const TABS = [
  { key: "market", label: "Market", icon: "stats-chart", activeIcon: "stats-chart" },
  { key: "radar", label: "Radar", icon: "scan-outline", activeIcon: "scan" },
  { key: "news", label: "News", icon: "newspaper-outline", activeIcon: "newspaper" },
  { key: "watchlist", label: "Watchlist", icon: "star-outline", activeIcon: "star" },
  { key: "settings", label: "Settings", icon: "settings-outline", activeIcon: "settings" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState("market");
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    storage.getWatchlist().then(setWatchlist);
  }, []);

  const handleToggleWatchlist = async (symbol) => {
    const upper = symbol.toUpperCase();
    if (watchlist.includes(upper)) {
      const updated = await storage.removeFromWatchlist(upper);
      setWatchlist(updated);
    } else {
      const updated = await storage.addToWatchlist(upper);
      setWatchlist(updated);
    }
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case "market":
        return <MarketScreen watchlist={watchlist} onToggleWatchlist={handleToggleWatchlist} />;
      case "radar":
        return <SuggestionsScreen watchlist={watchlist} onToggleWatchlist={handleToggleWatchlist} />;
      case "news":
        return <NewsScreen />;
      case "watchlist":
        return <WatchlistScreen watchlist={watchlist} onToggleWatchlist={handleToggleWatchlist} />;
      case "settings":
        return <SettingsScreen />;
      default:
        return <MarketScreen watchlist={watchlist} onToggleWatchlist={handleToggleWatchlist} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={colors.background} />

      {/* Screen Body */}
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const isRadar = tab.key === "radar";
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.navItem, isRadar && styles.radarNavItem]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrapper, isRadar && isActive && styles.radarActiveIcon]}>
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={isRadar ? 22 : 20}
                  color={isActive ? (isRadar ? "#fff" : colors.primary) : colors.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.navLabel,
                  isActive && styles.navLabelActive,
                  isRadar && isActive && { color: colors.cyan }
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === "android" ? 30 : 0
  },
  screenContainer: {
    flex: 1
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: "space-around",
    alignItems: "center"
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    flex: 1
  },
  radarNavItem: {
    position: "relative"
  },
  iconWrapper: {
    marginBottom: 3
  },
  radarActiveIcon: {
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted
  },
  navLabelActive: {
    color: colors.primary
  }
});
