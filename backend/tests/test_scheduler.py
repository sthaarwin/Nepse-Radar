import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from nepse_alert.engine.scheduler import (
    NEPAL_TZ,
    get_nepal_now,
    is_trading_day,
    calculate_next_market_open,
    get_market_session
)
from nepse_alert.api.main import app

client = TestClient(app)


def test_nepal_timezone():
    now = get_nepal_now()
    assert now.tzinfo is not None
    # Offset must be +05:45
    offset = now.utcoffset()
    assert offset == timedelta(hours=5, minutes=45)


def test_trading_day_detection():
    # 2026-11-22 is Sunday (weekday 6) -> Trading Day
    sun = datetime(2026, 11, 22, 12, 0, tzinfo=NEPAL_TZ)
    assert is_trading_day(sun) is True

    # 2026-11-23 is Monday (weekday 0) -> Trading Day
    mon = datetime(2026, 11, 23, 12, 0, tzinfo=NEPAL_TZ)
    assert is_trading_day(mon) is True

    # 2026-11-26 is Thursday (weekday 3) -> Trading Day
    thu = datetime(2026, 11, 26, 12, 0, tzinfo=NEPAL_TZ)
    assert is_trading_day(thu) is True

    # 2026-11-27 is Friday (weekday 4) -> Closed
    fri = datetime(2026, 11, 27, 12, 0, tzinfo=NEPAL_TZ)
    assert is_trading_day(fri) is False

    # 2026-11-28 is Saturday (weekday 5) -> Closed
    sat = datetime(2026, 11, 28, 12, 0, tzinfo=NEPAL_TZ)
    assert is_trading_day(sat) is False


def test_market_session_open_and_closed():
    # Sunday at 11:30 AM -> OPEN
    sun_trading = datetime(2026, 11, 22, 11, 30, tzinfo=NEPAL_TZ)
    session = get_market_session(sun_trading)
    assert session["status"] == "OPEN"
    assert session["is_open"] is True
    assert session["is_trading_day"] is True
    assert "Live" in session["status_message"]

    # Sunday at 10:40 AM -> PRE_OPEN
    sun_pre = datetime(2026, 11, 22, 10, 40, tzinfo=NEPAL_TZ)
    session = get_market_session(sun_pre)
    assert session["status"] == "PRE_OPEN"
    assert session["is_open"] is False
    assert session["is_trading_day"] is True

    # Thursday at 15:05 PM -> POST_CLOSE
    thu_post = datetime(2026, 11, 26, 15, 5, tzinfo=NEPAL_TZ)
    session = get_market_session(thu_post)
    assert session["status"] == "POST_CLOSE"
    assert session["is_open"] is False

    # Friday at 12:00 PM -> CLOSED (Friday weekend)
    fri_noon = datetime(2026, 11, 27, 12, 0, tzinfo=NEPAL_TZ)
    session = get_market_session(fri_noon)
    assert session["status"] == "CLOSED"
    assert session["is_open"] is False
    assert session["is_trading_day"] is False
    assert "Friday" in session["status_message"]

    # Saturday at 14:00 PM -> CLOSED (Saturday weekend)
    sat_noon = datetime(2026, 11, 28, 14, 0, tzinfo=NEPAL_TZ)
    session = get_market_session(sat_noon)
    assert session["status"] == "CLOSED"
    assert session["is_open"] is False
    assert session["is_trading_day"] is False
    assert "Saturday" in session["status_message"]

    # Monday at 08:30 AM -> CLOSED (morning before open)
    mon_morning = datetime(2026, 11, 23, 8, 30, tzinfo=NEPAL_TZ)
    session = get_market_session(mon_morning)
    assert session["status"] == "CLOSED"
    assert session["is_open"] is False
    assert session["is_trading_day"] is True


def test_next_market_open_calculation():
    # Thursday at 16:00 PM -> Next open is Sunday 11:00 AM
    thu_evening = datetime(2026, 11, 26, 16, 0, tzinfo=NEPAL_TZ)
    next_open = calculate_next_market_open(thu_evening)
    assert next_open.weekday() == 6  # Sunday
    assert next_open.hour == 11
    assert next_open.minute == 0

    # Friday at 10:00 AM -> Next open is Sunday 11:00 AM
    fri_morning = datetime(2026, 11, 27, 10, 0, tzinfo=NEPAL_TZ)
    next_open = calculate_next_market_open(fri_morning)
    assert next_open.weekday() == 6  # Sunday
    assert next_open.hour == 11

    # Monday at 09:00 AM -> Next open is Monday 11:00 AM (same day)
    mon_morning = datetime(2026, 11, 23, 9, 0, tzinfo=NEPAL_TZ)
    next_open = calculate_next_market_open(mon_morning)
    assert next_open.date() == mon_morning.date()
    assert next_open.hour == 11

    # Monday at 16:00 PM -> Next open is Tuesday 11:00 AM (next day)
    mon_evening = datetime(2026, 11, 23, 16, 0, tzinfo=NEPAL_TZ)
    next_open = calculate_next_market_open(mon_evening)
    assert next_open.weekday() == 1  # Tuesday
    assert next_open.hour == 11


def test_market_status_api():
    response = client.get("/api/market/status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "is_open" in data
    assert "is_trading_day" in data
    assert "nepal_time" in data
    assert "status_message" in data
    assert "next_open" in data


def test_market_overview_includes_status():
    response = client.get("/api/market")
    assert response.status_code == 200
    data = response.json()
    assert "market_status" in data
    assert "status" in data["market_status"]
