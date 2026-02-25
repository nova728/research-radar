"""
ResearchRadar — 主入口
支持两种启动方式：
  1. python -m app.main          （开发 / 技术用户）
  2. PyInstaller 打包后双击运行   （普通用户）
"""
import sys
import os
import threading
import webbrowser
import time
import argparse
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.api import papers, trends, clusters, chat
from app.db.database import init_db
from app.agent.scheduler import start_scheduler

# ── 判断是否是打包模式 ──────────────────────────────────────────
def get_base_dir() -> Path:
    """PyInstaller 打包后 sys._MEIPASS 是临时解压目录"""
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)
    return Path(__file__).parent.parent.parent

BASE_DIR = get_base_dir()
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
DATA_DIR = Path.home() / ".research-radar"  # 用户数据目录，打包后也持久化
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ── FastAPI App ─────────────────────────────────────────────────
app = FastAPI(title="ResearchRadar", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发时宽松，打包后都是 localhost 无所谓
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册 API 路由
app.include_router(papers.router,   prefix="/api/papers",   tags=["papers"])
app.include_router(trends.router,   prefix="/api/trends",   tags=["trends"])
app.include_router(clusters.router, prefix="/api/clusters", tags=["clusters"])
app.include_router(chat.router,     prefix="/api/chat",     tags=["chat"])

# ── 静态前端（React build 产物）──────────────────────────────────
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/")
    async def serve_frontend():
        return FileResponse(str(FRONTEND_DIST / "index.html"))

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        """SPA fallback：所有非 /api 路径都返回 index.html"""
        if full_path.startswith("api/"):
            return {"error": "not found"}
        return FileResponse(str(FRONTEND_DIST / "index.html"))
else:
    @app.get("/")
    async def no_frontend():
        return {"message": "Frontend not built. Run: cd frontend && npm run build"}


@app.on_event("startup")
async def startup():
    init_db(DATA_DIR)
    start_scheduler(DATA_DIR)


# ── 启动函数（打包模式专用）────────────────────────────────────
def open_browser(port: int):
    """延迟 1.5 秒后自动打开浏览器"""
    time.sleep(1.5)
    webbrowser.open(f"http://localhost:{port}")


def run(port: int = 8765, open_browser_flag: bool = True, dev: bool = False):
    """
    统一启动入口
    - open_browser_flag=True  → 打包模式，自动弹浏览器
    - dev=True                → 开发模式，开启 reload
    """
    if open_browser_flag:
        threading.Thread(target=open_browser, args=(port,), daemon=True).start()

    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=port,
        reload=dev,
        log_level="warning",  # 打包模式静默，不刷屏
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ResearchRadar")
    parser.add_argument("--port",    type=int,  default=8765)
    parser.add_argument("--dev",     action="store_true", help="开发模式（热重载）")
    parser.add_argument("--no-browser", action="store_true", help="不自动打开浏览器")
    args = parser.parse_args()

    run(port=args.port, open_browser_flag=not args.no_browser, dev=args.dev)
