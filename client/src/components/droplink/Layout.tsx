import { Link, useLocation } from "wouter";
import { Languages, Moon, Sun, UploadCloud } from "lucide-react";
import type { ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { copy, DEVELOPER_NAME, DEVELOPER_URL } from "./copy";
import { BrandMark } from "./Sections";

export function SiteLayout({ children }: { children: ReactNode }) {
  const { language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const t = copy[language];
  const [location] = useLocation();
  const links = [
    ["/", t.navHome], ["/#my-files", t.navFiles], ["/about", t.navAbout],
    ["/faq", t.navFaq], ["/privacy", t.navPrivacy], ["/terms", t.navTerms], ["/contact", t.navContact],
  ] as const;
  return <div className="site-shell">
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand" aria-label="DropLink home"><BrandMark /><span>DropLink</span></Link>
        <nav className="site-nav" aria-label={language === "ar" ? "التنقل الرئيسي" : "Main navigation"}>
          {links.map(([href, label]) => <Link key={href} href={href} className={(href === location || (href === "/" && location === "/")) ? "nav-link active" : "nav-link"}>{label}</Link>)}
        </nav>
        <div className="header-actions">
          <button type="button" className="icon-button" onClick={toggleLanguage} aria-label={t.language} title={t.language}><Languages size={18} /></button>
          {toggleTheme && <button type="button" className="icon-button" onClick={toggleTheme} aria-label={theme === "dark" ? t.themeLight : t.themeDark} title={theme === "dark" ? t.themeLight : t.themeDark}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>}
          <Link href="/#upload" className="button-primary header-upload"><UploadCloud size={16} />{t.heroCta}</Link>
        </div>
      </div>
    </header>
    <main>{children}</main>
    <footer className="site-footer"><div className="footer-inner"><Link href="/" className="site-brand"><BrandMark compact /><span>DropLink</span></Link><p>{t.footerDescription}</p><div className="footer-links">{links.filter(([href]) => href !== "/#my-files").map(([href,label]) => <Link key={href} href={href}>{label}</Link>)}</div><small>© {new Date().getFullYear()} {t.copyright} · {t.developedBy} <a href={DEVELOPER_URL} target="_blank" rel="noreferrer">{DEVELOPER_NAME}</a></small></div></footer>
  </div>;
}
