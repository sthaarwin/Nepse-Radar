import sys
import time
import argparse
import logging
import uvicorn
from nepse_alert.config import HOST, PORT, REFRESH_INTERVAL_MINUTES
from nepse_alert.database.db import (
    init_db,
    upsert_stocks,
    upsert_market_summary,
    save_news,
    save_suggestions,
    get_stocks,
    get_suggestions,
    get_market_summary
)
from nepse_alert.scrapers.market_scraper import fetch_live_market_data
from nepse_alert.scrapers.news_scraper import fetch_all_market_news
from nepse_alert.engine.screener import generate_stock_suggestions

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nepseradar-cli")


def run_ingest():
    init_db()
    logger.info("Fetching live NEPSE share prices...")
    stocks, summary = fetch_live_market_data()
    if stocks:
        upsert_stocks(stocks)
        logger.info(f"Updated {len(stocks)} stock price records.")
    if summary:
        upsert_market_summary(summary)
        logger.info(f"Market Summary updated: Turnover Rs. {summary['total_turnover']:,.0f}")

    known_symbols = {s["symbol"] for s in stocks} if stocks else set()
    logger.info("Fetching financial news from Sharesansar & Merolagani...")
    news_items = fetch_all_market_news(known_symbols)
    if news_items:
        saved = save_news(news_items)
        logger.info(f"Found {len(news_items)} news articles ({saved} new saved).")

    logger.info("Generating stock suggestions...")
    current_stocks = get_stocks(limit=400)
    suggestions = generate_stock_suggestions(current_stocks, news_items)
    if suggestions:
        save_suggestions(suggestions)
        logger.info(f"Generated {len(suggestions)} actionable stock suggestions.")
    else:
        logger.info("No stocks met the screening threshold on this run.")

    return stocks, news_items, suggestions


def run_screen():
    init_db()
    suggestions = get_suggestions()
    if not suggestions:
        print("\nNo cached suggestions. Running ingestion first...")
        _, _, suggestions = run_ingest()

    print("\n" + "=" * 70)
    print("  NEPSERADAR - TOP STOCK SUGGESTIONS & SIGNALS")
    print("=" * 70)
    for idx, s in enumerate(suggestions[:10], 1):
        surge = f"+{s['volume_surge_pct']}%" if s['volume_surge_pct'] > 0 else f"{s['volume_surge_pct']}%"
        print(f"\n[{idx}] {s['symbol']} | Score: {s['score']}/100 | Signal: {s['signal_type']}")
        print(f"    LTP: Rs. {s['ltp']:,.2f} ({s['pct_change']:+.2f}%) | Vol Surge: {surge}")
        print(f"    Title: {s['title']}")
        print(f"    Rationale: {s['rationale']}")
    print("\n" + "=" * 70 + "\n")


def run_serve():
    init_db()
    logger.info(f"Starting NepseRadar API Server on http://{HOST}:{PORT}")
    uvicorn.run("nepse_alert.api.main:app", host=HOST, port=PORT, reload=False)


def run_scheduler():
    init_db()
    logger.info(f"NepseRadar Scheduler running every {REFRESH_INTERVAL_MINUTES} minutes...")
    while True:
        try:
            run_ingest()
        except Exception as e:
            logger.error(f"Error during scheduled run: {e}")
        time.sleep(REFRESH_INTERVAL_MINUTES * 60)


def main():
    parser = argparse.ArgumentParser(description="NepseRadar CLI Tool")
    parser.add_argument("command", choices=["ingest", "screen", "serve", "scheduler"], help="Command to execute")
    args = parser.parse_args()

    if args.command == "ingest":
        run_ingest()
    elif args.command == "screen":
        run_screen()
    elif args.command == "serve":
        run_serve()
    elif args.command == "scheduler":
        run_scheduler()


if __name__ == "__main__":
    main()
