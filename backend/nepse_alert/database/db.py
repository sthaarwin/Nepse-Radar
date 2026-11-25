import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from nepse_alert.config import DB_PATH


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Stocks Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS stocks (
                symbol TEXT PRIMARY KEY,
                name TEXT,
                ltp REAL,
                point_change REAL,
                pct_change REAL,
                open REAL,
                high REAL,
                low REAL,
                close REAL,
                volume REAL,
                prev_close REAL,
                turnover REAL,
                transactions INTEGER,
                vwap REAL,
                avg_120 REAL,
                avg_180 REAL,
                high_52 REAL,
                low_52 REAL,
                sector TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Market Summary Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS market_summary (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                nepse_index REAL,
                index_change REAL,
                index_pct_change REAL,
                total_turnover REAL,
                total_shares REAL,
                total_transactions INTEGER,
                advances INTEGER,
                declines INTEGER,
                unchanged INTEGER,
                market_status TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Financial News Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS news (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT UNIQUE,
                summary TEXT,
                source TEXT,
                link TEXT,
                published_date TEXT,
                matched_symbols TEXT, -- JSON array of tickers
                sentiment TEXT,       -- positive, neutral, negative
                is_catalyst BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Stock Suggestions Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS suggestions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT,
                signal_type TEXT,     -- VOLUME_SURGE, 52W_BREAKOUT, 52W_REBOUND, CORPORATE_CATALYST
                title TEXT,
                rationale TEXT,
                score INTEGER,        -- 0 to 100
                ltp REAL,
                pct_change REAL,
                volume REAL,
                avg_volume REAL,
                volume_surge_pct REAL,
                high_52 REAL,
                low_52 REAL,
                catalyst_text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Watchlist Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS watchlist (
                symbol TEXT PRIMARY KEY,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                target_price REAL,
                notes TEXT
            )
        """)

        # Index for fast search
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_stocks_turnover ON stocks(turnover DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_stocks_pct_change ON stocks(pct_change DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_suggestions_created ON suggestions(created_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_created ON news(created_at DESC)")
        
        conn.commit()


def upsert_stocks(stocks: List[Dict[str, Any]]):
    if not stocks:
        return
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.executemany("""
            INSERT INTO stocks (
                symbol, name, ltp, point_change, pct_change, open, high, low, close,
                volume, prev_close, turnover, transactions, vwap, avg_120, avg_180,
                high_52, low_52, sector, updated_at
            ) VALUES (
                :symbol, :name, :ltp, :point_change, :pct_change, :open, :high, :low, :close,
                :volume, :prev_close, :turnover, :transactions, :vwap, :avg_120, :avg_180,
                :high_52, :low_52, :sector, :updated_at
            )
            ON CONFLICT(symbol) DO UPDATE SET
                name=excluded.name,
                ltp=excluded.ltp,
                point_change=excluded.point_change,
                pct_change=excluded.pct_change,
                open=excluded.open,
                high=excluded.high,
                low=excluded.low,
                close=excluded.close,
                volume=excluded.volume,
                prev_close=excluded.prev_close,
                turnover=excluded.turnover,
                transactions=excluded.transactions,
                vwap=excluded.vwap,
                avg_120=excluded.avg_120,
                avg_180=excluded.avg_180,
                high_52=excluded.high_52,
                low_52=excluded.low_52,
                sector=excluded.sector,
                updated_at=excluded.updated_at
        """, [{**s, "updated_at": now} for s in stocks])
        conn.commit()


def upsert_market_summary(summary: Dict[str, Any]):
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO market_summary (
                id, nepse_index, index_change, index_pct_change, total_turnover,
                total_shares, total_transactions, advances, declines, unchanged,
                market_status, updated_at
            ) VALUES (
                1, :nepse_index, :index_change, :index_pct_change, :total_turnover,
                :total_shares, :total_transactions, :advances, :declines, :unchanged,
                :market_status, :updated_at
            )
            ON CONFLICT(id) DO UPDATE SET
                nepse_index=excluded.nepse_index,
                index_change=excluded.index_change,
                index_pct_change=excluded.index_pct_change,
                total_turnover=excluded.total_turnover,
                total_shares=excluded.total_shares,
                total_transactions=excluded.total_transactions,
                advances=excluded.advances,
                declines=excluded.declines,
                unchanged=excluded.unchanged,
                market_status=excluded.market_status,
                updated_at=excluded.updated_at
        """, {**summary, "updated_at": now})
        conn.commit()


def save_news(news_list: List[Dict[str, Any]]) -> int:
    inserted = 0
    with get_connection() as conn:
        cursor = conn.cursor()
        for item in news_list:
            matched_json = json.dumps(item.get("matched_symbols", []))
            try:
                cursor.execute("""
                    INSERT INTO news (
                        title, summary, source, link, published_date,
                        matched_symbols, sentiment, is_catalyst
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    item.get("title"),
                    item.get("summary", ""),
                    item.get("source", "Sharesansar"),
                    item.get("link", ""),
                    item.get("published_date", ""),
                    matched_json,
                    item.get("sentiment", "neutral"),
                    1 if item.get("is_catalyst") else 0
                ))
                inserted += 1
            except sqlite3.IntegrityError:
                # News title already exists, skip
                pass
        conn.commit()
    return inserted


def save_suggestions(suggestions: List[Dict[str, Any]]):
    with get_connection() as conn:
        cursor = conn.cursor()
        # Keep latest suggestions fresh
        cursor.execute("DELETE FROM suggestions")
        for s in suggestions:
            cursor.execute("""
                INSERT INTO suggestions (
                    symbol, signal_type, title, rationale, score, ltp,
                    pct_change, volume, avg_volume, volume_surge_pct,
                    high_52, low_52, catalyst_text
                ) VALUES (
                    :symbol, :signal_type, :title, :rationale, :score, :ltp,
                    :pct_change, :volume, :avg_volume, :volume_surge_pct,
                    :high_52, :low_52, :catalyst_text
                )
            """, s)
        conn.commit()


def get_stocks(limit: int = 100, search: str = "", sort_by: str = "turnover") -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        valid_sorts = {
            "turnover": "turnover DESC",
            "gainers": "pct_change DESC",
            "losers": "pct_change ASC",
            "volume": "volume DESC",
            "symbol": "symbol ASC"
        }
        order_clause = valid_sorts.get(sort_by, "turnover DESC")
        
        if search:
            cursor.execute(f"""
                SELECT * FROM stocks 
                WHERE symbol LIKE ? OR name LIKE ?
                ORDER BY {order_clause} LIMIT ?
            """, (f"%{search.upper()}%", f"%{search}%", limit))
        else:
            cursor.execute(f"SELECT * FROM stocks ORDER BY {order_clause} LIMIT ?", (limit,))
        
        return [dict(row) for row in cursor.fetchall()]


def get_stock(symbol: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM stocks WHERE symbol = ?", (symbol.upper(),))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_market_summary() -> Dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM market_summary WHERE id = 1")
        row = cursor.fetchone()
        if row:
            return dict(row)
        return {
            "nepse_index": 2750.50,
            "index_change": 15.20,
            "index_pct_change": 0.55,
            "total_turnover": 7_500_000_000,
            "total_shares": 18_000_000,
            "total_transactions": 85000,
            "advances": 145,
            "declines": 88,
            "unchanged": 12,
            "market_status": "Closed",
            "updated_at": datetime.now().isoformat()
        }


def get_news(limit: int = 30, symbol: str = "") -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        if symbol:
            cursor.execute("""
                SELECT * FROM news 
                WHERE matched_symbols LIKE ? 
                ORDER BY id DESC LIMIT ?
            """, (f'%"{symbol.upper()}"%', limit))
        else:
            cursor.execute("SELECT * FROM news ORDER BY id DESC LIMIT ?", (limit,))
        
        rows = cursor.fetchall()
        result = []
        for row in rows:
            d = dict(row)
            try:
                d["matched_symbols"] = json.loads(d["matched_symbols"]) if d["matched_symbols"] else []
            except Exception:
                d["matched_symbols"] = []
            result.append(d)
        return result


def get_suggestions(signal_type: str = "") -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        if signal_type and signal_type != "ALL":
            cursor.execute("""
                SELECT * FROM suggestions 
                WHERE signal_type = ? 
                ORDER BY score DESC, volume_surge_pct DESC
            """, (signal_type.upper(),))
        else:
            cursor.execute("SELECT * FROM suggestions ORDER BY score DESC, volume_surge_pct DESC")
        
        return [dict(row) for row in cursor.fetchall()]


def get_watchlist() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT w.symbol, w.added_at, w.target_price, w.notes,
                   s.name, s.ltp, s.pct_change, s.point_change, s.volume, s.turnover, s.high_52, s.low_52
            FROM watchlist w
            LEFT JOIN stocks s ON w.symbol = s.symbol
            ORDER BY w.added_at DESC
        """)
        return [dict(row) for row in cursor.fetchall()]


def add_to_watchlist(symbol: str, target_price: Optional[float] = None, notes: str = "") -> bool:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO watchlist (symbol, target_price, notes)
            VALUES (?, ?, ?)
            ON CONFLICT(symbol) DO UPDATE SET
                target_price=COALESCE(excluded.target_price, target_price),
                notes=COALESCE(excluded.notes, notes)
        """, (symbol.upper(), target_price, notes))
        conn.commit()
        return True


def remove_from_watchlist(symbol: str) -> bool:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM watchlist WHERE symbol = ?", (symbol.upper(),))
        conn.commit()
        return True
