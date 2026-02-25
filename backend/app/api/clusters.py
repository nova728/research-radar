"""clusters.py — 聚类分析 API"""
from fastapi import APIRouter, Query, HTTPException
from app.agent.cluster_analyzer import get_weekly_clusters, analyze_single_cluster

router = APIRouter()


@router.get("")
def weekly_clusters(week_offset: int = Query(0, ge=-52, le=0)):
    """获取聚类分组（不调 LLM，秒返回）"""
    clusters = get_weekly_clusters(week_offset)
    return {"clusters": clusters, "count": len(clusters)}


@router.post("/analyze")
def analyze_cluster(
    week_offset: int = Query(0, ge=-52, le=0),
    cluster_id: int = Query(...),
    lang: str = Query("zh"),
):
    """对单个簇按需触发 LLM 分析，结果写入缓存"""
    analysis = analyze_single_cluster(week_offset, cluster_id, lang=lang)
    if analysis is None:
        raise HTTPException(status_code=404, detail="cluster not found")
    return {"analysis": analysis}
