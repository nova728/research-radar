import { useState } from "react"
import Dashboard from "./pages/Dashboard"
import Topics from "./pages/Topics"
import Chat from "./pages/Chat"
import Settings from "./pages/Settings"
import {
  IconTrendChart, IconMap, IconChat, IconSettings, IconRadar,
} from "./components/Icons"
import { useLang } from "./LangContext"

export default function App() {
  const [page, setPage] = useState("dashboard")
  const { lang, t, toggle } = useLang()

  const NAV = [
    { id: "dashboard", label: t.nav.dashboard, Icon: IconTrendChart },
    { id: "topics",    label: t.nav.topics,    Icon: IconMap },
    { id: "chat",      label: t.nav.chat,      Icon: IconChat },
    { id: "settings",  label: t.nav.settings,  Icon: IconSettings },
  ]

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", background: "#f0f4ff" }}>
      {/* Sidebar */}
      <aside style={{
        width: 232, background: "linear-gradient(180deg, #0c2147 0%, #0f2d5e 100%)", color: "#fff",
        display: "flex", flexDirection: "column", flexShrink: 0,
        boxShadow: "2px 0 12px rgba(0,0,0,0.18)",
      }}>
        {/* Logo 区域 */}
        <div style={{ padding: "28px 22px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(59,130,246,0.4)",
            }}>
              <IconRadar size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>ResearchRadar</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>{t.appSubtitle}</div>
            </div>
          </div>
        </div>

        {/* 导航 */}
        <nav style={{ marginTop: 10, flex: 1, padding: "8px 10px" }}>
          {NAV.map(n => {
            const active = page === n.id
            return (
              <button
                key={n.id}
                onClick={() => setPage(n.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", textAlign: "left",
                  padding: "10px 12px", marginBottom: 2,
                  border: "none", cursor: "pointer", borderRadius: 8,
                  background: active ? "rgba(96,165,250,0.18)" : "transparent",
                  color: active ? "#93c5fd" : "rgba(255,255,255,0.55)",
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  transition: "all 0.15s",
                }}
              >
                <n.Icon size={17} color={active ? "#93c5fd" : "rgba(255,255,255,0.5)"} />
                {n.label}
                {active && (
                  <span style={{
                    marginLeft: "auto", width: 6, height: 6, borderRadius: "50%",
                    background: "#60a5fa",
                  }} />
                )}
              </button>
            )
          })}
        </nav>

        {/* 底部：语言切换 + 数据说明 */}
        <div style={{
          padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,0.07)",
        }}>
          {/* 语言切换按钮 */}
          <button
            onClick={toggle}
            title={lang === "zh" ? "Switch to English" : "切换为中文"}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              width: "100%", marginBottom: 10,
              padding: "7px 10px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.07)",
              cursor: "pointer", transition: "background 0.15s",
            }}
          >
            {/* 地球 SVG */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", flex: 1 }}>
              {lang === "zh" ? "中文" : "English"}
            </span>
            <span style={{
              fontSize: 10, color: "rgba(255,255,255,0.35)",
              background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: 4,
            }}>
              {lang === "zh" ? "EN" : "中"}
            </span>
          </button>

          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginBottom: 2 }}>
            {t.dataLocal}
          </div>
          <code style={{ color: "rgba(96,165,250,0.6)", fontSize: 10 }}>~/.research-radar/</code>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto", padding: "28px 32px" }}>
        {page === "dashboard" && <Dashboard />}
        {page === "topics"    && <Topics />}
        {page === "chat"      && <Chat />}
        {page === "settings"  && <Settings />}
      </main>
    </div>
  )
}
