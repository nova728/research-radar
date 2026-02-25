"""
数据库初始化 — SQLite（零依赖，打包友好）
所有数据存在 ~/.research-radar/radar.db
"""
import sqlite3
from pathlib import Path

_conn: sqlite3.Connection | None = None


def init_db(data_dir: Path):
    global _conn
    db_path = data_dir / "radar.db"
    _conn = sqlite3.connect(str(db_path), check_same_thread=False)
    _conn.row_factory = sqlite3.Row
    _create_tables(_conn)
    print(f"[DB] 初始化完成: {db_path}")


def get_conn() -> sqlite3.Connection:
    if _conn is None:
        raise RuntimeError("DB not initialized. Call init_db() first.")
    return _conn


def _create_tables(conn: sqlite3.Connection):
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS papers (
        id          TEXT PRIMARY KEY,   -- arxiv ID, e.g. "2401.12345"
        title       TEXT NOT NULL,
        abstract    TEXT NOT NULL,
        authors     TEXT,               -- JSON array string
        url         TEXT,
        topic       TEXT,               -- 用户配置的关键词组名
        created_at  TEXT,               -- arxiv 提交时间 ISO8601
        fetched_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS keyword_trend (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword     TEXT NOT NULL,
        week        TEXT NOT NULL,      -- 'YYYY-WNN' e.g. '2025-W04'
        count       INTEGER DEFAULT 0,
        UNIQUE(keyword, week)
    );

    CREATE TABLE IF NOT EXISTS topics_config (
        name        TEXT PRIMARY KEY,
        keywords    TEXT NOT NULL,      -- JSON array
        enabled     INTEGER DEFAULT 1,
        created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weekly_reports (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        week        TEXT NOT NULL,
        report_json TEXT NOT NULL,      -- 聚类分析结果 JSON
        created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trend_insights (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        weeks       INTEGER NOT NULL,
        insight     TEXT NOT NULL,
        generated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(weeks)
    );

    -- 初始化一些默认追踪主题
    INSERT OR IGNORE INTO topics_config (name, keywords) VALUES
        ('LLM Evaluation',  '["LLM evaluation", "benchmark", "hallucination", "RLHF"]'),
        ('Efficient LLM',   '["LoRA", "quantization", "MoE", "KV cache", "efficient inference"]'),
        ('Multimodal',      '["multimodal", "vision language", "VLM", "image understanding"]'),
        ('AI Agent',        '["agent", "tool use", "function calling", "agentic", "planning"]'),
        ('RAG',             '["retrieval augmented", "RAG", "knowledge retrieval", "vector search"]');
    """)
    conn.commit()
