import logging
from typing import List, Dict, Any
from nepse_alert.config import (
    MIN_TURNOVER,
    NEAR_52W_HIGH_PCT,
    NEAR_52W_LOW_PCT
)

logger = logging.getLogger(__name__)


def generate_stock_suggestions(
    stocks: List[Dict[str, Any]],
    news_items: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Evaluates market conditions and generates high-probability stock suggestions
    based on technical moving averages, high institutional turnover, 52-week setups,
    and news catalysts.
    """
    if not stocks:
        return []

    # Map news catalysts by symbol
    catalyst_map: Dict[str, List[Dict[str, Any]]] = {}
    for news in news_items:
        symbols = news.get("matched_symbols", [])
        for sym in symbols:
            catalyst_map.setdefault(sym, []).append(news)

    suggestions: List[Dict[str, Any]] = []

    for stock in stocks:
        symbol = stock["symbol"]
        ltp = stock.get("ltp", 0.0)
        pct_change = stock.get("pct_change", 0.0)
        volume = stock.get("volume", 0.0)
        turnover = stock.get("turnover", 0.0)
        transactions = stock.get("transactions", 0)
        avg_120 = stock.get("avg_120", 0.0)  # 120-Day Moving Average Price
        avg_180 = stock.get("avg_180", 0.0)  # 180-Day Moving Average Price
        high_52 = stock.get("high_52", 0.0)
        low_52 = stock.get("low_52", 0.0)

        # Baseline filters: positive price & reasonable liquidity
        if ltp <= 0 or turnover < MIN_TURNOVER:
            continue

        # -------------------------------------------------------------
        # SIGNAL 1: Corporate Catalyst (Dividends / Rights / Earnings)
        # -------------------------------------------------------------
        if symbol in catalyst_map:
            matched_news = catalyst_map[symbol]
            for n in matched_news:
                if n.get("is_catalyst") or n.get("sentiment") == "positive":
                    score = 92 if pct_change > 0 else 82
                    suggestions.append({
                        "symbol": symbol,
                        "signal_type": "CORPORATE_CATALYST",
                        "title": f"Catalyst: {n['title'][:55]}...",
                        "rationale": f"Recent catalyst reported: '{n['title']}'. Current LTP is Rs. {ltp:,.2f} ({pct_change:+.2f}%).",
                        "score": score,
                        "ltp": ltp,
                        "pct_change": pct_change,
                        "volume": volume,
                        "avg_volume": avg_120,
                        "volume_surge_pct": round(pct_change, 1),
                        "high_52": high_52,
                        "low_52": low_52,
                        "catalyst_text": n["title"]
                    })
                    break

        # -------------------------------------------------------------
        # SIGNAL 2: Institutional Turnover Surge (> Rs. 1.5 Crore)
        # -------------------------------------------------------------
        if turnover >= 15_000_000 and pct_change >= 0.8 and transactions >= 100:
            turnover_crores = turnover / 10_000_000
            score = min(96, int(80 + (turnover_crores * 1.5) + (pct_change * 2)))
            suggestions.append({
                "symbol": symbol,
                "signal_type": "VOLUME_SURGE",
                "title": f"Institutional Buying (Rs. {turnover_crores:.2f} Cr Turnover)",
                "rationale": f"Heavy trading activity today with Rs. {turnover_crores:.2f} Crore turnover across {transactions} trades and a {pct_change:+.2f}% price gain.",
                "score": score,
                "ltp": ltp,
                "pct_change": pct_change,
                "volume": volume,
                "avg_volume": avg_120,
                "volume_surge_pct": round(turnover_crores * 10, 1),
                "high_52": high_52,
                "low_52": low_52,
                "catalyst_text": ""
            })

        # -------------------------------------------------------------
        # SIGNAL 3: 52-Week High Breakout Watch
        # -------------------------------------------------------------
        if high_52 > 0 and ltp > 0:
            distance_to_high = (high_52 - ltp) / high_52
            if 0.0 <= distance_to_high <= NEAR_52W_HIGH_PCT and pct_change >= 0.0 and turnover >= 2_000_000:
                score = min(94, int(82 + (pct_change * 2)))
                suggestions.append({
                    "symbol": symbol,
                    "signal_type": "52W_BREAKOUT",
                    "title": f"52-Week High Breakout (Peak Rs. {high_52:,.1f})",
                    "rationale": f"Trading within {distance_to_high*100:.1f}% of its 52-week high of Rs. {high_52:,.1f}. Strong bullish momentum testing resistance.",
                    "score": score,
                    "ltp": ltp,
                    "pct_change": pct_change,
                    "volume": volume,
                    "avg_volume": avg_120,
                    "volume_surge_pct": round(pct_change, 1),
                    "high_52": high_52,
                    "low_52": low_52,
                    "catalyst_text": ""
                })

        # -------------------------------------------------------------
        # SIGNAL 4: Golden Moving Average Uptrend (LTP > 120D & 180D MA)
        # -------------------------------------------------------------
        if avg_120 > 0 and avg_180 > 0 and ltp > avg_120 and ltp > avg_180:
            diff_120 = ((ltp - avg_120) / avg_120) * 100
            if 1.0 <= diff_120 <= 10.0 and pct_change >= 1.0 and turnover >= 3_000_000:
                score = min(90, int(78 + (pct_change * 2)))
                suggestions.append({
                    "symbol": symbol,
                    "signal_type": "TREND_UP",
                    "title": f"Bullish Trend: Above 120 & 180 Day MA",
                    "rationale": f"LTP (Rs. {ltp:,.1f}) is trading {diff_120:.1f}% above its 120-day moving average (Rs. {avg_120:,.1f}) with +{pct_change:.2f}% gain today.",
                    "score": score,
                    "ltp": ltp,
                    "pct_change": pct_change,
                    "volume": volume,
                    "avg_volume": avg_120,
                    "volume_surge_pct": round(diff_120, 1),
                    "high_52": high_52,
                    "low_52": low_52,
                    "catalyst_text": ""
                })

        # -------------------------------------------------------------
        # SIGNAL 5: 52-Week Low Rebound (Dip Reversal)
        # -------------------------------------------------------------
        if low_52 > 0 and ltp > 0:
            distance_from_low = (ltp - low_52) / low_52
            if 0.0 <= distance_from_low <= NEAR_52W_LOW_PCT and pct_change >= 1.5 and turnover >= 1_000_000:
                score = min(88, int(74 + (pct_change * 2)))
                suggestions.append({
                    "symbol": symbol,
                    "signal_type": "52W_REBOUND",
                    "title": f"Rebound from 52-Week Floor (Rs. {low_52:,.1f})",
                    "rationale": f"Reversing off 52-week support floor of Rs. {low_52:,.1f} with +{pct_change:.2f}% gain today. Potential accumulation zone.",
                    "score": score,
                    "ltp": ltp,
                    "pct_change": pct_change,
                    "volume": volume,
                    "avg_volume": avg_120,
                    "volume_surge_pct": round(pct_change, 1),
                    "high_52": high_52,
                    "low_52": low_52,
                    "catalyst_text": ""
                })

    # Sort suggestions by conviction score and turnover
    suggestions.sort(key=lambda s: (s["score"], s["volume"]), reverse=True)
    return suggestions
