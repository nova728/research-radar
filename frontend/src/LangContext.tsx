import { createContext, useContext, useState, ReactNode } from "react"
import { Lang, translations, I18n } from "./i18n"

interface LangCtx {
  lang: Lang
  t: I18n
  toggle: () => void
}

const LangContext = createContext<LangCtx>({
  lang: "zh",
  t: translations.zh,
  toggle: () => {},
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("zh")
  const toggle = () => setLang(l => (l === "zh" ? "en" : "zh"))
  return (
    <LangContext.Provider value={{ lang, t: translations[lang], toggle }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
