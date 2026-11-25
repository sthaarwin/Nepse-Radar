import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  API_URL: "@nepseradar_api_url",
  API_KEY: "@nepseradar_api_key",
  WATCHLIST: "@nepseradar_watchlist",
  CACHED_DATA: "@nepseradar_cache"
};

// Default production backend URL & Key (Cloudflare Tunnel to Oracle Cloud)
export const DEFAULT_API_URL = "https://nepse.arwinshrestha.com.np";
export const DEFAULT_API_KEY = "";


export const storage = {
  async getApiUrl() {
    try {
      const url = await AsyncStorage.getItem(STORAGE_KEYS.API_URL);
      return url || DEFAULT_API_URL;
    } catch {
      return DEFAULT_API_URL;
    }
  },

  async setApiUrl(url) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.API_URL, url.trim().replace(/\/$/, ""));
      return true;
    } catch {
      return false;
    }
  },

  async getApiKey() {
    try {
      const key = await AsyncStorage.getItem(STORAGE_KEYS.API_KEY);
      return key !== null ? key : DEFAULT_API_KEY;
    } catch {
      return DEFAULT_API_KEY;
    }
  },

  async setApiKey(key) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.API_KEY, (key || "").trim());
      return true;
    } catch {
      return false;
    }
  },

  async getWatchlist() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.WATCHLIST);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async addToWatchlist(symbol) {
    try {
      const current = await this.getWatchlist();
      const upper = symbol.toUpperCase();
      if (!current.includes(upper)) {
        const updated = [...current, upper];
        await AsyncStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(updated));
        return updated;
      }
      return current;
    } catch {
      return [];
    }
  },

  async removeFromWatchlist(symbol) {
    try {
      const current = await this.getWatchlist();
      const updated = current.filter((s) => s !== symbol.toUpperCase());
      await AsyncStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  async isWatched(symbol) {
    try {
      const current = await this.getWatchlist();
      return current.includes(symbol.toUpperCase());
    } catch {
      return false;
    }
  }
};
