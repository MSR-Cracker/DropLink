import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Language } from "@/components/droplink/types";

type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; toggleLanguage: () => void };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children, defaultLanguage = "ar" }: { children: ReactNode; defaultLanguage?: Language }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("droplink-language");
      return saved === "ar" || saved === "en" ? saved : defaultLanguage;
    } catch { return defaultLanguage; }
  });
  const setLanguage = (next: Language) => setLanguageState(next);
  const toggleLanguage = () => setLanguageState(current => current === "ar" ? "en" : "ar");
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    try { localStorage.setItem("droplink-language", language); } catch { /* storage can be disabled */ }
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, toggleLanguage }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
