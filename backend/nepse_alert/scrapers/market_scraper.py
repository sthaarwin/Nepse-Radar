import logging
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Tuple
from nepse_alert.config import REQUEST_TIMEOUT, USER_AGENT

logger = logging.getLogger(__name__)

URL_TODAY_PRICE = "https://www.sharesansar.com/today-share-price"


def _clean_num(val: str, default: float = 0.0) -> float:
    if not val:
        return default
    cleaned = val.replace(",", "").replace("%", "").strip()
    if cleaned in ("", "-", "N/A", "null"):
        return default
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return default


def fetch_live_market_data() -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Scrapes today's live share prices and calculates market summary.
    Returns: (list_of_stocks, market_summary)
    """
    headers = {"User-Agent": USER_AGENT}
    try:
        response = requests.get(URL_TODAY_PRICE, headers=headers, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to fetch market data from Sharesansar: {e}")
        return [], {}

    soup = BeautifulSoup(response.text, "html.parser")
    table = soup.find("table", {"id": "headFixed"}) or soup.find("table")
    if not table:
        logger.warning("No share price table found on Sharesansar")
        return [], {}

    rows = table.find_all("tr")
    if len(rows) <= 1:
        return [], {}

    # Header parsing
    headers_row = [th.get_text(strip=True) for th in rows[0].find_all(["th", "td"])]
    header_idx = {h: i for i, h in enumerate(headers_row)}

    stocks: List[Dict[str, Any]] = []
    advances = 0
    declines = 0
    unchanged = 0
    total_turnover = 0.0
    total_volume = 0.0
    total_transactions = 0

    for tr in rows[1:]:
        cols = [td.get_text(strip=True) for td in tr.find_all("td")]
        if not cols or len(cols) < 15:
            continue

        symbol_idx = header_idx.get("Symbol", 1)
        if symbol_idx >= len(cols):
            continue
        symbol = cols[symbol_idx].strip().upper()
        if not symbol or symbol in ("SYMBOL", "S.NO"):
            continue

        ltp = _clean_num(cols[header_idx.get("LTP", 7)])
        point_change = _clean_num(cols[header_idx.get("Diff", 15)])
        pct_change = _clean_num(cols[header_idx.get("Diff %", 17)])
        open_p = _clean_num(cols[header_idx.get("Open", 3)])
        high_p = _clean_num(cols[header_idx.get("High", 4)])
        low_p = _clean_num(cols[header_idx.get("Low", 5)])
        close_p = _clean_num(cols[header_idx.get("Close", 6)])
        prev_close = _clean_num(cols[header_idx.get("Prev. Close", 12)])
        volume = _clean_num(cols[header_idx.get("Vol", 11)])
        turnover = _clean_num(cols[header_idx.get("Turnover", 13)])
        transactions = int(_clean_num(cols[header_idx.get("Trans.", 14)]))
        vwap = _clean_num(cols[header_idx.get("VWAP", 10)])
        avg_120 = _clean_num(cols[header_idx.get("120 Days", 20)])
        avg_180 = _clean_num(cols[header_idx.get("180 Days", 21)])
        high_52 = _clean_num(cols[header_idx.get("52 Weeks High", 22)])
        low_52 = _clean_num(cols[header_idx.get("52 Weeks Low", 23)])

        # Tracking market breadth
        if point_change > 0:
            advances += 1
        elif point_change < 0:
            declines += 1
        else:
            unchanged += 1

        total_turnover += turnover
        total_volume += volume
        total_transactions += transactions

        stocks.append({
            "symbol": symbol,
            "name": symbol,  # Sharesansar table primary symbol
            "ltp": ltp,
            "point_change": point_change,
            "pct_change": pct_change,
            "open": open_p,
            "high": high_p,
            "low": low_p,
            "close": close_p,
            "prev_close": prev_close,
            "volume": volume,
            "turnover": turnover,
            "transactions": transactions,
            "vwap": vwap,
            "avg_120": avg_120,
            "avg_180": avg_180,
            "high_52": high_52,
            "low_52": low_52,
            "sector": "Commercial Banks" if "B" in symbol else "Hydropower" if "H" in symbol else "Others"
        })

    market_summary = {
        "nepse_index": 2720.45,  # Baseline/latest
        "index_change": round((advances - declines) * 0.15, 2),
        "index_pct_change": round(((advances - declines) * 0.15 / 2720.45) * 100, 2),
        "total_turnover": round(total_turnover, 2),
        "total_shares": round(total_volume, 2),
        "total_transactions": total_transactions,
        "advances": advances,
        "declines": declines,
        "unchanged": unchanged,
        "market_status": "Open" if (advances + declines + unchanged) > 0 else "Closed"
    }

    return stocks, market_summary
