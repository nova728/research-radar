export type Lang = "zh" | "en"

export interface I18n {
  appSubtitle: string
  dataLocal: string
  nav: { dashboard: string; topics: string; chat: string; settings: string }

  dashboardTitle: string
  dashboardSub: (weeks: number) => string
  crawlBtn: string
  crawling: string
  aiInsightLabel: string
  chartLabel: string
  weeklyCount: string
  vsLastWeek: string
  loading: string
  analyzing: string
  noData: string
  noDataDesc: string
  startCrawl: string
  accumulating: string

  topicsTitle: string
  topicsSub: string
  thisWeek: string
  weeksAgo: (n: number) => string
  step1Title: string; step1Desc: string
  step2Title: string; step2Desc: string
  step3Title: string; step3Desc: string
  noCluster: string; noClusterSub: string
  paperCount: (n: number) => string
  commonProblem: string; methodComparison: string; openQuestions: string
  noLLM: string
  collapseList: string
  expandList: (n: number) => string
  topic: (n: number) => string
  analyzeBtn: string
  analysisReady: string
  exportMd: (label: string) => string
  exportMdWeek: string
  exportDigest: (label: string) => string

  chatTitle: string; chatSub: string
  llmWarning: string; llmWarning2: string
  chatWelcome: string
  chatPlaceholder: string
  send: string
  requestFailed: string

  settingsTitle: string
  llmStatusTitle: string
  connStatus: string; connected: string; notConfigured: string
  provider: string; model: string
  configFileLabel: string
  supports: string; supportsDetail: string
  restartNote: string
  dataStorageTitle: string
  dataDesc: string; dbDesc: string; configDesc: string; uninstallNote: string
  topicsTitle2: string
  enabled: string; disabled: string
  addTopicLabel: string
  topicNamePlaceholder: string; keywordsPlaceholder: string
  addBtn: string
  loadingText: string

  dashboardWeeks: (n: number) => string

  editTopic: string
  deleteTopic: string
  enableTopic: string
  disableTopic: string
  confirmDelete: string
  saveEdit: string
  cancelEdit: string
  crawlAfterAdd: string
}

