import time
import logging
from datetime import datetime, timezone, timedelta, time as dtime
from typing import Optional, Dict, Any

from nepse_alert.config import (
    MARKET_HOURS_INTERVAL_MINUTES,
    OFF_HOURS_NEWS_INTERVAL_MINUTES
)
from nepse_alert.database.db import (
    init_db,
    upsert_stocks,
    upsert_market_summary,
    save_news,
    save_suggestions,
    get_stocks
)
from nepse_alert.scrapers.market_scraper import fetch_live_market_data
from nepse_alert.scrapers.news_scraper import fetch_all_market_news
from nepse_alert.engine.screener import generate_stock_suggestions

logger = logging.getLogger("nepseradar-scheduler")

# NEPSE operates on Nepal Time (UTC +5:45)
NEPAL_TZ = timezone(timedelta(hours=5, minutes=45), name="NPT")

# NEPSE Trading Days: Sunday (6) through Thursday (3). Friday (4) and Saturday (5) are closed.
TRADING_WEEKDAYS = {6, 0, 1, 2, 3}

# Trading Session Time Boundaries (NPT)
PRE_OPEN_START = dtime(10, 30)
REGULAR_MARKET_OPEN = dtime(11, 0)
REGULAR_MARKET_CLOSE = dtime(15, 0)
POST_CLOSE_END = dtime(15, 15)


def get_nepal_now() -> datetime:
    """Returns the current datetime localized to Nepal Time (UTC+5:45)."""
    return datetime.now(NEPAL_TZ)


def is_trading_day(dt: Optional[datetime] = None) -> bool:
    """Returns True if the given date (or current Nepal date) is Sunday through Thursday."""
    target = dt if dt is not None else get_nepal_now()
    return target.weekday() in TRADING_WEEKDAYS


def calculate_next_market_open(dt: Optional[datetime] = None) -> datetime:
    """Calculates the exact datetime for the next continuous trading session open (11:00 AM NPT)."""
    target = dt if dt is not None else get_nepal_now()
    current_date = target.date()
    current_time = target.time()

    # If today is a trading day and it's before 11:00 AM, next open is today at 11:00 AM
    if target.weekday() in TRADING_WEEKDAYS and current_time < REGULAR_MARKET_OPEN:
        return datetime.combine(current_date, REGULAR_MARKET_OPEN, tzinfo=NEPAL_TZ)

    # Otherwise, scan upcoming days to find the next trading day
    days_ahead = 1
    while True:
        candidate_date = current_date + timedelta(days=days_ahead)
        if candidate_date.weekday() in TRADING_WEEKDAYS:
            return datetime.combine(candidate_date, REGULAR_MARKET_OPEN, tzinfo=NEPAL_TZ)
        days_ahead += 1


