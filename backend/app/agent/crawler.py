"""
ArXiv 抓取 Agent
- 按配置的 topics_config 定时抓取
- 同时更新 keyword_trend 表（趋势统计）
"""
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

import arxiv

from app.db.database import get_conn


def get_iso_week(dt: datetime) -> str:
    """返回 '2025-W04' 格式"""
    return f"{dt.isocalendar()[0]}-W{dt.isocalendar()[1]:02d}"


def crawl_topic(topic_name: str, keywords: list[str], max_results: int = 90) -> int:
    """
    抓取单个 topic 的最新论文（默认约 3 周数据量）
    返回新增论文数
    """
    conn = get_conn()
    client = arxiv.Client()

    query = " OR ".join(f'"{kw}"' for kw in keywords)
    search = arxiv.Search(
        query=query,
        max_results=max_results,
        sort_by=arxiv.SortCriterion.SubmittedDate,
    )

    new_count = 0
    for paper in client.results(search):
        paper_id = paper.entry_id.split("/")[-1]  # e.g. "2401.12345v1" → "2401.12345v1"

        # 去重检查
        exists = conn.execute(
            "SELECT 1 FROM papers WHERE id = ?", (paper_id,)
        ).fetchone()
        if exists:
            continue

        # 存入 papers 表
        conn.execute(
            """INSERT OR IGNORE INTO papers
               (id, title, abstract, authors, url, topic, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                paper_id,
                paper.title,
                paper.summary.replace("\n", " "),
                json.dumps([a.name for a in paper.authors]),
                paper.entry_id,
                topic_name,
                paper.published.isoformat(),
            ),
        )

        # 更新 keyword_trend：只记录 topic 名称本身（不再记录 TREND_TERMS 避免重复）
        week = get_iso_week(paper.published)
        conn.execute(
            """INSERT INTO keyword_trend (keyword, week, count)
               VALUES (?, ?, 1)
               ON CONFLICT(keyword, week) DO UPDATE SET count = count + 1""",
            (topic_name, week),
        )
        new_count += 1

    conn.commit()
    return new_count


def crawl_all() -> dict[str, int]:
    """抓取所有启用的 topic，返回各 topic 新增数量"""
    conn = get_conn()
    topics = conn.execute(
        "SELECT name, keywords FROM topics_config WHERE enabled = 1"
    ).fetchall()

    results = {}
    for row in topics:
        name = row["name"]
        keywords = json.loads(row["keywords"])
        try:
            count = crawl_topic(name, keywords)
            results[name] = count
            print(f"[Crawler] {name}: +{count} papers")
        except Exception as e:
            print(f"[Crawler] {name} 失败: {e}")
            results[name] = -1

    return results


def crawl_historical(until_date: str | None = None, max_per_topic: int = 300) -> dict[str, int]:
    """
    抓取历史数据至指定截止日期。
    until_date: 'YYYY-MM-DD'，不传则默认抓取过去 12 周。
    arxiv API 按提交时间倒序，fetch_count 越大越能覆盖更早的论文。
    """
    from datetime import date
    conn = get_conn()
    topics = conn.execute(
        "SELECT name, keywords FROM topics_config WHERE enabled = 1"
    ).fetchall()

    if until_date:
        try:
            target = date.fromisoformat(until_date)
            weeks_back = max(1, (date.today() - target).days // 7)
        except ValueError:
            weeks_back = 12
    else:
        weeks_back = 12

    # 每周约 30 篇，最多 300
    fetch_count = min(weeks_back * 30, max_per_topic)

    results = {}
    for row in topics:
        name = row["name"]
        keywords = json.loads(row["keywords"])
        try:
            count = crawl_topic(name, keywords, max_results=fetch_count)
            results[name] = count
            print(f"[Historical] {name}: +{count} papers (until={until_date}, fetch={fetch_count})")
        except Exception as e:
            print(f"[Historical] {name} 失败: {e}")
            results[name] = -1

    return results
