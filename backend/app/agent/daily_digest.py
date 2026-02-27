"""
每日/每周精选报告生成器
对每篇论文生成深度摘要（核心方法、对比分析、借鉴意义），
按主题归档，输出结构化 Markdown 文档。

论文筛选采用多维评分机制，综合以下四个维度对本周所有论文打分后取 top_n：
  ① 标题新颖度   —— 包含"novel/new/first/efficient/beyond/..."等创新词加分
  ② 摘要信号强度 —— 包含"state-of-the-art/outperform/benchmark/dataset..."等实证词加分
  ③ 作者影响力   —— 多作者合作（机构合作）论文适度加分
  ④ 时效性       —— 发表时间越靠近本周末越新鲜，给予时效加分
最终分数 = 各维度加权求和（0~100 分），报告中同步展示分数。
"""
import json
import re
from datetime import datetime, timedelta, timezone
from app.db.database import get_conn
from app.agent.llm import call_llm, llm_available

# ── Prompts ─────────────────────────────────────────────────────

PAPER_DIGEST_PROMPT_ZH = """请对以下 ArXiv 论文写一份简洁的研究解读（每部分 1-2 句话）：

标题：{title}
摘要：{abstract}

【核心方法】这篇论文提出了什么方法/框架/模型？关键创新点是什么？
【对比基线】与之前的方法相比改进了什么？（若摘要未提及，填"摘要未提及"）
【借鉴意义】对研究者有什么启发或参考价值？"""

PAPER_DIGEST_PROMPT_EN = """Write a concise research summary for the following ArXiv paper (1-2 sentences each):

Title: {title}
Abstract: {abstract}

[Core Method] What method/framework/model does this paper propose? What is the key innovation?
[Comparison] How does it improve over prior work? (If not mentioned, write "Not mentioned in abstract")
[Takeaway] What is the key insight or value for researchers?"""


# ── 多维评分 ─────────────────────────────────────────────────────

# 标题新颖度：出现这些词视为有明确创新主张
_NOVELTY_WORDS = re.compile(
    r"\b(novel|new|first|propose|efficient|scalable|beyond|improved|"
    r"unified|generalized|robust|lightweight|fast|zero.?shot|few.?shot|"
    r"end.?to.?end|large.?scale|real.?world|state.?of.?the.?art|sota)\b",
    re.I,
)

# 摘要实证信号：论文包含实验结果、数据集、基准比较等可信号
_EMPIRICAL_WORDS = re.compile(
    r"\b(outperform|state.?of.?the.?art|sota|benchmark|dataset|"
    r"experiment|evaluation|baseline|achieve|surpass|improve|"
    r"demonstrate|validate|significant|superior|competitive)\b",
    re.I,
)


def _score_paper(paper: dict, week_end: datetime) -> float:
    """
    多维评分（满分 100）：
      ① 标题新颖度  (0~30)  — 每个创新词 +6，上限 30
      ② 摘要实证度  (0~40)  — 每个实证词 +5，上限 40
      ③ 作者合作度  (0~15)  — 1人=0, 2-3人=8, 4-6人=12, 7+人=15
      ④ 时效性      (0~15)  — 发表距本周末越近越高（线性衰减，7天内满分）
    """
    title = paper.get("title", "")
    abstract = paper.get("abstract", "") or ""
    created_at = paper.get("created_at", "")

    # ① 标题新颖度
    novelty_hits = len(_NOVELTY_WORDS.findall(title))
    score_novelty = min(novelty_hits * 6, 30)

    # ② 摘要实证度（取前 600 字符）
    empirical_hits = len(_EMPIRICAL_WORDS.findall(abstract[:600]))
    score_empirical = min(empirical_hits * 5, 40)

    # ③ 作者合作度
    try:
        author_count = len(json.loads(paper.get("authors", "[]")))
    except Exception:
        author_count = 1
    if author_count <= 1:
        score_author = 0
    elif author_count <= 3:
        score_author = 8
    elif author_count <= 6:
        score_author = 12
    else:
        score_author = 15

    # ④ 时效性：发布距本周末的天数，越新越高
    score_time = 0
    if created_at:
        try:
            pub_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            if pub_dt.tzinfo is not None:
                pub_dt = pub_dt.replace(tzinfo=None)
            days_ago = (week_end - pub_dt).days
            # 0天=15分, 7天=7分, ≥14天=0分（线性）
            score_time = max(0, round(15 * (1 - days_ago / 14)))
        except Exception:
            score_time = 0

    total = score_novelty + score_empirical + score_author + score_time
    return round(total, 1)