def get_market_session(dt: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Evaluates current NEPSE market state.
    Returns:
        status: "OPEN" | "PRE_OPEN" | "POST_CLOSE" | "CLOSED"
        is_open: bool
        is_trading_day: bool
        nepal_time: str
        status_message: str
        next_open: str
        sleep_seconds: int
    """
    target = dt if dt is not None else get_nepal_now()
    t = target.time()
    weekday = target.weekday()
    trading_day = weekday in TRADING_WEEKDAYS
    next_open_dt = calculate_next_market_open(target)

    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_name = day_names[weekday]

    if not trading_day:
        reason = "Weekend (Friday)" if weekday == 4 else "Weekend (Saturday)"
        return {
            "status": "CLOSED",
            "is_open": False,
            "is_trading_day": False,
            "nepal_time": target.strftime("%Y-%m-%d %H:%M:%S NPT"),
            "day_name": day_name,
            "status_message": f"Market Closed ({reason}). Opens Sunday at 11:00 AM NPT.",
            "next_open": next_open_dt.strftime("%Y-%m-%d %H:%M:%S NPT"),
            "sleep_seconds": OFF_HOURS_NEWS_INTERVAL_MINUTES * 60
        }

    # Weekday is Sun-Thu
    if PRE_OPEN_START <= t < REGULAR_MARKET_OPEN:
        return {
            "status": "PRE_OPEN",
            "is_open": False,
            "is_trading_day": True,
            "nepal_time": target.strftime("%Y-%m-%d %H:%M:%S NPT"),
            "day_name": day_name,
            "status_message": "Pre-Open Session (10:30 - 11:00 NPT). Matching orders before open.",
            "next_open": next_open_dt.strftime("%Y-%m-%d %H:%M:%S NPT"),
            "sleep_seconds": MARKET_HOURS_INTERVAL_MINUTES * 60
        }
    elif REGULAR_MARKET_OPEN <= t < REGULAR_MARKET_CLOSE:
        return {
            "status": "OPEN",
            "is_open": True,
            "is_trading_day": True,
            "nepal_time": target.strftime("%Y-%m-%d %H:%M:%S NPT"),
            "day_name": day_name,
            "status_message": "Continuous Trading Session Live (11:00 - 15:00 NPT).",
            "next_open": target.strftime("%Y-%m-%d %H:%M:%S NPT"),
            "sleep_seconds": MARKET_HOURS_INTERVAL_MINUTES * 60
        }
    elif REGULAR_MARKET_CLOSE <= t < POST_CLOSE_END:
        return {
            "status": "POST_CLOSE",
            "is_open": False,
            "is_trading_day": True,
            "nepal_time": target.strftime("%Y-%m-%d %H:%M:%S NPT"),
            "day_name": day_name,
            "status_message": "Post-Close Reconciliation (15:00 - 15:15 NPT). Finalizing day stats.",
            "next_open": next_open_dt.strftime("%Y-%m-%d %H:%M:%S NPT"),
            "sleep_seconds": MARKET_HOURS_INTERVAL_MINUTES * 60
        }
    else:
        # Off-hours on a trading day (before 10:30 AM or after 15:15 PM)
        return {
            "status": "CLOSED",
            "is_open": False,
            "is_trading_day": True,
            "nepal_time": target.strftime("%Y-%m-%d %H:%M:%S NPT"),
            "day_name": day_name,
            "status_message": f"Market Closed. Regular trading resumes at {next_open_dt.strftime('%A 11:00 AM NPT')}.",
            "next_open": next_open_dt.strftime("%Y-%m-%d %H:%M:%S NPT"),
            "sleep_seconds": OFF_HOURS_NEWS_INTERVAL_MINUTES * 60
        }


def run_full_ingestion():
    """Runs a complete ingestion cycle: live price scrape, news scrape, and algorithmic screening."""
    init_db()
    logger.info("[Full Ingestion] Fetching live NEPSE share prices & market summary...")
    stocks, summary = fetch_live_market_data()
    if stocks:
        upsert_stocks(stocks)
        logger.info(f"[Full Ingestion] Upserted {len(stocks)} stock price records.")
    if summary:
        upsert_market_summary(summary)
        logger.info(f"[Full Ingestion] Summary updated: Turnover Rs. {summary.get('total_turnover', 0):,.0f}")

    known_symbols = {s["symbol"] for s in stocks} if stocks else set()
    logger.info("[Full Ingestion] Fetching news from Sharesansar & Merolagani...")
    news_items = fetch_all_market_news(known_symbols)
    if news_items:
        saved = save_news(news_items)
        logger.info(f"[Full Ingestion] Found {len(news_items)} news articles ({saved} new).")

    logger.info("[Full Ingestion] Running screener engine for high-conviction setups...")
    current_stocks = get_stocks(limit=400)
    suggestions = generate_stock_suggestions(current_stocks, news_items)
    if suggestions:
        save_suggestions(suggestions)
        logger.info(f"[Full Ingestion] Screened {len(suggestions)} actionable suggestions.")

    return stocks, news_items, suggestions


def run_news_only_ingestion():
    """Lightweight ingestion for off-hours to capture breaking announcements without hammering price scrapers."""
    init_db()
    logger.info("[Off-Hours] Fetching financial news & corporate actions...")
    current_stocks = get_stocks(limit=400)
    known_symbols = {s["symbol"] for s in current_stocks} if current_stocks else set()
    news_items = fetch_all_market_news(known_symbols)
    if news_items:
        saved = save_news(news_items)
        logger.info(f"[Off-Hours] Saved {saved} new corporate/news announcements.")
    return news_items


def run_smart_scheduler_loop(single_run: bool = False):
    """
    Intelligent NEPSE market scheduler.
    - During Trading (Sun-Thu 11:00 AM - 3:00 PM NPT): Ingests every 5 minutes.
    - Pre-Open / Post-Close: Runs reconciliation cycles.
    - Outside Market Hours / Weekends: Idles price scrapers, polls news hourly.
    """
    init_db()
    logger.info("=" * 60)
    logger.info("  Starting NepseRadar Smart Market Hours Scheduler")
    logger.info(f"  Market Interval:     {MARKET_HOURS_INTERVAL_MINUTES} minutes")
    logger.info(f"  Off-Hours Interval:  {OFF_HOURS_NEWS_INTERVAL_MINUTES} minutes")
    logger.info("=" * 60)

    # Perform one initial ingestion upon boot
    try:
        session = get_market_session()
        logger.info(f"Initial Boot Status: {session['status_message']}")
        if session["status"] in ("OPEN", "PRE_OPEN", "POST_CLOSE"):
            run_full_ingestion()
        else:
            run_news_only_ingestion()
    except Exception as e:
        logger.error(f"Initial ingestion exception: {e}")

    if single_run:
        return

    while True:
        try:
            session = get_market_session()
            status = session["status"]

            if status == "OPEN":
                logger.info(f"[LIVE TRADING] Market is active. Running live 5-min cycle...")
                run_full_ingestion()
                sleep_secs = MARKET_HOURS_INTERVAL_MINUTES * 60

            elif status in ("PRE_OPEN", "POST_CLOSE"):
                logger.info(f"[{status}] Running reconciliation cycle...")
                run_full_ingestion()
                sleep_secs = MARKET_HOURS_INTERVAL_MINUTES * 60

            else:
                logger.info(f"[MARKET CLOSED] {session['status_message']}")
                logger.info(f"[Off-Hours] Polling news only. Next open: {session['next_open']}")
                run_news_only_ingestion()
                sleep_secs = OFF_HOURS_NEWS_INTERVAL_MINUTES * 60

        except Exception as e:
            logger.error(f"Scheduler loop error: {e}", exc_info=True)
            sleep_secs = 60

        time.sleep(sleep_secs)
