import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { storage } from "../services/storage";
import { api } from "../services/api";
import Header from "../components/Header";

export default function SettingsScreen() {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // 'connected' | 'failed'
  const [statusMessage, setStatusMessage] = useState("");
  const [refreshingBackend, setRefreshingBackend] = useState(false);

  useEffect(() => {
    storage.getApiUrl().then(setApiUrl);
    storage.getApiKey().then(setApiKey);
  }, []);

  const handleSaveUrl = async () => {
    if (!apiUrl.trim()) {
      Alert.alert("Invalid URL", "Please enter a valid backend URL.");
      return;
    }
    await storage.setApiUrl(apiUrl.trim());
    await storage.setApiKey(apiKey.trim());
    Alert.alert("Saved", "Backend URL and API Key updated successfully.");
    testConnection();
  };

  const testConnection = async () => {
    setTesting(true);
    setConnectionStatus(null);
    setStatusMessage("");
    try {
      const res = await api.getHealth();
      if (res && res.status === "healthy") {
        setConnectionStatus("connected");
        setStatusMessage(`Connected! Stocks cached: ${res.stocks_cached ? "Yes" : "No"}`);
      } else {
        setConnectionStatus("failed");
        setStatusMessage("Server returned an unexpected response.");
      }
    } catch (e) {
      setConnectionStatus("failed");
      setStatusMessage(`Connection failed: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleTriggerRefresh = async () => {
    setRefreshingBackend(true);
    try {
      const res = await api.triggerRefresh();
      Alert.alert(
        "Refreshed!",
        `Backend updated:\n• ${res.stocks_updated} stocks\n• ${res.news_found} news articles\n• ${res.suggestions_generated} suggestions`
      );
    } catch (e) {
      Alert.alert("Refresh Failed", `Could not trigger refresh: ${e.message}`);
    } finally {
      setRefreshingBackend(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Settings" subtitle="Server Connection & Preferences" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Oracle Cloud / Backend Server Configuration */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="server" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Backend API Configuration</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Set your Oracle Cloud Free Tier Public IP or local machine IP:
          </Text>

          <Text style={styles.inputLabel}>Server URL</Text>
          <TextInput
            style={styles.input}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="http://129.154.xxx.xxx:8000"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.inputLabel}>API Secret Key (Optional / Production)</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="Paste your NEPSE API Secret Key..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUrl} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>Save Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.testBtn}
              onPress={testConnection}
              disabled={testing}
              activeOpacity={0.8}
            >
              {testing ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <Text style={styles.testBtnText}>Test Connection</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Connection Status Indicator */}
          {connectionStatus && (
            <View
              style={[
                styles.statusBox,
                connectionStatus === "connected" ? styles.statusBoxSuccess : styles.statusBoxError
              ]}
            >
              <Ionicons
                name={connectionStatus === "connected" ? "checkmark-circle" : "alert-circle"}
                size={18}
                color={connectionStatus === "connected" ? colors.bullish : colors.bearish}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: connectionStatus === "connected" ? colors.bullish : colors.bearish }
                ]}
              >
                {statusMessage}
              </Text>
            </View>
          )}
        </View>

        {/* Backend Ingestion Action */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="sync" size={18} color={colors.cyan} />
            <Text style={styles.sectionTitle}>Data Ingestion Controls</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Force a live scrape of NEPSE share prices and market news immediately:
          </Text>

          <TouchableOpacity
            style={styles.refreshActionBtn}
            onPress={handleTriggerRefresh}
            disabled={refreshingBackend}
            activeOpacity={0.8}
          >
            {refreshingBackend ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-download" size={18} color="#fff" />
                <Text style={styles.refreshActionText}>Trigger Live Data Scraping</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* About Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="information-circle" size={18} color={colors.neutral} />
            <Text style={styles.sectionTitle}>About NepseRadar</Text>
          </View>
          <Text style={styles.aboutText}>
            NepseRadar is an algorithmic intelligence platform for the Nepal Stock Exchange (NEPSE).
            It monitors ~350 listed securities, extracts breaking financial news from Sharesansar and
            Merolagani, and flags high-probability volume breakouts and catalyst setups.
          </Text>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Version</Text>
            <Text style={styles.versionValue}>1.0.0 (Production Build)</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  scrollContent: {
    padding: 16
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 16
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 2
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: 12
  },
  btnRow: {
    flexDirection: "row",
    gap: 10
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13
  },
  testBtn: {
    flex: 1,
    backgroundColor: colors.cardHover,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  testBtnText: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 13
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 8
  },
  statusBoxSuccess: {
    backgroundColor: colors.bullishBg
  },
  statusBoxError: {
    backgroundColor: colors.bearishBg
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1
  },
  refreshActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.cyan,
    paddingVertical: 12,
    borderRadius: 8
  },
  refreshActionText: {
    color: "#0d1117",
    fontWeight: "700",
    fontSize: 14
  },
  aboutText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14
  },
  versionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  versionLabel: {
    fontSize: 12,
    color: colors.textMuted
  },
  versionValue: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: "600"
  }
});
