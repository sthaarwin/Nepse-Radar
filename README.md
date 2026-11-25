# 📡 NepseRadar (नेप्से रडार)
> **Real-Time Nepal Stock Exchange (NEPSE) Market News, Algorithmic Stock Screening & Mobile Radar**

NepseRadar is an automated market intelligence platform built specifically for Nepali equity investors. It continuously monitors ~350 listed securities, extracts financial news from Sharesansar and Merolagani, calculates algorithmic breakout setups, and delivers insights natively to your phone.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Data Sources                          │
│   • Sharesansar (Live Prices, News, 52W High/Low, Turnover) │
│   • Merolagani (Announcements, Sector Indices)              │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Automated Scraper)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          NepseRadar Backend (Oracle Cloud Free Tier)         │
│   • Python / FastAPI Engine (Consumes <150MB RAM)           │
│   • SQLite Database (All ~350 stocks, cached news & signals)│
│   • Stock Suggestion Screener Engine:                       │
│     - 💥 Institutional Turnover Surge (> Rs. 1.5 Cr)        │
│     - 🚀 52-Week High Breakouts                             │
│     - ⚡ Corporate Action Catalysts (Dividends, Rights)     │
│     - 📈 Golden Moving Average Uptrend (120D & 180D MA)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ (REST API / JSON)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              NepseRadar Native Mobile App (Expo)             │
│   📱 Tab 1: Market Overview (Live NEPSE Index, Breadth)     │
│   💡 Tab 2: Stock Radar (Scored Suggestion Cards & Rationale)│
│   📰 Tab 3: News Feed (Filterable by Ticker & Sentiment)    │
│   ⭐ Tab 4: Watchlist (Custom Portfolio Tracking)           │
│   ⚙️ Tab 5: Settings (Oracle Cloud IP, Ingestion Controls)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### 1. Run the Backend Locally

```bash
cd backend

# Create virtual environment & install requirements
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Fetch live market data & generate initial stock suggestions
python -m nepse_alert.cli ingest

# View top suggestions in terminal
python -m nepse_alert.cli screen

# Start FastAPI server on port 8000
python -m nepse_alert.cli serve
```

The API will be live at: `http://localhost:8000`  
Interactive Swagger API Docs: `http://localhost:8000/docs`

---

### 2. Run the Mobile App on Your Phone (React Native / Expo)

You can run the app on your physical Android or iPhone in 30 seconds using **Expo Go**:

1. Install **Expo Go** from [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) or [Apple App Store](https://apps.apple.com/us/app/expo-go/id982107779).
2. Start the mobile app on your machine:
   ```bash
   cd mobile
   npx expo start
   ```
3. Scan the QR code displayed in your terminal using your phone camera (iOS) or the Expo Go app (Android).
4. In the app's **Settings tab**, enter your machine's local IP (e.g. `http://192.168.1.50:8000`) or your Oracle Cloud Public IP.

---

### 3. Deploy 24/7 on Oracle Cloud Free Tier (Zero Cost)

Deploying to an Oracle Cloud Always Free VM (Ubuntu / Oracle Linux) takes just one command:

```bash
# 1. SSH into your Oracle Cloud Compute instance
ssh ubuntu@<YOUR_ORACLE_PUBLIC_IP>

# 2. Clone or copy the nepsealert project
git clone <YOUR_REPO_URL> nepsealert
cd nepsealert/backend

# 3. Run the automated deployment script
sudo bash deploy_oracle.sh

# 4. (Recommended) Enable Cloudflare Tunnel (Zero Open Ports & Free HTTPS)
sudo bash setup_tunnel.sh
```

The setup automatically:
* Creates an unprivileged system user `nepseradar` and sandboxes the service.
* Auto-generates a secure 32-character API secret key (`API_KEY`).
* Installs dependencies and runs initial data ingestion.
* Creates and enables `nepseradar.service` and `nepseradar-tunnel.service` that run 24/7.
* Provides a secure `https://xxx.trycloudflare.com` URL with free SSL and zero open firewall ports needed.

Check status anytime:
```bash
sudo systemctl status nepseradar
sudo systemctl status nepseradar-tunnel
sudo journalctl -u nepseradar -f
```

---

## 🎯 How the Suggestion Engine Works

The screener evaluates ~350 listed NEPSE companies across 5 quantitative criteria:

| Signal Type | Condition | Rationale |
| :--- | :--- | :--- |
| **Institutional Volume** | Daily turnover > Rs. 1.5 Cr + positive price change + >100 trades | Institutional accumulation and deep liquidity |
| **52-Week Breakout** | Trading within 5% of 52-week peak with strong turnover | Bullish continuation testing all-time/annual resistance |
| **Corporate Catalyst** | News mentions Dividend, Bonus Share, Right Issue, or Earnings Jump | Event-driven catalyst with high upside potential |
| **MA Bullish Uptrend** | LTP trading 1%–10% above 120-day and 180-day moving averages | Healthy mid-term trend reversal confirmation |
| **52-Week Rebound** | Reversing off 52-week support floor with >1.5% daily gain | Value buying zone for risk-managed swing trades |

Each stock suggestion includes a transparent **Conviction Score (0–100)** and a clear human-readable explanation.

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | GET | Health status and cache statistics |
| `/api/market` | GET | NEPSE index, turnover, top gainers, losers, and turnover leaders |
| `/api/stocks` | GET | Searchable list of all ~350 stocks with filters and sorting |
| `/api/stocks/{symbol}` | GET | Deep-dive metrics (OHLC, VWAP, 52W range, 120D/180D MA) |
| `/api/suggestions` | GET | Scored stock suggestions with signal tags and explanations |
| `/api/news` | GET | Latest financial news from Sharesansar & Merolagani with ticker tags |
| `/api/watchlist` | GET / POST | Manage personal tracked securities |
| `/api/refresh` | POST | Trigger an on-demand data scraping and screening run |

---

## 🧪 Testing

Run automated tests on the backend:
```bash
cd backend
source venv/bin/activate
pytest tests/test_backend.py -v
```
All 7 unit and integration tests pass verifying data scraping, screener calculations, SQLite operations, and API contracts.
