"""trends.py — 趋势 API"""
from fastapi import APIRouter, Query
from app.agent.trend_analyzer import get_trend_data, get_trend_insight
from app.db.database import get_conn

router = APIRouter()


@router.get("")
def trend_data(weeks: int = Query(3, le=52)):
    data = get_trend_data(weeks)
    return data


@router.get("/insight")
def trend_insight(weeks: int = Query(3), refresh: bool = Query(False), lang: str = Query("zh")):
    data = get_trend_data(weeks)
    conn = get_conn()
    cache_key = f"{weeks}_{lang}"  # 不同语言分开缓存

    # 非强制刷新时先读缓存
    if not refresh:
        row = conn.execute(
            "SELECT insight FROM trend_insights WHERE weeks = ?", (cache_key,)
        ).fetchone()
        if row:
            return {"insight": row["insight"], "trend": data}

    # 生成新 insight
    insight = get_trend_insight(data, lang=lang)

    # 写入缓存
    conn.execute(
        "INSERT OR REPLACE INTO trend_insights (weeks, insight) VALUES (?, ?)",
        (cache_key, insight),
    )
    conn.commit()

    return {"insight": insight, "trend": data}
