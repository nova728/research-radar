import { useEffect, useState } from "react"
import {
  IconRobot, IconTarget, IconDatabase, IconCheck, IconX, IconPlus,
  IconLoader, IconEdit, IconTrash,
} from "../components/Icons"
import { useLang } from "../LangContext"

export default function Settings() {
  const { t } = useLang()
  const [status, setStatus]   = useState<any>(null)
  const [topics, setTopics]   = useState<any[]>([])
  const [newName, setNewName] = useState("")
  const [newKws, setNewKws]   = useState("")
  const [addedHint, setAddedHint] = useState(false)
  const [editingName, setEditingName]   = useState<string | null>(null)
  const [editName,    setEditName]      = useState("")
  const [editKws,     setEditKws]       = useState("")
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/chat/status").then(r => r.json()).then(setStatus)
    loadTopics()
  }, [])

  function loadTopics() {
    fetch("/api/papers/topics").then(r => r.json()).then(setTopics)
  }

  async function addTopic() {
    if (!newName.trim() || !newKws.trim()) return
    const keywords = newKws.split(",").map((k: string) => k.trim()).filter(Boolean)
    await fetch(`/api/papers/topics?name=${encodeURIComponent(newName.trim())}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(keywords),
    })
    setNewName(""); setNewKws("")
    setAddedHint(true)
    setTimeout(() => setAddedHint(false), 6000)
    loadTopics()
  }

  function startEdit(tp: any) {
    setEditingName(tp.name)
    setEditName(tp.name)
    setEditKws(JSON.parse(tp.keywords).join(", "))
    setConfirmingDelete(null)
  }

  async function saveEdit(originalName: string) {
    const keywords = editKws.split(",").map((k: string) => k.trim()).filter(Boolean)
    const params = new URLSearchParams({ new_name: editName.trim() })
    keywords.forEach((k: string) => params.append("keywords", k))
    await fetch(`/api/papers/topics/${encodeURIComponent(originalName)}?${params}`, { method: "PUT" })
    setEditingName(null)
    loadTopics()
  }

  async function deleteTopic(name: string) {
    await fetch(`/api/papers/topics/${encodeURIComponent(name)}`, { method: "DELETE" })
    setConfirmingDelete(null)
    loadTopics()
  }

  async function toggleTopic(name: string) {
    const res = await fetch(`/api/papers/topics/${encodeURIComponent(name)}/toggle`, { method: "PATCH" })
    const data = await res.json()
    setTopics(prev => prev.map((tp: any) => tp.name === name ? { ...tp, enabled: data.enabled } : tp))
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 28px", fontSize: 26, fontWeight: 700, color: "#0c2147", letterSpacing: "-0.5px" }}>
        {t.settingsTitle}
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 18, alignItems: "start" }}>

        {/* 左列固定 360px */}
        <div style={{ minWidth: 0 }}>
          <Card title={t.llmStatusTitle} icon={<IconRobot size={16} color="#1a56db" />}>
            {status ? (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <StatusChip label={t.connStatus} value={status.available ? t.connected : t.notConfigured} ok={status.available} />
                  <StatusChip label={t.provider} value={status.provider || "—"} />
                  <StatusChip label={t.model} value={status.model || "—"} />
                </div>
                <div style={{ padding: "12px 14px", background: "#f8fafc", borderRadius: 10, fontSize: 13, color: "#475569", lineHeight: 1.9, border: "1px solid #e2e8f0" }}>
                  {t.configFileLabel}<code style={{ color: "#1a56db", background: "#eff6ff", padding: "1px 5px", borderRadius: 4 }}>~/.research-radar/config.json</code><br />
                  {t.supports}<strong>{t.supportsDetail}</strong><br />
                  {t.restartNote}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 14 }}>
                <IconLoader size={16} color="#94a3b8" /> {t.loadingText}
              </div>
            )}
          </Card>

          <Card title={t.dataStorageTitle} icon={<IconDatabase size={16} color="#8b5cf6" />}>
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 2 }}>
              {t.dataDesc}{" "}<code style={{ color: "#1a56db", background: "#eff6ff", padding: "1px 6px", borderRadius: 4 }}>~/.research-radar/</code><br />
              <code style={{ color: "#374151" }}>radar.db</code><span style={{ color: "#94a3b8" }}>{t.dbDesc}</span><br />
              <code style={{ color: "#374151" }}>config.json</code><span style={{ color: "#94a3b8" }}>{t.configDesc}</span><br /><br />
              <span style={{ color: "#94a3b8" }}>{t.uninstallNote}</span>
            </div>
          </Card>

        </div>

        {/* 右列自适应 */}
        <div style={{ minWidth: 0 }}>
          <Card title={t.topicsTitle2} icon={<IconTarget size={16} color="#059669" />}>
            {topics.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {topics.map((tp: any) => {
                  const isEditing  = editingName === tp.name
                  const isDeleting = confirmingDelete === tp.name
                  const kws: string[] = JSON.parse(tp.keywords)

                  if (isEditing) return (
                    <div key={tp.name} style={{ padding: "12px 14px", background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a" }}>
                      <input value={editName} onChange={e => setEditName(e.target.value)} style={{ ...inputStyle, marginBottom: 8, fontWeight: 600 }} />
                      <input value={editKws} onChange={e => setEditKws(e.target.value)} style={inputStyle} />
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button onClick={() => saveEdit(tp.name)} style={btnPrimary}><IconCheck size={12} color="#fff" /> {t.saveEdit}</button>
                        <button onClick={() => setEditingName(null)} style={btnGhost}>{t.cancelEdit}</button>
                      </div>
                    </div>
                  )

                  return (
                    <div key={tp.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: isDeleting ? "#fff5f5" : "#f8fafc", borderRadius: 10, border: `1px solid ${isDeleting ? "#fca5a5" : "#e2e8f0"}` }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                        <div style={{ fontWeight: 600, color: "#0c2147", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tp.name}</div>
                        <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kws.join(", ")}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => toggleTopic(tp.name)}
                          title={tp.enabled ? t.disableTopic : t.enableTopic}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "3px 10px", borderRadius: 20, border: "none", cursor: "pointer",
                            fontSize: 11, fontWeight: 600,
                            background: tp.enabled ? "#dcfce7" : "#f1f5f9",
                            color: tp.enabled ? "#15803d" : "#94a3b8",
                            transition: "all 0.15s",
                          }}
                        >
                          {tp.enabled ? <IconCheck size={11} color="#15803d" /> : <IconX size={11} color="#94a3b8" />}
                          {tp.enabled ? t.enabled : t.disabled}
                        </button>
                        {!isDeleting && (
                          <button onClick={() => startEdit(tp)} style={iconBtn("#3b82f6")} title={t.editTopic}>
                            <IconEdit size={13} color="#3b82f6" />
                          </button>
                        )}
                        {isDeleting ? (
                          <>
                            <button onClick={() => deleteTopic(tp.name)} style={{ ...iconBtn("#ef4444"), background: "#ef4444", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#fff", display: "inline-flex", alignItems: "center", gap: 4, width: "auto" }}>
                              <IconCheck size={11} color="#fff" /> {t.confirmDelete}
                            </button>
                            <button onClick={() => setConfirmingDelete(null)} style={iconBtn("#94a3b8")} title={t.cancelEdit}>
                              <IconX size={13} color="#94a3b8" />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => { setEditingName(null); setConfirmingDelete(tp.name) }} style={iconBtn("#ef4444")} title={t.deleteTopic}>
                            <IconTrash size={13} color="#ef4444" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 添加新主题 */}
            <div style={{ border: "1px dashed #cbd5e1", borderRadius: 12, padding: 16, background: "#fafbff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 12 }}>
                <IconPlus size={14} color="#475569" /> {t.addTopicLabel}
              </div>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t.topicNamePlaceholder} style={inputStyle} />
              <input value={newKws} onChange={e => setNewKws(e.target.value)} placeholder={t.keywordsPlaceholder} onKeyDown={e => e.key === "Enter" && addTopic()} style={{ ...inputStyle, marginTop: 8 }} />
              <button onClick={addTopic} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, padding: "8px 20px", background: "linear-gradient(135deg,#1a56db,#3b82f6)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, boxShadow: "0 2px 6px rgba(26,86,219,0.25)" }}>
                <IconPlus size={13} color="#fff" /> {t.addBtn}
              </button>
              {addedHint && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0", fontSize: 13, color: "#15803d", lineHeight: 1.6, display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <IconCheck size={14} color="#15803d" />
                  {t.crawlAfterAdd}
                </div>
              )}
            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", marginBottom: 18, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", border: "1px solid #f1f5f9" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        {icon && <div style={{ width: 28, height: 28, borderRadius: 7, background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>}
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0c2147" }}>{title}</div>
      </div>
      {children}
    </div>
  )
}

function StatusChip({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px", border: "1px solid #e2e8f0", minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: ok === true ? "#059669" : ok === false ? "#dc2626" : "#1e293b", display: "flex", alignItems: "center", gap: 4, overflow: "hidden" }}>
        {ok === true && <IconCheck size={12} color="#059669" />}
        {ok === false && <IconX size={12} color="#dc2626" />}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0",
  borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box",
  color: "#1e293b", background: "#fff",
}

const btnPrimary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "6px 14px", background: "linear-gradient(135deg,#1a56db,#3b82f6)",
  color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
}

const btnGhost: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "6px 14px", background: "#f1f5f9",
  color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 7,
  fontSize: 12, fontWeight: 500, cursor: "pointer",
}

function iconBtn(color: string): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28, borderRadius: 7,
    background: color + "12", border: `1px solid ${color}33`, cursor: "pointer", flexShrink: 0,
  }
}
