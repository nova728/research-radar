"""
API 路由 — 论文相关
"""
from fastapi import APIRouter, Query
from fastapi.responses import Response
from app.db.database import get_conn
from app.agent.crawler import crawl_all, crawl_historical

router = APIRouter()


@router.get("")
def list_papers(
    topic: str = Query(None),
    q: str = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
):
    conn = get_conn()
    base = "SELECT id, title, abstract, authors, url, topic, created_at FROM papers"
    conditions, params = [], []

    if topic:
        conditions.append("topic = ?")
        params.append(topic)
    if q:
        conditions.append("(title LIKE ? OR abstract LIKE ?)")
        params.extend([f"%{q}%", f"%{q}%"])

    where = f" WHERE {' AND '.join(conditions)}" if conditions else ""
    total = conn.execute(f"SELECT COUNT(*) as n FROM papers{where}", params).fetchone()["n"]
    rows = conn.execute(
        f"{base}{where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
        params + [limit, offset],
    ).fetchall()

    return {
        "total": total,
        "papers": [dict(r) for r in rows],
    }


@router.post("/crawl")
def trigger_crawl():
    """手动触发一次抓取，完成后清除 insight 缓存"""
    import threading
    def run():
        results = crawl_all()
        print(f"[Manual crawl] {results}")
        # 清除旧的 insight 缓存，让下次访问重新生成
        try:
            conn = get_conn()
            conn.execute("DELETE FROM trend_insights")
            conn.commit()
        except Exception as e:
            print(f"[crawl] 清除 insight 缓存失败: {e}")
    threading.Thread(target=run, daemon=True).start()
    return {"message": "抓取已在后台启动"}


@router.post("/crawl-historical")
def trigger_crawl_historical(until_date: str = Query(None, description="截止日期 YYYY-MM-DD，不传则抓取过去12周")):
    """
    抓取历史论文，直到指定截止日期。
    until_date='2025-12-01' → 从今天往回抓到 2025-12-01 为止
    """
    import threading
    def run():
        results = crawl_historical(until_date=until_date)
        label = until_date or "12周前"
        print(f"[Historical crawl until={label}] {results}")
        try:
            conn = get_conn()
            conn.execute("DELETE FROM trend_insights")
            conn.execute("DELETE FROM weekly_reports")
            conn.commit()
        except Exception as e:
            print(f"[historical] 清除缓存失败: {e}")
    threading.Thread(target=run, daemon=True).start()
    return {"message": f"历史抓取已启动（截止 {until_date or '约12周前'}）"}


@router.get("/topics")
def list_topics():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM topics_config").fetchall()
    return [dict(r) for r in rows]


@router.post("/topics")
def add_topic(name: str, keywords: list[str]):
    import json
    conn = get_conn()
    conn.execute(
        "INSERT OR REPLACE INTO topics_config (name, keywords) VALUES (?, ?)",
        (name, json.dumps(keywords, ensure_ascii=False)),
    )
    conn.commit()
    return {"message": f"已添加主题: {name}"}


@router.put("/topics/{name}")
def update_topic(name: str, new_name: str = Query(None), keywords: list[str] = Query(default=None)):
    """编辑主题名称和/或关键词（keywords 通过 JSON body 传入）"""
    import json
    from fastapi import Body
    conn = get_conn()
    row = conn.execute("SELECT * FROM topics_config WHERE name = ?", (name,)).fetchone()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="topic not found")
    updated_name = new_name if new_name else name
    updated_kws = json.dumps(keywords, ensure_ascii=False) if keywords is not None else row["keywords"]
    if updated_name != name:
        conn.execute("DELETE FROM topics_config WHERE name = ?", (name,))
        conn.execute(
            "INSERT INTO topics_config (name, keywords, enabled) VALUES (?, ?, ?)",
            (updated_name, updated_kws, row["enabled"]),
        )
    else:
        conn.execute(
            "UPDATE topics_config SET keywords = ? WHERE name = ?",
            (updated_kws, name),
        )
    conn.commit()
    return {"message": f"已更新主题: {updated_name}"}


@router.delete("/topics/{name}")
def delete_topic(name: str):
    conn = get_conn()
    conn.execute("DELETE FROM topics_config WHERE name = ?", (name,))
    conn.commit()
    return {"message": f"已删除主题: {name}"}


@router.patch("/topics/{name}/toggle")
def toggle_topic(name: str):
    """切换主题的启用/禁用状态"""
    conn = get_conn()
    row = conn.execute("SELECT enabled FROM topics_config WHERE name = ?", (name,)).fetchone()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="topic not found")
    conn.execute("UPDATE topics_config SET enabled = NOT enabled WHERE name = ?", (name,))
    conn.commit()
    updated = conn.execute("SELECT enabled FROM topics_config WHERE name = ?", (name,)).fetchone()
    return {"enabled": bool(updated["enabled"])}


@router.get("/export-md")
def export_papers_md(week_offset: int = Query(None)):
    """
    导出论文列表为 Markdown 文件，按主题分类。
    可选 week_offset 参数：仅导出指定周的论文（0=本周，-1=上周...），
    不传则导出全部论文。
    """
    from datetime import datetime, timedelta
    conn = get_conn()

    if week_offset is not None:
        target = datetime.now() + timedelta(weeks=week_offset)
        iso = target.isocalendar()
        week_start = datetime.fromisocalendar(iso[0], iso[1], 1)
        week_end = week_start + timedelta(days=7)
        rows = conn.execute(
            "SELECT title, url, topic, created_at FROM papers WHERE created_at BETWEEN ? AND ? ORDER BY topic, created_at DESC",
            (week_start.isoformat(), week_end.isoformat()),
        ).fetchall()
        week_label = f"{iso[0]}-W{iso[1]:02d}"
        title_line = f"# ResearchRadar 论文导出 ({week_label})\n"
    else:
        rows = conn.execute(
            "SELECT title, url, topic, created_at FROM papers ORDER BY topic, created_at DESC"
        ).fetchall()
        title_line = f"# ResearchRadar 论文导出\n"

    from collections import defaultdict
    groups: dict[str, list] = defaultdict(list)
    for r in rows:
        groups[r["topic"]].append(r)

    lines = [title_line, f"> 导出时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}  共 {len(rows)} 篇\n"]
    for topic in sorted(groups.keys()):
        ps = groups[topic]
        lines.append(f"\n## {topic}（{len(ps)} 篇）\n")
        for p in ps:
            lines.append(f"- [{p['title']}]({p['url']})")

    content = "\n".join(lines)
    filename = f"research-radar-papers.md"
    return Response(
        content,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
