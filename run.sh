#!/bin/bash
# ═══════════════════════════════════════════════
# ResearchRadar — 技术用户一键启动脚本
# 使用方式：bash run.sh
# ═══════════════════════════════════════════════
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "🔭  ResearchRadar"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 检查 Python ────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "❌ 未找到 Python3，请先安装 Python 3.10+"
  exit 1
fi

PYTHON_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "✓  Python $PYTHON_VER"

# ── 虚拟环境 ──────────────────────────────────
VENV_DIR="$SCRIPT_DIR/.venv"
if [ ! -d "$VENV_DIR" ]; then
  echo "→  创建虚拟环境..."
  python3 -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"

# ── 安装后端依赖 ───────────────────────────────
echo "→  安装依赖（首次约需 1 分钟）..."
pip install -q -r backend/requirements.txt

# ── 构建前端（如果 node_modules 不存在或 dist 不存在）──
if [ ! -d "frontend/dist" ]; then
  if command -v npm &>/dev/null; then
    echo "→  构建前端..."
    cd frontend
    npm install --silent
    npm run build --silent
    cd ..
    echo "✓  前端构建完成"
  else
    echo "⚠️  未找到 npm，将使用纯 API 模式（无前端界面）"
  fi
fi

# ── 启动 ──────────────────────────────────────
echo "✓  启动服务 → http://localhost:8765"
echo "   按 Ctrl+C 停止"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd backend
python -m app.main "$@"
