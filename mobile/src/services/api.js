import { storage } from "./storage";

export const api = {
  async getBaseUrl() {
    return await storage.getApiUrl();
  },

  async request(endpoint, options = {}, timeoutMs = 15000) {
    const baseUrl = await this.getBaseUrl();
    const apiKey = await storage.getApiKey();
    const url = `${baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn(`NepseRadar API request failed for ${endpoint}:`, error.message);
      throw error;
    }
  },

  async getHealth() {
    return await this.request("/api/health");
  },

  async getMarketOverview() {
    try {
      return await this.request("/api/market");
    } catch {
      // Fallback demo data if backend is offline
      return {
        summary: {
          nepse_index: 2720.45,
          index_change: 15.30,
          index_pct_change: 0.56,
          total_turnover: 5553019249,
          total_shares: 12450000,
          total_transactions: 78500,
          advances: 165,
          declines: 72,
          unchanged: 13,
          market_status: "Demo / Offline"
        },
        top_gainers: [
          { symbol: "SHL", ltp: 561.6, pct_change: 1.19, turnover: 321700000 },
          { symbol: "HDL", ltp: 1362.0, pct_change: 2.79, turnover: 221400000 }
        ],
        top_losers: [
          { symbol: "BARUN", ltp: 290.0, pct_change: -3.2, turnover: 12000000 }
        ],
        top_turnover: [
          { symbol: "SHL", ltp: 561.6, pct_change: 1.19, turnover: 321700000 },
          { symbol: "GBIME", ltp: 282.8, pct_change: 2.46, turnover: 308300000 }
        ]
      };
    }
  },

  async getSuggestions(signalType = "") {
    try {
      const param = signalType && signalType !== "ALL" ? `?signal_type=${signalType}` : "";
      return await this.request(`/api/suggestions${param}`);
    } catch {
      return {
        count: 2,
        suggestions: [
          {
            symbol: "SHL",
            signal_type: "VOLUME_SURGE",
            title: "Institutional Buying (Rs. 32.17 Cr Turnover)",
            rationale: "Heavy trading activity today with Rs. 32.17 Crore turnover across 1585 trades and a +1.19% price gain.",
            score: 96,
            ltp: 561.6,
            pct_change: 1.19,
            high_52: 568.0,
            low_52: 340.0
          },
          {
            symbol: "GBIME",
            signal_type: "VOLUME_SURGE",
            title: "Institutional Buying (Rs. 30.83 Cr Turnover)",
            rationale: "Heavy trading activity today with Rs. 30.83 Crore turnover across 1930 trades and a +2.46% price gain.",
            score: 96,
            ltp: 282.8,
            pct_change: 2.46,
            high_52: 284.0,
            low_52: 180.0
          }
        ]
      };
    }
  },

  async getNews(limit = 30, symbol = "") {
    try {
      const query = symbol ? `?limit=${limit}&symbol=${symbol}` : `?limit=${limit}`;
      return await this.request(`/api/news${query}`);
    } catch {
      return {
        count: 2,
        news: [
          {
            id: 1,
            title: "१० अर्ब रुपैयाँ बराबरको विकास ऋणपत्र विक्री गरिँदै",
            source: "Merolagani",
            sentiment: "neutral",
            published_date: "Today",
            matched_symbols: []
          },
          {
            id: 2,
            title: "दुई कम्पनीले आईपीओ निष्कासनका लागि सेबोनमा दिए आवेदन",
            source: "Sharesansar",
            sentiment: "positive",
            published_date: "Today",
            matched_symbols: []
          }
        ]
      };
    }
  },

  async getStocks(search = "", sortBy = "turnover", limit = 50) {
    try {
      return await this.request(`/api/stocks?search=${encodeURIComponent(search)}&sort_by=${sortBy}&limit=${limit}`);
    } catch {
      return { count: 0, stocks: [] };
    }
  },

  async getStockDetail(symbol) {
    return await this.request(`/api/stocks/${symbol.toUpperCase()}`);
  },

  async triggerRefresh() {
    return await this.request("/api/refresh", { method: "POST" }, 60000);
  }
};
