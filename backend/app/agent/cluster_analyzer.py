"""
差异化功能 #2 — 跨论文聚类分析
聚类（分组）和 LLM 分析分离：
- get_weekly_clusters()      只做分组，不调 LLM，结果缓存
- analyze_single_cluster()   对单个簇调 LLM，结果写回缓存
"""
import json
from datetime import datetime, timedelta

from app.db.database import get_conn
from app.agent.llm import call_llm, llm_available

CROSS_PAPER_PROMPT_ZH = """以下是本周关于同一研究方向的 {n} 篇 ArXiv 论文：

{abstracts}

请用中文回答（每部分2-3句话，简洁）：
【议题名称】给这个研究方向起一个10字以内的中文名称
【共同问题】这几篇论文都在解决什么核心问题？
【方法对比】各自采用了什么不同的方法？有哪些方法思路本质相同只是换了名字？
【开放问题】目前这个方向最大的未解决问题是什么？"""

CROSS_PAPER_PROMPT_EN = """The following are {n} ArXiv papers this week on a shared research direction:

{abstracts}

Please answer in English (2-3 sentences each, concise):
[Topic Name] A concise name (5 words or less) for this research direction
[Common Problem] What core problem do these papers all address?
[Method Comparison] What different approaches do they take? Are any methods essentially the same under different names?
[Open Questions] What is the biggest unsolved challenge in this direction?"""


def _week_label(week_offset: int) -> str:
    target = datetime.now() + timedelta(weeks=week_offset)
    iso = target.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def get_weekly_clusters(week_offset: int = 0) -> list[dict]:
    """
    只做论文聚类分组，不调 LLM。
    每个簇的 analysis 字段为 None（未分析）或已缓存的结果。
    """
    conn = get_conn()
    week = _week_label(week_offset)

    # 读缓存
    cached = conn.execute(
        "SELECT report_json FROM weekly_reports WHERE week = ?", (week,)
    ).fetchone()
    if cached:
        return json.loads(cached["report_json"])

    # 实时聚类（不调 LLM）
    clusters = _compute_clusters(week)

    # 写缓存
    if clusters:
        conn.execute(
            "INSERT OR REPLACE INTO weekly_reports (week, report_json) VALUES (?, ?)",
            (week, json.dumps(clusters, ensure_ascii=False)),
        )
        conn.commit()

    return clusters


def analyze_single_cluster(week_offset: int, cluster_id: int, lang: str = "zh") -> dict | None:
    """
    对单个簇调用 LLM 生成分析，并将结果写回缓存。
    返回更新后的 analysis dict，若失败返回 None。
    """
    conn = get_conn()
    week = _week_label(week_offset)

    cached = conn.execute(
        "SELECT report_json FROM weekly_reports WHERE week = ?", (week,)
    ).fetchone()
    if not cached:
        return None

    clusters: list[dict] = json.loads(cached["report_json"])
    target = next((c for c in clusters if c["cluster_id"] == cluster_id), None)
    if not target:
        return None

    # 重新取论文完整数据（缓存里只存了精简字段）
    paper_ids = [p["id"] for p in target["papers"]]
    rows = conn.execute(
        f"SELECT id, title, abstract, topic FROM papers WHERE id IN ({','.join('?'*len(paper_ids))})",
        paper_ids,
    ).fetchall()
    full_papers = [dict(r) for r in rows]

    analysis = _analyze_cluster(full_papers, lang=lang)
    target["analysis"] = analysis

    # 写回缓存
    conn.execute(
        "INSERT OR REPLACE INTO weekly_reports (week, report_json) VALUES (?, ?)",
        (week, json.dumps(clusters, ensure_ascii=False)),
    )
    conn.commit()

    return analysis


def _compute_clusters(week_label: str) -> list[dict]:
    """按 topic 分组（每个主题一张卡片），analysis 统一为 None（待按需生成）"""
    conn = get_conn()

    year, week_num = week_label.split("-W")
    week_start = datetime.fromisocalendar(int(year), int(week_num), 1)
    week_end = week_start + timedelta(days=7)

    papers = conn.execute(
        """SELECT id, title, abstract, url, topic
           FROM papers
           WHERE created_at BETWEEN ? AND ?
           ORDER BY created_at DESC""",
        (week_start.isoformat(), week_end.isoformat()),
    ).fetchall()

    if len(papers) < 1:
        return []

    papers = [dict(p) for p in papers]
    return _fallback_by_topic(papers)


def _analyze_cluster(papers: list[dict], lang: str = "zh") -> dict:
    """调用 LLM 分析一个簇，lang='zh' 或 'en'"""
    if not llm_available() or len(papers) < 2:
        return {
            "topic_name": papers[0].get("topic", "") if papers else "",
            "common_problem": "",
            "method_comparison": "",
            "open_questions": "",
        }

    abstracts = "\n\n".join(
        f"[{i+1}] Title: {p['title']}\nAbstract: {p.get('abstract', '')[:300]}..."
        for i, p in enumerate(papers[:6])
    )

    if lang == "en":
        prompt = CROSS_PAPER_PROMPT_EN
        raw = call_llm(prompt.format(n=len(papers), abstracts=abstracts))
        return {
            "topic_name":        _extract_section_bracket(raw, "Topic Name"),
            "common_problem":    _extract_section_bracket(raw, "Common Problem"),
            "method_comparison": _extract_section_bracket(raw, "Method Comparison"),
            "open_questions":    _extract_section_bracket(raw, "Open Questions"),
        }
    else:
        prompt = CROSS_PAPER_PROMPT_ZH
        raw = call_llm(prompt.format(n=len(papers), abstracts=abstracts))
        return {
            "topic_name":        _extract_section(raw, "议题名称"),
            "common_problem":    _extract_section(raw, "共同问题"),
            "method_comparison": _extract_section(raw, "方法对比"),
            "open_questions":    _extract_section(raw, "开放问题"),
        }


def _extract_section(text: str, section: str) -> str:
    """提取中文【section】标记的内容"""
    marker = f"【{section}】"
    if marker not in text:
        return ""
    start = text.index(marker) + len(marker)
    next_marker = text.find("【", start)
    end = next_marker if next_marker > 0 else len(text)
    return text[start:end].strip()


def _extract_section_bracket(text: str, section: str) -> str:
    """提取英文 [section] 标记的内容"""
    marker = f"[{section}]"
    if marker not in text:
        return ""
    start = text.index(marker) + len(marker)
    next_marker = text.find("[", start)
    end = next_marker if next_marker > 0 else len(text)
    return text[start:end].strip()


def _fallback_by_topic(papers: list[dict]) -> list[dict]:
    groups: dict[str, list] = {}
    for p in papers:
        groups.setdefault(p["topic"], []).append(p)
    return [
        {
            "cluster_id": i,
            "paper_count": len(ps),
            "dominant_topic": topic,
            "analysis": None,
            "papers": [{"id": p["id"], "title": p["title"], "url": p["url"], "topic": p["topic"]} for p in ps],
        }
        for i, (topic, ps) in enumerate(groups.items())
    ]