def _week_range(week_offset: int):
    target = datetime.now() + timedelta(weeks=week_offset)
    iso = target.isocalendar()
    week_start = datetime.fromisocalendar(iso[0], iso[1], 1)
    week_end = week_start + timedelta(days=7)
    week_label = f"{iso[0]}-W{iso[1]:02d}"
    return week_start, week_end, week_label


def _digest_one_paper(paper: dict, lang: str) -> dict:
    """
    对单篇论文生成深度摘要。
    返回 {"core_method": ..., "comparison": ..., "takeaway": ...}
    """
    if not llm_available():
        return {"core_method": "", "comparison": "", "takeaway": ""}

    abstract = (paper.get("abstract") or "")[:600]
    if lang == "en":
        prompt = PAPER_DIGEST_PROMPT_EN.format(title=paper["title"], abstract=abstract)
        raw = call_llm(prompt, max_tokens=300)
        return {
            "core_method": _extract_bracket(raw, "Core Method"),
            "comparison":  _extract_bracket(raw, "Comparison"),
            "takeaway":    _extract_bracket(raw, "Takeaway"),
        }
    else:
        prompt = PAPER_DIGEST_PROMPT_ZH.format(title=paper["title"], abstract=abstract)
        raw = call_llm(prompt, max_tokens=300)
        return {
            "core_method": _extract_corner(raw, "核心方法"),
            "comparison":  _extract_corner(raw, "对比基线"),
            "takeaway":    _extract_corner(raw, "借鉴意义"),
        }


