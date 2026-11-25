import logging
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from nepse_alert.api.security import (
    verify_api_key,
    check_refresh_cooldown,
    SecurityHeadersMiddleware,
    RateLimitMiddleware
)

from nepse_alert.database.db import (
    init_db,
    get_stocks,
    get_stock,
    get_market_summary,
    get_news,
    get_suggestions,
    get_watchlist,
    add_to_watchlist,
    remove_from_watchlist,
    upsert_stocks,
    upsert_market_summary,
    save_news,
    save_suggestions
)
from nepse_alert.scrapers.market_scraper import fetch_live_market_data
from nepse_alert.scrapers.news_scraper import fetch_all_market_news
from nepse_alert.engine.screener import generate_stock_suggestions

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nepseradar")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("NepseRadar API initialized successfully.")
    yield

app = FastAPI(
    title="NepseRadar API",
    description="Live NEPSE Market News, Stock Suggestions, and Analytics API",
    version="1.0.0",
    lifespan=lifespan
)

# Security Middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)

# Enable CORS for Mobile App and Local Dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WatchlistRequest(BaseModel):
    symbol: str = Field(..., min_length=2, max_length=10, pattern=r"^[A-Z0-9]+$")
    target_price: Optional[float] = Field(None, ge=0.0, le=1_000_000.0)
    notes: Optional[str] = Field("", max_length=300)


@app.get("/health")
@app.get("/api/health")
def health_check():
    summary = get_market_summary()
    stocks = get_stocks(limit=1)
    return {
        "status": "healthy",
        "app": "NepseRadar",
        "version": "1.0.0",
        "database_connected": True,
        "stocks_cached": len(stocks) > 0,
        "last_market_update": summary.get("updated_at")
    }


@app.get("/api/market")
def get_market_overview():
    summary = get_market_summary()
    top_gainers = get_stocks(limit=5, sort_by="gainers")
    top_losers = get_stocks(limit=5, sort_by="losers")
    top_turnover = get_stocks(limit=5, sort_by="turnover")
    
    return {
        "summary": summary,
        "top_gainers": top_gainers,
        "top_losers": top_losers,
        "top_turnover": top_turnover
    }


@app.get("/api/stocks")
def list_stocks(
    limit: int = Query(50, ge=1, le=400),
    search: str = Query("", description="Search by symbol or name"),
    sort_by: str = Query("turnover", pattern="^(turnover|gainers|losers|volume|symbol)$")
):
    stocks = get_stocks(limit=limit, search=search, sort_by=sort_by)
    return {"count": len(stocks), "stocks": stocks}


@app.get("/api/stocks/{symbol}")
def get_stock_detail(symbol: str):
    stock = get_stock(symbol)
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {symbol.upper()} not found.")
    
    # Also fetch related news and suggestion if any
    news = get_news(limit=5, symbol=symbol)
    all_suggestions = get_suggestions()
    stock_suggestions = [s for s in all_suggestions if s["symbol"] == symbol.upper()]
    
    return {
        "stock": stock,
        "related_news": news,
        "suggestions": stock_suggestions
    }


@app.get("/api/suggestions")
def list_suggestions(
    signal_type: Optional[str] = Query(None, description="Filter by VOLUME_SURGE, 52W_BREAKOUT, 52W_REBOUND, CORPORATE_CATALYST")
):
    suggestions = get_suggestions(signal_type or "")
    return {
        "count": len(suggestions),
        "suggestions": suggestions
    }


@app.get("/api/news")
def list_news(
    limit: int = Query(30, ge=1, le=100),
    symbol: Optional[str] = Query(None, description="Filter by stock ticker symbol")
):
    news = get_news(limit=limit, symbol=symbol or "")
    return {
        "count": len(news),
        "news": news
    }


@app.get("/api/watchlist")
def list_watchlist():
    items = get_watchlist()
    return {"count": len(items), "watchlist": items}


@app.post("/api/watchlist", dependencies=[Depends(verify_api_key)])
def add_watchlist_item(req: WatchlistRequest):
    sym = req.symbol.strip().upper()
    add_to_watchlist(sym, req.target_price, req.notes or "")
    return {"message": f"{sym} added to watchlist.", "symbol": sym}


@app.delete("/api/watchlist/{symbol}", dependencies=[Depends(verify_api_key)])
def delete_watchlist_item(symbol: str):
    clean_sym = symbol.strip().upper()
    if not clean_sym.isalnum() or len(clean_sym) > 10:
        raise HTTPException(status_code=400, detail="Invalid stock symbol format.")
    remove_from_watchlist(clean_sym)
    return {"message": f"{clean_sym} removed from watchlist."}


@app.post("/refresh", dependencies=[Depends(verify_api_key)])
@app.post("/api/refresh", dependencies=[Depends(verify_api_key)])
def trigger_refresh():
    """
    Manually triggers scrapers and updates suggestions. Protected by cooldown and API Key.
    """
    check_refresh_cooldown()
    logger.info("Starting on-demand market and news data refresh...")
    stocks, summary = fetch_live_market_data()
    if stocks:
        upsert_stocks(stocks)
    if summary:
        upsert_market_summary(summary)

    known_symbols = {s["symbol"] for s in stocks} if stocks else {s["symbol"] for s in get_stocks(limit=400)}
    news_items = fetch_all_market_news(known_symbols)
    if news_items:
        save_news(news_items)

    all_current_stocks = get_stocks(limit=400)
    suggestions = generate_stock_suggestions(all_current_stocks, news_items)
    if suggestions:
        save_suggestions(suggestions)

    return {
        "message": "Data refreshed successfully.",
        "stocks_updated": len(stocks),
        "news_found": len(news_items),
        "suggestions_generated": len(suggestions)
    }
