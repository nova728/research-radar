import { useEffect, useState } from "react"
import { IconMap, IconChevronUp, IconChevronDown, IconExternalLink, IconLoader, IconDownload } from "../components/Icons"
import { useLang } from "../LangContext"

export default function Topics() {
  const { t } = useLang()
  const [clusters, setClusters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { fetchClusters() }, [weekOffset])

  async function fetchClusters() {
    setLoading(true)
    try {
      const res = await fetch(`/api/clusters?week_offset=${weekOffset}`)
      const data = await res.json()
      setClusters(data.clusters || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function downloadMd() {
    setExporting(true)
    try {
      const res = await fetch(`/api/papers/export-md?week_offset=${weekOffset}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `research-radar-papers.md`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { console.error(e) }
    setExporting(false)
  }

  function handleAnalysisDone(cluster_id: number, analysis: any) {
    setClusters(prev => prev.map(c =>
      c.cluster_id === cluster_id ? { ...c, analysis } : c
    ))
  }

  const weekOffsets = [0, -1, -2, -3, -4, -6, -8, -12] as const
  type WeekOffset = typeof weekOffsets[number]

  const weekLabel = (w: number) => w === 0 ? t.thisWeek : t.weeksAgo(-w)

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#0c2147", letterSpacing: "-0.5px" }}>
            {t.topicsTitle}
          </h1>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>{t.topicsSub}</p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {weekOffsets.map(w => (
            <button key={w} onClick={() => setWeekOffset(w)} style={{
              padding: "6px 12px", border: "1px solid",
              borderColor: weekOffset === w ? "#1a56db" : "#e2e8f0",
              background: weekOffset === w ? "linear-gradient(135deg,#1a56db,#3b82f6)" : "#fff",
              color: weekOffset === w ? "#fff" : "#64748b",
              borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: weekOffset === w ? 600 : 400,
              transition: "all 0.15s",
            }}>{weekLabel(w)}</button>
          ))}
          <button
            onClick={downloadMd}
            disabled={exporting || clusters.length === 0}
            title={t.exportMd(weekLabel(weekOffset))}
            style={{
              padding: "6px 12px", border: "1px solid #e2e8f0",
              background: "#fff", color: "#475569",
              borderRadius: 8, cursor: clusters.length === 0 ? "not-allowed" : "pointer",
              fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5,
              opacity: clusters.length === 0 ? 0.5 : 1, transition: "all 0.15s",
              marginLeft: 2,
            }}
          >
            <IconDownload size={14} color="#475569" />
            {exporting ? "…" : t.exportMd(weekLabel(weekOffset))}
          </button>
        </div>
      </div>

      {/* 功能说明横幅 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
        {[
          { step: "1", color: "#3b82f6", bg: "#eff6ff", title: t.step1Title, desc: t.step1Desc },
          { step: "2", color: "#10b981", bg: "#f0fdf4", title: t.step2Title, desc: t.step2Desc },
          { step: "3", color: "#8b5cf6", bg: "#faf5ff", title: t.step3Title, desc: t.step3Desc },
        ].map(item => (
          <div key={item.step} style={{
            background: item.bg, borderRadius: 12, padding: "12px 14px",
            border: `1px solid ${item.color}22`, display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
              background: item.color, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800,
            }}>{item.step}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 3 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: "80px 40px", textAlign: "center", border: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <IconLoader size={32} color="#3b82f6" />
          </div>
          <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>{t.analyzing}</p>
        </div>
      ) : clusters.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: "64px 40px", textAlign: "center", border: "1px solid #f1f5f9" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "radial-gradient(circle, #f0f9ff 0%, #e0f2fe 100%)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
          }}>
            <IconMap size={28} color="#38bdf8" />
          </div>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0, lineHeight: 1.7 }}>
            {t.noCluster}<br />{t.noClusterSub}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
          {clusters.map(cluster => (
            <TopicCard
              key={cluster.cluster_id}
              cluster={cluster}
              weekOffset={weekOffset}
              isExpanded={expanded === cluster.cluster_id}
              onToggle={() => setExpanded(expanded === cluster.cluster_id ? null : cluster.cluster_id)}
              onAnalysisDone={handleAnalysisDone}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const ACCENT_COLORS = [
  "#3b82f6","#10b981","#f59e0b","#ef4444",
  "#8b5cf6","#06b6d4","#ec4899","#84cc16",
]

function TopicCard({ cluster, weekOffset, isExpanded, onToggle, onAnalysisDone }: any) {
  const { t, lang } = useLang()
  const [generating, setGenerating] = useState(false)
  const { analysis, paper_count, papers, cluster_id } = cluster
  const hasAnalysis = analysis &&
    (analysis.common_problem || analysis.method_comparison || analysis.open_questions) &&
    !analysis.common_problem?.includes("未配置") &&
    !analysis.common_problem?.includes("not configured")
  const topicName = analysis?.topic_name || cluster.dominant_topic || t.topic(cluster_id + 1)
  const accent = ACCENT_COLORS[cluster_id % ACCENT_COLORS.length]

  async function generateAnalysis() {
    setGenerating(true)
    try {
      const res = await fetch(
        `/api/clusters/analyze?week_offset=${weekOffset}&cluster_id=${cluster_id}&lang=${lang}`,
        { method: "POST" }
      )
      const data = await res.json()
      if (data.analysis) onAnalysisDone(cluster_id, data.analysis)
    } catch (e) { console.error(e) }
    setGenerating(false)
  }

  return (
    <div style={{
      background: "#fff", borderRadius: 16, overflow: "hidden",
      boxShadow: isExpanded ? "0 4px 20px rgba(0,0,0,0.1)" : "0 1px 6px rgba(0,0,0,0.07)",
      border: `1px solid ${isExpanded ? accent + "44" : "#f1f5f9"}`,
      transition: "all 0.2s",
    }}>
      <div style={{ height: 4, background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />

      <div style={{ padding: "16px 20px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0c2147", flex: 1, lineHeight: 1.4 }}>
            {topicName}
          </h3>
          <span style={{
            background: accent + "18", color: accent, borderRadius: 20,
            padding: "3px 10px", fontSize: 12, fontWeight: 700, marginLeft: 10, whiteSpace: "nowrap",
            border: `1px solid ${accent}33`,
          }}>
            {t.paperCount(paper_count)}
          </span>
        </div>
      </div>

      <div style={{ height: 1, background: "#f8fafc", margin: "0 20px" }} />

      <div style={{ padding: "14px 20px" }}>
        {hasAnalysis ? (
          <>
            {analysis.common_problem && (
              <Section label={t.commonProblem} text={analysis.common_problem} color="#0e7c6b" bg="#f0fdf4" />
            )}
            {analysis.method_comparison && (
              <Section label={t.methodComparison} text={analysis.method_comparison} color="#1a56db" bg="#eff6ff" />
            )}
            {analysis.open_questions && (
              <Section label={t.openQuestions} text={analysis.open_questions} color="#c05621" bg="#fff7ed" />
            )}
          </>
        ) : (
          <button
            onClick={generateAnalysis}
            disabled={generating}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              width: "100%", padding: "10px 0",
              background: generating ? "#f1f5f9" : `${accent}12`,
              border: `1px dashed ${generating ? "#cbd5e1" : accent}`,
              borderRadius: 10, cursor: generating ? "default" : "pointer",
              fontSize: 13, fontWeight: 600,
              color: generating ? "#94a3b8" : accent,
              transition: "all 0.2s",
            }}
          >
            {generating
              ? <><IconLoader size={14} color="#94a3b8" /> {t.analyzing}…</>
              : t.analyzeBtn
            }
          </button>
        )}
      </div>

      <div style={{ padding: "0 20px 16px" }}>
        <button onClick={onToggle} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
          padding: "7px 12px", cursor: "pointer", fontSize: 12, color: "#64748b",
          width: "100%", fontWeight: 500, transition: "all 0.15s",
        }}>
          {isExpanded
            ? <><IconChevronUp size={13} color="#64748b" /> {t.collapseList}</>
            : <><IconChevronDown size={13} color="#64748b" /> {t.expandList(papers.length)}</>
          }
        </button>

        {isExpanded && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
            {papers.map((p: any) => (
              <a key={p.id} href={p.url} target="_blank" rel="noreferrer" style={{
                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8,
                padding: "9px 12px", background: "#f8fafc",
                borderRadius: 8, textDecoration: "none",
                border: "1px solid #e2e8f0", transition: "background 0.15s",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#1e40af", fontSize: 13, lineHeight: 1.4, fontWeight: 500 }}>{p.title}</div>
                  <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 3 }}>{p.topic} · {p.id}</div>
                </div>
                <IconExternalLink size={12} color="#94a3b8" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ label, text, color, bg }: { label: string; text: string; color: string; bg: string }) {
  return (
    <div style={{ marginBottom: 10, background: bg, borderRadius: 8, padding: "8px 10px" }}>
      <span style={{ fontSize: 10, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: 0.8 }}>
        {label}
      </span>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#374151", lineHeight: 1.65 }}>{text}</p>
    </div>
  )
}
