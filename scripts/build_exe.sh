#!/bin/bash
# ═══════════════════════════════════════════════
# ResearchRadar — 打包脚本
# 产物：dist/ResearchRadar（单文件可执行，双击运行）
# 使用方式：bash scripts/build_exe.sh
# ═══════════════════════════════════════════════
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "🔧  开始打包 ResearchRadar..."

# ── Step 1：构建前端 ────────────────────────────
echo "→  构建前端..."
cd frontend
npm install --silent
npm run build --silent
cd ..
echo "✓  前端构建完成（dist/）"

# ── Step 2：安装打包依赖 ─────────────────────────
cd backend
pip install -q pyinstaller
pip install -q -r requirements.txt

# ── Step 3：PyInstaller 打包 ─────────────────────
echo "→  打包中（约需 2-3 分钟）..."

pyinstaller \
  --onefile \
  --name "ResearchRadar" \
  --add-data "../frontend/dist:frontend/dist" \
  --add-data "app:app" \
  --hidden-import "uvicorn.lifespan.on" \
  --hidden-import "uvicorn.lifespan.off" \
  --hidden-import "uvicorn.protocols.http.auto" \
  --hidden-import "uvicorn.protocols.websockets.auto" \
  --hidden-import "uvicorn.logging" \
  --hidden-import "fastapi" \
  --hidden-import "apscheduler" \
  --hidden-import "arxiv" \
  --hidden-import "sklearn" \
  --clean \
  app/main.py

echo ""
echo "✅  打包完成！"
echo "   可执行文件：backend/dist/ResearchRadar"
echo ""
echo "分发给用户时，直接给他们 ResearchRadar 文件即可。"
echo "双击运行后会自动在浏览器打开 http://localhost:8765"