def generate_digest(week_offset: int = 0, lang: str = "zh", top_n: int = 5) -> str:
    """
    生成本周精选论文报告（Markdown 格式）。
    对每个主题的所有论文进行多维评分，取得分最高的 top_n 篇，逐篇生成深度摘要。
    评分维度：标题新颖度 / 摘要实证度 / 作者合作度 / 时效性（满分 100）
    """
    conn = get_conn()
    week_start, week_end, week_label = _week_range(week_offset)

    topics = conn.execute(
        "SELECT DISTINCT topic FROM papers WHERE created_at BETWEEN ? AND ? ORDER BY topic",
        (week_start.isoformat(), week_end.isoformat()),
    ).fetchall()

    if not topics:
        if lang == "zh":
            return f"# {week_label} 精选报告\n\n> 本周暂无论文数据，请先进行抓取。\n"
        else:
            return f"# {week_label} Weekly Digest\n\n> No papers found for this week. Please fetch papers first.\n"

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    if lang == "zh":
        lines = [
            f"# 📋 {week_label} 研究精选",
            f"\n> 生成时间：{now_str}　　本报告由 ResearchRadar 自动生成\n",
            f"> **筛选规则**：综合标题新颖度、摘要实证强度、合作规模、时效性四维评分，每方向取 Top {top_n}\n",
        ]
    else:
        lines = [
            f"# 📋 {week_label} Weekly Research Digest",
            f"\n> Generated: {now_str}　　Auto-generated by ResearchRadar\n",
            f"> **Selection**: Top {top_n} per topic, ranked by title novelty + empirical signals + collaboration + recency\n",
        ]

    total_papers = 0

    for topic_row in topics:
        topic = topic_row["topic"]

        # 取本周该主题所有论文，评分后取 top_n
        all_papers = conn.execute(
            """SELECT id, title, abstract, url, authors, created_at
               FROM papers
               WHERE topic = ? AND created_at BETWEEN ? AND ?""",
            (topic, week_start.isoformat(), week_end.isoformat()),
        ).fetchall()
        all_papers = [dict(p) for p in all_papers]

        if not all_papers:
            continue

        # 评分 & 排序
        for p in all_papers:
            p["_score"] = _score_paper(p, week_end)
        ranked = sorted(all_papers, key=lambda p: p["_score"], reverse=True)[:top_n]

        total_papers += len(ranked)

        if lang == "zh":
            lines.append(f"\n---\n\n## 🔬 {topic}（Top {len(ranked)} / 共 {len(all_papers)} 篇）\n")
        else:
            lines.append(f"\n---\n\n## 🔬 {topic} (Top {len(ranked)} of {len(all_papers)} papers)\n")

        for i, paper in enumerate(ranked):
            authors_raw = paper.get("authors", "[]")
            try:
                authors_list = json.loads(authors_raw)
                authors_str = ", ".join(authors_list[:3])
                if len(authors_list) > 3:
                    authors_str += " et al."
            except Exception:
                authors_str = ""

            date_str = (paper.get("created_at") or "")[:10]
            score = paper["_score"]

            # 分数徽章：≥70 高分, 50-69 中等, <50 入选
            if score >= 70:
                badge = "🌟"
            elif score >= 50:
                badge = "⭐"
            else:
                badge = "📄"

            lines.append(f"### {i+1}. {badge} {paper['title']}")
            meta_parts = []
            if authors_str:
                meta_parts.append(f"**{'作者' if lang == 'zh' else 'Authors'}:** {authors_str}")
            if date_str:
                meta_parts.append(f"**{'日期' if lang == 'zh' else 'Date'}:** {date_str}")
            meta_parts.append(f"**{'评分' if lang == 'zh' else 'Score'}:** {score}/100")
            meta_parts.append(f"[ArXiv]({paper['url']})")
            lines.append("\n" + "　　".join(meta_parts))
            lines.append("")

            # 生成深度摘要
            digest = _digest_one_paper(paper, lang)

            if lang == "zh":
                if digest["core_method"]:
                    lines.append(f"**💡 核心方法：** {digest['core_method']}")
                if digest["comparison"]:
                    lines.append(f"**📊 对比基线：** {digest['comparison']}")
                if digest["takeaway"]:
                    lines.append(f"**✨ 借鉴意义：** {digest['takeaway']}")
                if not any(digest.values()):
                    lines.append(f"**摘要：** {(paper.get('abstract') or '')[:200]}...")
            else:
                if digest["core_method"]:
                    lines.append(f"**💡 Core Method:** {digest['core_method']}")
                if digest["comparison"]:
                    lines.append(f"**📊 Comparison:** {digest['comparison']}")
                if digest["takeaway"]:
                    lines.append(f"**✨ Takeaway:** {digest['takeaway']}")
                if not any(digest.values()):
                    lines.append(f"**Abstract:** {(paper.get('abstract') or '')[:200]}...")

            lines.append("")

    # 末尾统计
    if lang == "zh":
        lines.append(f"\n---\n\n> 共收录 {total_papers} 篇精选论文 · 由 [ResearchRadar](https://github.com/nova728/research-radar) 自动生成\n")
    else:
        lines.append(f"\n---\n\n> {total_papers} selected papers · Generated by [ResearchRadar](https://github.com/nova728/research-radar)\n")

    return "\n".join(lines)


# ── 解析 LLM 输出 ────────────────────────────────────────────────

def _extract_corner(text: str, section: str) -> str:
    """提取中文【section】内容"""
    marker = f"【{section}】"
    if marker not in text:
        return ""
    start = text.index(marker) + len(marker)
    next_m = text.find("【", start)
    end = next_m if next_m > 0 else len(text)
    return text[start:end].strip()


def _extract_bracket(text: str, section: str) -> str:
    """提取英文 [section] 内容"""
    marker = f"[{section}]"
    if marker not in text:
        return ""
    start = text.index(marker) + len(marker)
    next_m = text.find("[", start)
    end = next_m if next_m > 0 else len(text)
    return text[start:end].strip()
