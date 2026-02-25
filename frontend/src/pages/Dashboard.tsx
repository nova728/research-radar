import { useEffect, useState } from "react"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from "recharts"
import {
  IconRefresh, IconRobot, IconLoader, IconTrendChart,
  IconArrowUp, IconArrowDown,
} from "../components/Icons"
import { useLang } from "../LangContext"

const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16"]

export default function Dashboard() {
  const { t, lang } = useLang()
  const [trend, setTrend]     = useState<any>(null)
  const [insight, setInsight] = useState("")
  const [loading, setLoading] = useState(true)
  const [crawling, setCrawling] = useState(false)
  const [weeks, setWeeks]     = useState(3)

  useEffect(() => { fetchTrend(false) }, [weeks])

  // 语言切换时强制刷新 insight（用新语言重新生成）
  useEffect(() => {
    if (trend) fetchTrend(true)
  }, [lang])

  async function fetchTrend(refresh = false) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ lang, weeks: String(weeks) })
      if (refresh) params.set("refresh", "true")
      const res = await fetch(`/api/trends/insight?${params}`)
      const data = await res.json()
      setTrend(data.trend)
      setInsight(data.insight)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function triggerCrawl() {
    setCrawling(true)
    await fetch("/api/papers/crawl", { method: "POST" })
    // 等待抓取完成后，带 refresh=true 重新生成 insight
    setTimeout(() => { setCrawling(false); fetchTrend(true) }, 5000)
  }

  const chartData = trend?.weeks?.map((w: string, i: number) => {
    // 将 "2026-W09" 转成 "02/23" (周一日期)
    let label = w.replace(/\d{4}-/, "")
    try {
      const [year, week] = w.split("-W").map(Number)
      const d = new Date(Date.UTC(year, 0, 4)) // ISO week 1 保证
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + (week - 1) * 7)
      label = `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCDate()).padStart(2, "0")}`
    } catch {}
    const entry: any = { week: label }
    Object.entries(trend.series || {}).forEach(([key, vals]: any) => {
      entry[key] = vals[i] || 0
    })
    return entry
  }) || []

  const seriesKeys = Object.keys(trend?.series || {})

  return (
    <div>
      {/* 页头 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#0c2147", letterSpacing: "-0.5px" }}>
            {t.dashboardTitle}
          </h1>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>
            {t.dashboardSub(weeks)}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* 周数选择器 */}
          <div style={{ display: "flex", gap: 4 }}>
            {[3, 6, 12].map(w => (
              <button key={w} onClick={() => setWeeks(w)} style={{
                padding: "6px 14px", border: "1px solid",
                borderColor: weeks === w ? "#1a56db" : "#e2e8f0",
                background: weeks === w ? "linear-gradient(135deg,#1a56db,#3b82f6)" : "#fff",
                color: weeks === w ? "#fff" : "#64748b",
                borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: weeks === w ? 600 : 400,
                transition: "all 0.15s",
              }}>{t.dashboardWeeks(w)}</button>
            ))}
          </div>
          <button
            onClick={triggerCrawl}
            disabled={crawling}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "9px 20px",
              background: crawling ? "#94a3b8" : "linear-gradient(135deg, #1a56db, #3b82f6)",
              color: "#fff", border: "none", borderRadius: 10, cursor: crawling ? "default" : "pointer",
              fontSize: 13, fontWeight: 600, boxShadow: crawling ? "none" : "0 2px 8px rgba(26,86,219,0.3)",
              transition: "all 0.2s",
            }}
          >
            {crawling
              ? <><IconLoader size={15} color="#fff" /> {t.crawling}</>
              : <><IconRefresh size={15} color="#fff" /> {t.crawlBtn}</>
            }
          </button>
        </div>
      </div>

      {/* AI 趋势解读 */}
      {insight && (
        <div style={{
          background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
          border: "1px solid #bfdbfe", borderRadius: 14,
          padding: "16px 20px", marginBottom: 24,
          display: "flex", gap: 14, alignItems: "flex-start",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: "linear-gradient(135deg, #1a56db, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IconRobot size={17} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>
              {t.aiInsightLabel}
            </div>
            <p style={{ margin: 0, color: "#334155", fontSize: 14, lineHeight: 1.75 }}>
              {insight === "__ACCUMULATING__" ? t.accumulating : insight}
            </p>
          </div>
        </div>
      )}

      {/* 趋势折线图 */}
      {loading ? (
        <LoadingState />
      ) : chartData.length === 0 ? (
        <EmptyState onCrawl={triggerCrawl} crawling={crawling} />
      ) : (
        <div style={{
          background: "#fff", borderRadius: 16, padding: "24px 24px 16px",
          boxShadow: "0 1px 6px rgba(0,0,0,0.07)", border: "1px solid #f1f5f9",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
            <IconTrendChart size={14} color="#3b82f6" />
            {t.chartLabel}
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 10, fontSize: 13,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
              {seriesKeys.map((key, i) => (
                <Line
                  key={key} type="monotone" dataKey={key}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 本周各方向小卡片 */}
      {seriesKeys.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", margin: "24px 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
            {t.weeklyCount}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {seriesKeys.slice(0, 8).map((key, i) => {
              const vals = trend.series[key] as number[]
              const last = vals[vals.length - 1] || 0
              const prev = vals[vals.length - 2] || 0
              const delta = last - prev
              const up = delta >= 0
              return (
                <div key={key} style={{
                  background: "#fff", borderRadius: 12, padding: "14px 16px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9",
                  borderTop: `3px solid ${COLORS[i % COLORS.length]}`,
                }}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, fontWeight: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{key}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#0c2147", lineHeight: 1 }}>{last}</div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    fontSize: 12, color: up ? "#059669" : "#dc2626", marginTop: 8,
                  }}>
                    {up ? <IconArrowUp size={12} color="#059669" /> : <IconArrowDown size={12} color="#dc2626" />}
                    {Math.abs(delta)} {t.vsLastWeek}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function LoadingState() {
  const { t } = useLang()
  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "80px 40px",
      textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      border: "1px solid #f1f5f9",
    }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <IconLoader size={32} color="#3b82f6" />
      </div>
      <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>{t.loading}</p>
    </div>
  )
}

function EmptyState({ onCrawl, crawling }: { onCrawl: () => void; crawling: boolean }) {
  const { t } = useLang()
  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "64px 40px",
      textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
      border: "1px solid #f1f5f9",
    }}>
      <div style={{ display: "inline-flex", marginBottom: 24 }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "radial-gradient(circle, #eff6ff 0%, #dbeafe 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="2" fill="#3b82f6" />
            <path d="M12 2a10 10 0 0 1 10 10" />
            <path d="M12 6a6 6 0 0 1 6 6" />
            <path d="M12 10a2 2 0 0 1 2 2" />
            <line x1="12" y1="12" x2="19.5" y2="4.5" strokeDasharray="2 2" />
          </svg>
        </div>
      </div>
      <h3 style={{ color: "#0c2147", margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>{t.noData}</h3>
      <p style={{ color: "#64748b", marginBottom: 28, fontSize: 14, lineHeight: 1.7 }}>
        {t.noDataDesc.split("\n").map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
      </p>
      <button
        onClick={onCrawl}
        disabled={crawling}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "11px 30px",
          background: crawling ? "#94a3b8" : "linear-gradient(135deg, #1a56db, #3b82f6)",
          color: "#fff", border: "none", borderRadius: 10,
          fontSize: 14, cursor: crawling ? "default" : "pointer",
          fontWeight: 600, boxShadow: crawling ? "none" : "0 2px 10px rgba(26,86,219,0.35)",
        }}
      >
        {crawling ? <><IconLoader size={16} color="#fff" /> {t.crawling}</> : <><IconRefresh size={16} color="#fff" /> {t.startCrawl}</>}
      </button>
    </div>
  )
}
