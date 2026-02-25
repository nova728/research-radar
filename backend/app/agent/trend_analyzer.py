"""
差异化功能 #1 — 趋势检测
计算各关键词在过去 N 周的论文出现频率
可选：调用 LLM 生成自然语言趋势解读
"""
import json
from collections import defaultdict

from app.db.database import get_conn
from app.agent.llm import call_llm, llm_available

TREND_PROMPT_ZH = """你是一位 AI 领域的研究分析师。
以下是过去12周各研究方向/术语在 ArXiv 论文中的出现频率数据（每行格式：术语: [周1数量, 周2数量, ...]）：

{data}

请用中文写一段100-150字的趋势分析，回答：
1. 哪些方向正在快速升温？
2. 哪些方向可能在降温或趋于平稳？
3. 有没有突然出现的新热点？

直接写分析段落，不要标题，不要列表，不要重复数据。"""

TREND_PROMPT_EN = """You are a research analyst in the AI field.
Below is the weekly publication frequency data for research topics/terms in ArXiv papers over the past 12 weeks (format: term: [week1_count, week2_count, ...]):

{data}

Write a 100-150 word trend analysis in English covering:
1. Which directions are heating up rapidly?
2. Which directions may be cooling down or plateauing?
3. Are there any sudden emerging hot topics?

Write a single paragraph directly. No headings, no bullet lists, no repeating raw numbers."""


def get_trend_data(weeks: int = 3) -> dict:
    """
    返回最近 N 周各主题论文数量趋势。
    keyword_trend 表现在只存主题名（topics_config），无需去重。
    """
    conn = get_conn()

    # 取最近 N 周的所有记录
    all_kw_count = max(len(_get_all_keywords()), 1)
    rows = conn.execute(
        """SELECT keyword, week, count
           FROM keyword_trend
           ORDER BY week DESC
           LIMIT ?""",
        (weeks * all_kw_count,),
    ).fetchall()

    if not rows:
        return {"weeks": [], "series": {}}

    # 整理成 week 有序列表
    all_weeks = sorted(set(r["week"] for r in rows))[-weeks:]
    series = defaultdict(lambda: [0] * len(all_weeks))
    week_index = {w: i for i, w in enumerate(all_weeks)}

    for row in rows:
        if row["week"] in week_index:
            series[row["keyword"]][week_index[row["week"]]] = row["count"]

    # 过滤掉全为 0 的
    series = {k: v for k, v in series.items() if any(x > 0 for x in v)}

    return {"weeks": all_weeks, "series": dict(series)}


def get_trend_insight(trend_data: dict, lang: str = "zh") -> str:
    """调用 LLM 生成趋势解读，LLM 不可用时返回统计摘要"""
    if not trend_data["series"]:
        return "暂无趋势数据，请先完成一次论文抓取。" if lang == "zh" else "No trend data yet. Please fetch papers first."

    if not llm_available():
        return _simple_insight(trend_data, lang=lang)

    # 构造数据描述
    lines = []
    for term, counts in trend_data["series"].items():
        lines.append(f"{term}: {counts}")
    data_str = "\n".join(lines)

    prompt = TREND_PROMPT_ZH if lang == "zh" else TREND_PROMPT_EN
    return call_llm(prompt.format(data=data_str))


def _simple_insight(trend_data: dict, lang: str = "zh") -> str:
    """LLM 不可用时的降级：纯统计描述"""
    series = trend_data["series"]
    if not series:
        return "暂无数据" if lang == "zh" else "No data available."

    # 找增长最快和最慢的
    growth = {}
    for term, counts in series.items():
        if len(counts) >= 4:
            recent = sum(counts[-4:])
            earlier = sum(counts[-8:-4]) or 1
            growth[term] = recent / earlier

    if not growth:
        return "__ACCUMULATING__"

    top = sorted(growth.items(), key=lambda x: x[1], reverse=True)

    if lang == "en":
        rising = [f"{k} (+{v:.0%})" for k, v in top[:3] if v > 1.2]
        cooling = [f"{k} ({v:.0%})" for k, v in top[-2:] if v < 0.8]
        parts = []
        if rising:
            parts.append(f"Rising directions: {', '.join(rising)}")
        if cooling:
            parts.append(f"Cooling directions: {', '.join(cooling)}")
        if not parts:
            parts.append("All directions are relatively stable.")
        return ". ".join(parts) + ". (LLM not configured — statistical mode)"
    else:
        rising = [f"{k}（+{v:.0%}）" for k, v in top[:3] if v > 1.2]
        cooling = [f"{k}（{v:.0%}）" for k, v in top[-2:] if v < 0.8]
        parts = []
        if rising:
            parts.append(f"近期升温方向：{'、'.join(rising)}")
        if cooling:
            parts.append(f"相对降温方向：{'、'.join(cooling)}")
        if not parts:
            parts.append("各方向热度相对平稳。")
        return "。".join(parts) + "。（LLM 未配置，当前为统计模式）"


def _get_all_keywords() -> list[str]:
    conn = get_conn()
    rows = conn.execute("SELECT DISTINCT keyword FROM keyword_trend").fetchall()
    return [r["keyword"] for r in rows] or ["LoRA"]  # fallback
