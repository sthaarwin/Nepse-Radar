import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

export default function NewsCard({ item, onSelectSymbol }) {
  const openLink = () => {
    if (item.link) {
      Linking.openURL(item.link).catch((err) =>
        console.warn("Could not open news URL:", err)
      );
    }
  };

  const isPositive = item.sentiment === "positive";
  const isNegative = item.sentiment === "negative";

  let sentimentColor = colors.neutral;
  let sentimentBg = colors.neutralBg;
  let sentimentLabel = "Neutral";

  if (isPositive) {
    sentimentColor = colors.bullish;
    sentimentBg = colors.bullishBg;
    sentimentLabel = "Bullish";
  } else if (isNegative) {
    sentimentColor = colors.bearish;
    sentimentBg = colors.bearishBg;
    sentimentLabel = "Bearish";
  }

  return (
    <TouchableOpacity style={styles.card} onPress={openLink} activeOpacity={0.8}>
      <View style={styles.headerRow}>
        <View style={styles.sourceTag}>
          <Text style={styles.sourceText}>{item.source || "News"}</Text>
        </View>

        <View style={styles.rightHeader}>
          {item.is_catalyst ? (
            <View style={styles.catalystTag}>
              <Ionicons name="flash" size={10} color={colors.orange} />
              <Text style={styles.catalystText}>Catalyst</Text>
            </View>
          ) : null}

          <View style={[styles.sentimentTag, { backgroundColor: sentimentBg }]}>
            <Text style={[styles.sentimentText, { color: sentimentColor }]}>
              {sentimentLabel}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={3}>
        {item.title}
      </Text>

      {item.summary ? (
        <Text style={styles.summary} numberOfLines={2}>
          {item.summary}
        </Text>
      ) : null}

      <View style={styles.footerRow}>
        <View style={styles.symbolRow}>
          {item.matched_symbols && item.matched_symbols.length > 0 ? (
            item.matched_symbols.map((sym, i) => (
              <TouchableOpacity
                key={i}
                style={styles.symbolChip}
                onPress={() => onSelectSymbol && onSelectSymbol(sym)}
                activeOpacity={0.7}
              >
                <Text style={styles.symbolChipText}>{sym}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.generalMarketText}>General Market</Text>
          )}
        </View>

        <Text style={styles.date}>{item.published_date || "Today"}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  sourceTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: colors.cardHover
  },
  sourceText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "600"
  },
  rightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  catalystTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.orangeBg
  },
  catalystText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.orange
  },
  sentimentTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  sentimentText: {
    fontSize: 10,
    fontWeight: "600"
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 6
  },
  summary: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4
  },
  symbolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flex: 1
  },
  symbolChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.border
  },
  symbolChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.cyan
  },
  generalMarketText: {
    fontSize: 11,
    color: colors.textMuted
  },
  date: {
    fontSize: 11,
    color: colors.textMuted
  }
});
