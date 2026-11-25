import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# Load .env file if present
ENV_FILE = BASE_DIR / ".env"
if ENV_FILE.exists():
    with open(ENV_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

DB_PATH = os.getenv("NEPSE_DB_PATH", str(DATA_DIR / "nepseradar.db"))

# Security Settings
API_KEY = os.getenv("API_KEY", "").strip()
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", 120))
REFRESH_COOLDOWN_SECONDS = int(os.getenv("REFRESH_COOLDOWN_SECONDS", 30))

# Scraper Settings
REQUEST_TIMEOUT = 12
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Screener Thresholds
MIN_TURNOVER = 500_000  # Rs. 500k minimum daily turnover to filter illiquid stocks
VOLUME_SURGE_MULTIPLIER = 1.5  # 1.5x of 120-day average
NEAR_52W_HIGH_PCT = 0.05  # within 5% of 52w high
NEAR_52W_LOW_PCT = 0.05   # within 5% of 52w low

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
REFRESH_INTERVAL_MINUTES = int(os.getenv("REFRESH_INTERVAL_MINUTES", 5))

# Smart Scheduler Settings (Nepal Trading Hours: Sun-Thu 11:00 AM - 3:00 PM NPT)
MARKET_HOURS_INTERVAL_MINUTES = int(os.getenv("MARKET_HOURS_INTERVAL_MINUTES", 5))
OFF_HOURS_NEWS_INTERVAL_MINUTES = int(os.getenv("OFF_HOURS_NEWS_INTERVAL_MINUTES", 60))

