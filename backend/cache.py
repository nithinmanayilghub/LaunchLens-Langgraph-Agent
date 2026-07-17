import sqlite3
import json
import os
from typing import Any, Optional
from backend.config import SQLITE_DB_PATH

def _get_conn():
    """Create a connection to the cache/checkpoint database."""
    conn = sqlite3.connect(SQLITE_DB_PATH, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")  # Use WAL mode for safe concurrent reads/writes
    return conn

def init_cache_db():
    """Initialize the cache table in the SQLite database."""
    try:
        conn = _get_conn()
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS scraper_cache (
                    cache_type TEXT,
                    cache_key TEXT,
                    cache_value TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (cache_type, cache_key)
                )
            """)
    except Exception as e:
        print(f"Failed to initialize SQLite cache database: {e}")

# Initialize database table on import
init_cache_db()

def get_cached_query(cache_type: str, key: str, ttl_hours: int = 24) -> Optional[Any]:
    """
    Retrieve cached query result if it exists and is within the TTL.
    Returns parsed JSON object or None if expired/not found.
    """
    try:
        conn = _get_conn()
        cursor = conn.cursor()
        # Query for cache entry created within the last N hours
        cursor.execute(
            """
            SELECT cache_value FROM scraper_cache
            WHERE cache_type = ? AND cache_key = ?
            AND created_at > datetime('now', '-' || ? || ' hours')
            """,
            (cache_type, key, str(ttl_hours))
        )
        row = cursor.fetchone()
        if row:
            return json.loads(row[0])
    except Exception as e:
        print(f"Cache read error for {cache_type}/{key}: {e}")
    return None

def set_cached_query(cache_type: str, key: str, value: Any) -> None:
    """Save query result to cache as a JSON string."""
    try:
        conn = _get_conn()
        with conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO scraper_cache (cache_type, cache_key, cache_value, created_at)
                VALUES (?, ?, ?, datetime('now'))
                """,
                (cache_type, key, json.dumps(value))
            )
    except Exception as e:
        print(f"Cache write error for {cache_type}/{key}: {e}")
