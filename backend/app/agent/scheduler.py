"""
定时任务调度器
- 每天早上 8:00 自动抓取新论文
- 启动时如果今天还没抓过，立即抓一次
"""
from pathlib import Path
from datetime import datetime


def start_scheduler(data_dir: Path):
    """启动定时任务，非阻塞"""
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger

        scheduler = BackgroundScheduler()
        scheduler.add_job(
            _crawl_job,
            trigger=CronTrigger(hour=8, minute=0),
            id="daily_crawl",
            replace_existing=True,
        )
        scheduler.start()
        print("[Scheduler] 定时抓取已启动（每天 08:00）")

        # 检查今天是否已经抓过
        _maybe_crawl_now(data_dir)

    except ImportError:
        print("[Scheduler] apscheduler 未安装，跳过定时任务。可手动调用 /api/papers/crawl")


def _crawl_job():
    from app.agent.crawler import crawl_all
    print(f"[Scheduler] 开始定时抓取 {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    results = crawl_all()
    total = sum(v for v in results.values() if v > 0)
    print(f"[Scheduler] 抓取完成，共新增 {total} 篇")


def _maybe_crawl_now(data_dir: Path):
    """如果数据库是空的，立即触发一次抓取"""
    from app.db.database import get_conn
    try:
        count = get_conn().execute("SELECT COUNT(*) as n FROM papers").fetchone()["n"]
        if count == 0:
            print("[Scheduler] 数据库为空，立即触发首次抓取...")
            import threading
            threading.Thread(target=_crawl_job, daemon=True).start()
    except Exception as e:
        print(f"[Scheduler] 检查数据库失败: {e}")
