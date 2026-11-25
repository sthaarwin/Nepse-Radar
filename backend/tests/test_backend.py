import pytest
from fastapi.testclient import TestClient
from nepse_alert.api.main import app
from nepse_alert import config
from nepse_alert.database.db import (
    init_db,
    upsert_stocks,
    get_stocks,
    get_stock,
    add_to_watchlist,
    get_watchlist,
    remove_from_watchlist,
    save_news,
    get_news,
    save_suggestions,
    get_suggestions
)
from nepse_alert.engine.screener import generate_stock_suggestions

client = TestClient(app)


def setup_module(module):
    init_db()


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "NepseRadar"


def test_security_headers():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"
    assert response.headers.get("x-xss-protection") == "1; mode=block"


def test_market_endpoint():
    response = client.get("/api/market")
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "top_gainers" in data
    assert "top_losers" in data
    assert "top_turnover" in data


def test_stocks_endpoint():
    response = client.get("/api/stocks?limit=10&sort_by=turnover")
    assert response.status_code == 200
    data = response.json()
    assert "stocks" in data
    assert len(data["stocks"]) <= 10


def test_stock_detail_and_404():
    stocks_res = client.get("/api/stocks?limit=1")
    stocks = stocks_res.json()["stocks"]
    if stocks:
        sym = stocks[0]["symbol"]
        detail_res = client.get(f"/api/stocks/{sym}")
        assert detail_res.status_code == 200
        assert detail_res.json()["stock"]["symbol"] == sym

    res_404 = client.get("/api/stocks/NONEXISTENT999")
    assert res_404.status_code == 404


def test_suggestions_endpoint():
    response = client.get("/api/suggestions")
    assert response.status_code == 200
    data = response.json()
    assert "suggestions" in data
    assert "count" in data


def test_watchlist_crud_and_validation():
    test_symbol = "TESTSTOCK"
    
    # 1. Add to watchlist
    res_add = client.post("/api/watchlist", json={"symbol": test_symbol, "target_price": 500.0, "notes": "Test stock note"})
    assert res_add.status_code == 200
    
    # 2. Check watchlist
    res_list = client.get("/api/watchlist")
    assert res_list.status_code == 200
    symbols = [w["symbol"] for w in res_list.json()["watchlist"]]
    assert test_symbol in symbols
    
    # 3. Delete from watchlist
    res_del = client.delete(f"/api/watchlist/{test_symbol}")
    assert res_del.status_code == 200

    # 4. Input validation: invalid symbol rejected
    res_invalid = client.post("/api/watchlist", json={"symbol": "INVALID SYMBOL!@#", "target_price": -50.0})
    assert res_invalid.status_code == 422


def test_api_key_protection():
    original_key = config.API_KEY
    try:
        config.API_KEY = "super-secret-key-123"

        # 1. Request without key should be rejected with 401
        res_unauthorized = client.post("/api/watchlist", json={"symbol": "NABIL"})
        assert res_unauthorized.status_code == 401

        # 2. Request with incorrect key should be rejected with 401
        res_bad_key = client.post("/api/watchlist", json={"symbol": "NABIL"}, headers={"X-API-Key": "wrong-key"})
        assert res_bad_key.status_code == 401

        # 3. Request with correct key should succeed
        res_ok = client.post("/api/watchlist", json={"symbol": "NABIL"}, headers={"X-API-Key": "super-secret-key-123"})
        assert res_ok.status_code == 200
    finally:
        config.API_KEY = original_key


def test_screener_engine_logic():
    sample_stocks = [
        {
            "symbol": "ALPHA",
            "name": "Alpha Corp",
            "ltp": 500.0,
            "pct_change": 2.5,
            "volume": 200000,
            "turnover": 25000000,
            "transactions": 450,
            "avg_120": 480.0,
            "avg_180": 475.0,
            "high_52": 510.0,
            "low_52": 320.0
        }
    ]
    sample_news = [
        {
            "title": "ALPHA proposes 15% bonus share dividend",
            "matched_symbols": ["ALPHA"],
            "sentiment": "positive",
            "is_catalyst": True
        }
    ]
    
    suggestions = generate_stock_suggestions(sample_stocks, sample_news)
    assert len(suggestions) > 0
    symbols_suggested = [s["symbol"] for s in suggestions]
    assert "ALPHA" in symbols_suggested