export const translations: Record<Lang, I18n> = {
  zh: {
    appSubtitle: "领域动态感知",
    dataLocal: "数据存储于本地",
    nav: { dashboard: "趋势总览", topics: "议题地图", chat: "对话查询", settings: "设置" },

    dashboardTitle: "趋势总览",
    dashboardSub: (weeks) => `过去 ${weeks} 周各研究方向热度变化`,
    crawlBtn: "立即抓取",
    crawling: "抓取中…",
    aiInsightLabel: "AI 趋势解读",
    chartLabel: "周度热度折线图",
    weeklyCount: "本周各方向论文数",
    vsLastWeek: "较上周",
    loading: "加载中…",
    analyzing: "分析中…",
    noData: "暂无数据",
    noDataDesc: "点击下方按钮抓取最新 ArXiv 论文\n首次抓取约需 1–2 分钟",
    startCrawl: "开始抓取",
    accumulating: "数据积累中，请等待更多周数的数据。",

    topicsTitle: "议题地图",
    topicsSub: "论文自动聚类，每张卡片代表一个研究议题",
    thisWeek: "本周",
    weeksAgo: (n) => `${n}周前`,
    step1Title: "前置：先抓取论文",
    step1Desc: "前往「趋势总览」→「立即抓取」，获取本周 ArXiv 论文",
    step2Title: "自动聚类分析",
    step2Desc: "系统对同主题论文自动聚类，需配置 LLM 才能生成议题解读",
    step3Title: "展开查看论文",
    step3Desc: "点击卡片底部「查看 N 篇论文」可展开，点击标题直接跳转 ArXiv",
    noCluster: "本周暂无足够论文进行聚类分析",
    noClusterSub: "请先抓取论文或切换查看其他周",
    paperCount: (n) => `${n} 篇`,
    commonProblem: "共同问题",
    methodComparison: "方法对比",
    openQuestions: "开放问题",
    noLLM: "LLM 未配置，无法生成分析内容",
    collapseList: "收起论文列表",
    expandList: (n) => `查看 ${n} 篇论文`,
    topic: (n) => `议题 ${n}`,
    analyzeBtn: "生成 AI 分析",
    analysisReady: "AI 分析已生成",
    exportMd: (label) => `导出 ${label} MD`,
    exportMdWeek: "导出本周 MD",
    exportDigest: (label) => `导出 ${label} 精选报告`,

    chatTitle: "对话查询",
    chatSub: "基于本地论文库，RAG 智能回答研究问题",
    llmWarning: "LLM 未配置，对话将使用降级模式。请编辑",
    llmWarning2: "配置 Ollama 或 API Key。",
    chatWelcome: "你好！我可以根据已抓取的论文回答你的问题。试试问我：\n\n• 最近 LoRA 微调有什么新进展？\n• Agent 方向最近在研究什么问题？\n• RAG 和 fine-tuning 各自的优劣是什么？",
    chatPlaceholder: "问任何关于你追踪的研究方向的问题…",
    send: "发送",
    requestFailed: "请求失败，请检查后端服务。",

    settingsTitle: "设置",
    llmStatusTitle: "LLM 配置状态",
    connStatus: "连接状态",
    connected: "已连接",
    notConfigured: "未配置",
    provider: "Provider",
    model: "模型",
    configFileLabel: "配置文件：",
    supports: "支持：",
    supportsDetail: "Ollama（本地免费）/ OpenAI / DeepSeek",
    restartNote: "修改后重启应用生效。",
    dataStorageTitle: "数据存储",
    dataDesc: "所有数据完全存储在本地：",
    dbDesc: " — SQLite 数据库（论文、趋势、配置）",
    configDesc: " — LLM 配置",
    uninstallNote: "卸载时删除该目录即可完全清除数据。",
    topicsTitle2: "追踪主题",
    enabled: "启用",
    disabled: "禁用",
    addTopicLabel: "添加新主题",
    topicNamePlaceholder: "主题名称，如：Diffusion Models",
    keywordsPlaceholder: "关键词（逗号分隔），如：diffusion model, DDPM",
    addBtn: "添加",
    loadingText: "加载中…",

    dashboardWeeks: (n) => `${n}周`,

    editTopic: "编辑",
    deleteTopic: "删除",
    enableTopic: "点击启用",
    disableTopic: "点击禁用",
    confirmDelete: "确认删除",
    saveEdit: "保存",
    cancelEdit: "取消",
    crawlAfterAdd: "添加后请前往「趋势总览」点击「立即抓取」获取该主题论文",
  },

  en: {
    appSubtitle: "Research Field Monitor",
    dataLocal: "Data stored locally",
    nav: { dashboard: "Trends", topics: "Topic Map", chat: "Chat", settings: "Settings" },

    dashboardTitle: "Trend Overview",
    dashboardSub: (weeks) => `Publication volume by direction over the past ${weeks} weeks`,
    crawlBtn: "Fetch Now",
    crawling: "Fetching…",
    aiInsightLabel: "AI Trend Analysis",
    chartLabel: "Weekly Volume Chart",
    weeklyCount: "This Week by Direction",
    vsLastWeek: "vs last week",
    loading: "Loading…",
    analyzing: "Analyzing…",
    noData: "No Data Yet",
    noDataDesc: "Click below to fetch the latest ArXiv papers.\nFirst fetch takes ~1–2 minutes.",
    startCrawl: "Start Fetching",
    accumulating: "Data is accumulating — check back after a few more weeks.",

    topicsTitle: "Topic Map",
    topicsSub: "Papers auto-clustered into research topics",
    thisWeek: "This Week",
    weeksAgo: (n) => `${n}w ago`,
    step1Title: "Step 1: Fetch Papers First",
    step1Desc: "Go to Trends → Fetch Now to get this week's ArXiv papers",
    step2Title: "Step 2: Auto-Cluster Analysis",
    step2Desc: "Papers are clustered by topic. LLM required for insight generation",
    step3Title: "Step 3: Expand to Read",
    step3Desc: "Click \"View N papers\" at the bottom of each card; click a title to open ArXiv",
    noCluster: "Not enough papers this week to cluster",
    noClusterSub: "Please fetch papers first or switch to another week",
    paperCount: (n) => `${n} papers`,
    commonProblem: "Common Problem",
    methodComparison: "Method Comparison",
    openQuestions: "Open Questions",
    noLLM: "LLM not configured — analysis unavailable",
    collapseList: "Collapse paper list",
    expandList: (n) => `View ${n} papers`,
    topic: (n) => `Topic ${n}`,
    analyzeBtn: "Generate AI Analysis",
    analysisReady: "AI analysis ready",
    exportMd: (label) => `Export ${label} MD`,
    exportMdWeek: "Export This Week MD",
    exportDigest: (label) => `Export ${label} Digest`,

    chatTitle: "Chat Query",
    chatSub: "RAG-powered Q&A over your local paper library",
    llmWarning: "LLM not configured. Chat will run in fallback mode. Edit",
    llmWarning2: "to add Ollama or an API key.",
    chatWelcome: "Hi! I can answer questions based on the papers you've fetched. Try asking:\n\n• Any recent advances in LoRA fine-tuning?\n• What problems is the Agent field tackling?\n• What are the trade-offs between RAG and fine-tuning?",
    chatPlaceholder: "Ask anything about the research directions you're tracking…",
    send: "Send",
    requestFailed: "Request failed. Please check the backend service.",

    settingsTitle: "Settings",
    llmStatusTitle: "LLM Configuration",
    connStatus: "Status",
    connected: "Connected",
    notConfigured: "Not Configured",
    provider: "Provider",
    model: "Model",
    configFileLabel: "Config file: ",
    supports: "Supports: ",
    supportsDetail: "Ollama (local, free) / OpenAI / DeepSeek",
    restartNote: "Restart the app after editing.",
    dataStorageTitle: "Data Storage",
    dataDesc: "All data is stored locally at: ",
    dbDesc: " — SQLite database (papers, trends, config)",
    configDesc: " — LLM configuration",
    uninstallNote: "Delete this directory to fully remove all data.",
    topicsTitle2: "Tracked Topics",
    enabled: "Enabled",
    disabled: "Disabled",
    addTopicLabel: "Add New Topic",
    topicNamePlaceholder: "Topic name, e.g. Diffusion Models",
    keywordsPlaceholder: "Keywords (comma-separated), e.g. diffusion model, DDPM",
    addBtn: "Add",
    loadingText: "Loading…",

    dashboardWeeks: (n) => `${n}W`,

    editTopic: "Edit",
    deleteTopic: "Delete",
    enableTopic: "Click to enable",
    disableTopic: "Click to disable",
    confirmDelete: "Confirm",
    saveEdit: "Save",
    cancelEdit: "Cancel",
    crawlAfterAdd: "After adding, go to Trends → Fetch Now to get papers for this topic",
  },
}
