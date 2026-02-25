import { useState, useRef, useEffect } from "react"
import { IconUser, IconTelescope, IconSend, IconLoader, IconAlert } from "../components/Icons"
import { useLang } from "../LangContext"

interface Message {
  role: "user" | "assistant"
  content: string
  sources?: any[]
}

export default function Chat() {
  const { t, lang } = useLang()
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: t.chatWelcome },
  ])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [llmStatus, setLlmStatus] = useState<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/chat/status").then(r => r.json()).then(setLlmStatus)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function send() {
    if (!input.trim() || isStreaming) return
    const question = input.trim()
    setInput("")
    setIsStreaming(true)

    setMessages(prev => [...prev, { role: "user", content: question }])
    const assistantIdx = messages.length + 1
    setMessages(prev => [...prev, { role: "assistant", content: "", sources: [] }])

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, lang }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = decoder.decode(value).split("\n")
        for (const line of lines) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === "sources") {
              setMessages(prev => prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, sources: data.content } : m
              ))
            } else if (data.type === "token") {
              setMessages(prev => prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: m.content + data.content } : m
              ))
            }
          } catch {}
        }
      }
    } catch (e) {
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, content: t.requestFailed } : m
      ))
    }
    setIsStreaming(false)
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* 页头 */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#0c2147", letterSpacing: "-0.5px" }}>{t.chatTitle}</h1>
        <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>{t.chatSub}</p>
      </div>

      {/* LLM 状态提示 */}
      {llmStatus && !llmStatus.available && (
        <div style={{
          background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10,
          padding: "10px 16px", marginBottom: 14, fontSize: 13, color: "#92400e",
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <IconAlert size={16} color="#d97706" />
          <span>
            {t.llmWarning}{" "}
            <code style={{ background: "#fef3c7", padding: "1px 4px", borderRadius: 4 }}>~/.research-radar/config.json</code>{" "}
            {t.llmWarning2}
          </span>
        </div>
      )}

      {/* 消息区域 */}
      <div style={{
        flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 18,
        paddingBottom: 8, paddingRight: 4,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row",
            gap: 10, alignItems: "flex-start",
          }}>
            {/* 头像 */}
            <div style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              background: msg.role === "user"
                ? "linear-gradient(135deg, #1a56db, #3b82f6)"
                : "linear-gradient(135deg, #0e7c6b, #10b981)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}>
              {msg.role === "user"
                ? <IconUser size={16} color="#fff" />
                : <IconTelescope size={16} color="#fff" />
              }
            </div>
            <div style={{ maxWidth: "72%" }}>
              {/* 气泡 */}
              <div style={{
                background: msg.role === "user" ? "linear-gradient(135deg, #1a56db, #2563eb)" : "#fff",
                color: msg.role === "user" ? "#fff" : "#1e293b",
                borderRadius: msg.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                padding: "12px 16px", fontSize: 14, lineHeight: 1.75,
                boxShadow: msg.role === "user"
                  ? "0 2px 8px rgba(26,86,219,0.25)"
                  : "0 1px 6px rgba(0,0,0,0.08)",
                border: msg.role === "assistant" ? "1px solid #f1f5f9" : "none",
                whiteSpace: "pre-wrap",
              }}>
                {msg.content}
                {isStreaming && i === messages.length - 1 && (
                  <span style={{
                    display: "inline-block", width: 2, height: 16,
                    background: "#3b82f6", marginLeft: 3,
                    verticalAlign: "middle", animation: "blink 1s infinite",
                  }} />
                )}
              </div>
              {/* 引用来源 */}
              {msg.sources && msg.sources.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {msg.sources.slice(0, 5).map((s: any) => (
                    <a key={s.id} href={s.url} target="_blank" rel="noreferrer" style={{
                      background: "#eff6ff", border: "1px solid #bfdbfe",
                      borderRadius: 6, padding: "3px 8px", fontSize: 11,
                      color: "#1d4ed8", textDecoration: "none",
                    }}>
                      [{s.index}] {s.title.slice(0, 40)}…
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 输入框 */}
      <div style={{
        display: "flex", gap: 10, marginTop: 12,
        background: "#fff", borderRadius: 14,
        padding: "10px 10px 10px 16px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
        border: "1px solid #e2e8f0",
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={t.chatPlaceholder}
          style={{
            flex: 1, border: "none", outline: "none", fontSize: 14,
            color: "#1e293b", background: "transparent",
          }}
        />
        <button
          onClick={send}
          disabled={isStreaming || !input.trim()}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 18px",
            background: isStreaming || !input.trim()
              ? "#e2e8f0"
              : "linear-gradient(135deg, #1a56db, #3b82f6)",
            color: isStreaming || !input.trim() ? "#94a3b8" : "#fff",
            border: "none", borderRadius: 10,
            cursor: isStreaming || !input.trim() ? "default" : "pointer",
            fontSize: 14, fontWeight: 600,
            boxShadow: isStreaming || !input.trim() ? "none" : "0 2px 8px rgba(26,86,219,0.3)",
            transition: "all 0.2s",
          }}
        >
          {isStreaming
            ? <IconLoader size={16} color="#94a3b8" />
            : <><IconSend size={15} color="#fff" /> {t.send}</>
          }
        </button>
      </div>
    </div>
  )
}
