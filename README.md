# 🔭 ResearchRadar

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![Python](https://img.shields.io/badge/Python-3.10+-green.svg)](https://python.org) [![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev) [![ArXiv](https://img.shields.io/badge/Data-ArXiv-b31b1b.svg)](https://arxiv.org)

[English README](README_EN.md)

</div>

> 大多数 ArXiv 工具给你一份**列表**，ResearchRadar 给你一张**地图**。

不是「今天出了哪些论文」，而是「**这个领域正在发生什么**」。

---

## ✦ 核心功能

| 功能 | 说明 |
|------|------|
| 📊 **趋势检测** | 多周折线图，直观看出哪些方向在升温、哪些在降温，LLM 自动解读 |
| 🗂 **议题地图** | 同一议题论文自动聚类，LLM 横向分析方法异同与开放问题 |
| 💬 **对话查询** | 问「最近 XXX 方向有什么进展」，基于本地论文库 RAG 回答 |
| 📋 **精选报告** | 多维评分筛选本周亮点论文，逐篇生成深度解读，一键导出 Markdown |
| 🌐 **中英双语** | 界面与 AI 分析均支持一键切换语言 |

**🔒 所有数据完全本地存储，不上传任何内容。**

---

## 📸 界面预览

<table>
  <tr>
    <td align="center"><b>📊 趋势总览</b></td>
    <td align="center"><b>🗂 议题地图</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/dashboard-zh.png" alt="趋势总览" width="420"/></td>
    <td><img src="docs/screenshots/topics-zh.png" alt="议题地图" width="420"/></td>
  </tr>
  <tr>
    <td align="center"><b>💬 对话查询</b></td>
    <td align="center"><b>⚙️ 主题配置</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/chat-zh.png" alt="对话查询" width="420"/></td>
    <td><img src="docs/screenshots/settings-zh.png" alt="设置" width="420"/></td>
  </tr>
</table>

---

## 🚀 快速开始（3 行命令）

```bash
git clone https://github.com/nova728/research-radar
cd research-radar
bash run.sh
```

浏览器自动打开 → **http://localhost:8765**

> **需要环境：** Python 3.10+，Node.js 18+（前端构建，仅首次约需 1 分钟）

`run.sh` 会自动完成：创建虚拟环境 → 安装依赖 → 构建前端 → 启动服务，**无需任何手动配置**。

---

## ⚙️ LLM 配置（可选但推荐）

不配置 LLM 也可使用（趋势图、论文列表正常工作），但**议题分析和对话查询**需要 LLM。

**第一步：** 运行一次 `bash run.sh` 后，配置文件会自动生成在：

```
~/.research-radar/config.json
```

**第二步：** 用任意文本编辑器打开该文件，按需填写以下配置之一，保存后**重启应用**生效。

> 注意：`llm_provider` 字段决定使用哪个方案，必须与下方对应修改。

<details>
<summary><b>方案 A：Ollama 本地模型（完全免费，需先安装 Ollama）</b></summary>

[下载 Ollama](https://ollama.com) 并运行 `ollama pull qwen2.5:7b`，然后配置：

```json
{
  "llm_provider": "ollama",
  "ollama_model": "qwen2.5:7b",
  "ollama_base_url": "http://localhost:11434",
  "openai_api_key": "",
  "openai_model": "gpt-4o-mini",
  "deepseek_api_key": "",
  "deepseek_model": "deepseek-chat"
}
```
</details>

<details>
<summary><b>方案 B：DeepSeek API（推荐，约 ¥0.001/次）</b></summary>

在 [platform.deepseek.com](https://platform.deepseek.com) 注册并获取 API Key，然后配置：

```json
{
  "llm_provider": "deepseek",
  "ollama_model": "qwen2.5:7b",
  "ollama_base_url": "http://localhost:11434",
  "openai_api_key": "",
  "openai_model": "gpt-4o-mini",
  "deepseek_api_key": "sk-你的key",
  "deepseek_model": "deepseek-chat"
}
```
</details>

<details>
<summary><b>方案 C：OpenAI</b></summary>

在 [platform.openai.com](https://platform.openai.com) 获取 API Key，然后配置：

```json
{
  "llm_provider": "openai",
  "ollama_model": "qwen2.5:7b",
  "ollama_base_url": "http://localhost:11434",
  "openai_api_key": "sk-你的key",
  "openai_model": "gpt-4o-mini",
  "deepseek_api_key": "",
  "deepseek_model": "deepseek-chat"
}
```
</details>

配置完成后在 **Settings** 页面可以查看连接状态是否为 ✅ 已连接。

---

## 🗂 追踪主题配置

在 **Settings → 追踪主题** 中添加你关注的研究方向，例如：

| 主题名 | 关键词示例 |
|--------|-----------|
| LLM Evaluation | LLM evaluation, benchmark, leaderboard |
| AI Agent | AI agent, tool use, function calling |
| RAG | retrieval augmented generation, RAG |

添加后点击「立即抓取」即可获取对应方向的最新论文。

---

## 📋 精选报告示例

在**议题地图**页面选择目标周，点击绿色「导出 精选报告」按钮，即可获得如下结构的 Markdown 文档：

```
# 📋 2026-W08 研究精选
> 筛选规则：标题新颖度 + 摘要实证强度 + 合作规模 + 时效性，每方向取 Top 5

## 🔬 Efficient LLM（Top 5 / 共 38 篇）

### 1. 🌟 EfficientKV: Unified Key-Value Cache Compression...
**作者:** Zhang Wei, Li Ming et al.　　**日期:** 2026-02-21　　**评分:** 82/100　　[ArXiv](...)

**💡 核心方法：** 提出统一的 KV Cache 压缩框架，通过...
**📊 对比基线：** 在 LongBench 上相比 H2O、SnapKV 提升...
**✨ 借鉴意义：** 为长文本推理场景提供了即插即用的加速方案...
```

> 导出的 `.md` 文件可直接导入 **Obsidian、Notion、Typora** 等笔记工具。

`docs/examples/` 目录中存放了真实生成的样例文件供参考：

| 文件 | 说明 |
|------|------|
| [`docs/examples/digest-sample-zh.md`](docs/examples/digest-sample-zh.md) | 中文精选报告真实样例（2026-W09，含评分与 LLM 解读） |
| [`docs/examples/export-papers-sample.md`](docs/examples/export-papers-sample.md) | 论文列表导出样例（2026-W09，469 篇，按主题分组） |

---

## 📁 项目结构

```
research-radar/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI 入口
│   │   ├── api/                    # REST 接口
│   │   └── agent/
│   │       ├── crawler.py          # ArXiv 抓取
│   │       ├── trend_analyzer.py   # ★ 趋势检测
│   │       ├── cluster_analyzer.py # ★ 议题聚类
│   │       ├── daily_digest.py     # ★ 精选报告生成（多维评分 + LLM 解读）
│   │       ├── rag_chat.py         # ★ 对话查询 RAG
│   │       ├── llm.py              # LLM 统一封装（Ollama/OpenAI/DeepSeek）
│   │       └── scheduler.py        # 定时任务
│   └── requirements.txt
├── frontend/                       # React 18 + TypeScript + Recharts
├── docs/
│   ├── screenshots/                # 界面截图
│   └── examples/                   # 精选报告生成样例（.md）
├── run.sh                          # 一键启动
├── README.md                       # 中文文档（默认）
└── README_EN.md                    # English documentation
```

---

## 🛠 开发模式

```bash
# 后端
cd backend && pip install -r requirements.txt
python -m app.main --dev --no-browser   # http://localhost:8765

# 前端（另一个终端）
cd frontend && npm install && npm run dev  # http://localhost:5173
```

---

## License

[MIT](LICENSE)
