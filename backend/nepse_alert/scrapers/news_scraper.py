import re
import logging
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Set
from nepse_alert.config import REQUEST_TIMEOUT, USER_AGENT

logger = logging.getLogger(__name__)

URL_SHARESANSAR_NEWS = "https://www.sharesansar.com/category/latest-market-news"
URL_SHARESANSAR_GENERAL = "https://www.sharesansar.com/category/news"
URL_MEROLAGANI_NEWS = "https://merolagani.com/NewsList.aspx"

# Common keywords for catalyst detection
CATALYST_KEYWORDS = {
    "dividend": ["dividend", "bonus share", "cash dividend", "book closure", "proposes dividend"],
    "rights": ["right share", "right issue", "rights"],
    "earnings": ["profit jumps", "net profit surges", "quarterly report", "q1 profit", "q2 profit", "q3 profit", "q4 profit"],
    "rating": ["rating upgrade", "icra upgrade", "credit rating"],
    "merger": ["merger", "acquisition", "amalgamation", "mou"]
}

BULLISH_KEYWORDS = ["profit jumps", "surge", "growth", "high dividend", "bonus", "rises", "gain", "upgraded", "profit up", "strong"]
BEARISH_KEYWORDS = ["downgraded", "loss", "plunges", "slumps", "drop", "decline", "fell", "deficit", "scam", "penalty"]


def _extract_sentiment_and_catalyst(title: str, summary: str):
    text = f"{title} {summary}".lower()
    
    is_catalyst = False
    for cat, words in CATALYST_KEYWORDS.items():
        if any(w in text for w in words):
            is_catalyst = True
            break

    bullish_score = sum(1 for w in BULLISH_KEYWORDS if w in text)
    bearish_score = sum(1 for w in BEARISH_KEYWORDS if w in text)

    if bullish_score > bearish_score:
        sentiment = "positive"
    elif bearish_score > bullish_score:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    return sentiment, is_catalyst


def _match_symbols(text: str, known_symbols: Set[str]) -> List[str]:
    # Match uppercase words of 2-7 chars that exist in known symbols
    words = re.findall(r'\b[A-Z]{2,7}\b', text)
    matched = [w for w in set(words) if w in known_symbols]
    return matched


def fetch_sharesansar_news(known_symbols: Set[str]) -> List[Dict[str, Any]]:
    headers = {"User-Agent": USER_AGENT}
    results = []
    
    for url in [URL_SHARESANSAR_NEWS, URL_SHARESANSAR_GENERAL]:
        try:
            r = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
            if r.status_code != 200:
                continue
            soup = BeautifulSoup(r.text, "html.parser")
            
            # Find news blocks
            articles = soup.find_all("div", class_="featured-news-list") or soup.find_all("div", class_="media")
            for art in articles:
                title_tag = art.find("h4") or art.find("a")
                if not title_tag:
                    continue
                title = title_tag.get_text(strip=True)
                if not title:
                    continue

                link_tag = art.find("a")
                link = link_tag.get("href", "") if link_tag else ""
                if link and not link.startswith("http"):
                    link = f"https://www.sharesansar.com{link}"

                date_tag = art.find("span", class_="text-org") or art.find("span", class_="date")
                date_str = date_tag.get_text(strip=True) if date_tag else ""

                summary_tag = art.find("p")
                summary = summary_tag.get_text(strip=True) if summary_tag else ""

                sentiment, is_catalyst = _extract_sentiment_and_catalyst(title, summary)
                matched = _match_symbols(f"{title} {summary}", known_symbols)

                results.append({
                    "title": title,
                    "summary": summary,
                    "source": "Sharesansar",
                    "link": link,
                    "published_date": date_str,
                    "matched_symbols": matched,
                    "sentiment": sentiment,
                    "is_catalyst": is_catalyst
                })
        except Exception as e:
            logger.error(f"Error fetching Sharesansar news ({url}): {e}")

    return results


def fetch_merolagani_news(known_symbols: Set[str]) -> List[Dict[str, Any]]:
    headers = {"User-Agent": USER_AGENT}
    results = []
    try:
        r = requests.get(URL_MEROLAGANI_NEWS, headers=headers, timeout=REQUEST_TIMEOUT)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "html.parser")
            media_list = soup.find_all("div", class_="media-body") or soup.find_all("div", class_="news-list")
            for item in media_list[:15]:
                title_tag = item.find("h4") or item.find("a")
                if not title_tag:
                    continue
                title = title_tag.get_text(strip=True)
                link_tag = item.find("a")
                link = link_tag.get("href", "") if link_tag else ""
                if link and not link.startswith("http"):
                    link = f"https://merolagani.com/{link}"
                date_tag = item.find("span", class_="media-date") or item.find("span")
                date_str = date_tag.get_text(strip=True) if date_tag else ""

                sentiment, is_catalyst = _extract_sentiment_and_catalyst(title, "")
                matched = _match_symbols(title, known_symbols)

                results.append({
                    "title": title,
                    "summary": "",
                    "source": "Merolagani",
                    "link": link,
                    "published_date": date_str,
                    "matched_symbols": matched,
                    "sentiment": sentiment,
                    "is_catalyst": is_catalyst
                })
    except Exception as e:
        logger.error(f"Error fetching Merolagani news: {e}")

    return results


def fetch_all_market_news(known_symbols: Set[str]) -> List[Dict[str, Any]]:
    ss_news = fetch_sharesansar_news(known_symbols)
    ml_news = fetch_merolagani_news(known_symbols)
    
    # Deduplicate by title
    seen_titles = set()
    combined = []
    for item in ss_news + ml_news:
        if item["title"] not in seen_titles:
            seen_titles.add(item["title"])
            combined.append(item)
            
    return combined
