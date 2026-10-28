import {
  Archive,
  Code2,
  ExternalLink,
  FileAudio2,
  FileCode2,
  FileImage,
  FileText,
  FileVideo2,
  LifeBuoy,
  Link2,
  LockKeyhole,
  MousePointer2,
  ShieldCheck,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { Link } from "wouter";
import type { Language } from "./types";
import { copy, DEVELOPER_NAME, DEVELOPER_URL } from "./copy";

const typeIcons: LucideIcon[] = [
  FileImage,
  FileText,
  FileCode2,
  FileAudio2,
  FileVideo2,
  Archive,
];
const stepIcons: LucideIcon[] = [MousePointer2, Upload, Link2];

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-mark ${compact ? "brand-mark-compact" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none">
        <path
          d="M11 4.75h11.3L31 13.5v19.75A2.75 2.75 0 0 1 28.25 36h-17.5A2.75 2.75 0 0 1 8 33.25V7.5A2.75 2.75 0 0 1 10.75 4.75Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M22 5v9h9M14 24.5h5m-2.5-2.5v5m5.5-2.5h4"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="M19.5 24.5h4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function FileTypeSection({ language }: { language: Language }) {
  const t = copy[language];
  return (
    <section className="section-wrap" id="file-types">
      <div className="section-heading">
        <span className="eyebrow">
          <span className="eyebrow-dot" />
          {language === "ar" ? "دعم شامل للمعاينة والمشاركة" : "Comprehensive preview & sharing"}
        </span>
        <h2>{t.typeTitle}</h2>
        <p>{t.typeSubtitle}</p>
      </div>
      <div className="type-grid">
        {t.types.map((item, index) => {
          const Icon = typeIcons[index] || FileText;
          return (
            <article className="type-card" key={item.name}>
              <span className="card-accent" />
              <span className="type-icon">
                <Icon size={22} strokeWidth={1.8} />
              </span>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function HowItWorks({ language }: { language: Language }) {
  const t = copy[language];
  return (
    <section className="section-wrap steps-section" id="how-it-works">
      <div className="section-heading">
        <span className="eyebrow">
          <span className="eyebrow-dot" />
          {language === "ar" ? "خطوات واضحة وسريعة" : "Simple by design"}
        </span>
        <h2>{t.stepsTitle}</h2>
      </div>
      <div className="steps-grid">
        {t.steps.map((step, index) => {
          const Icon = stepIcons[index] || Upload;
          return (
            <article className="step-card" key={step.title}>
              <div className="step-top">
                <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="step-icon">
                  <Icon size={20} />
                </span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function DirectLinksSection({
  language,
  onCopy,
  copied,
}: {
  language: Language;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const t = copy[language];
  return (
    <section className="direct-section" id="direct-links">
      <div className="direct-copy">
        <span className="eyebrow">
          <span className="eyebrow-dot" />
          {language === "ar" ? "مشاركة ومعاينة آمنة" : "Direct sharing & safe preview"}
        </span>
        <h2>{t.directTitle}</h2>
        <p>{t.directDescription}</p>
        <ul className="direct-examples">
          {t.directExamples.map(item => (
            <li key={item}>
              <span className="check-mark">
                <ShieldCheck size={16} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="link-example-card">
        <div className="example-card-head">
          <span className="example-file-icon">
            <Link2 size={20} />
          </span>
          <div>
            <strong>{language === "ar" ? "نموذج الرابط المباشر" : "Direct link structure"}</strong>
            <small>{t.exampleNotice}</small>
          </div>
        </div>
        <div className="example-url-row" dir="ltr">
          <code>{t.exampleUrl}</code>
          <button
            type="button"
            className="icon-button"
            onClick={() => onCopy(t.exampleUrl)}
            aria-label={t.copyLink}
          >
            {copied ? <ShieldCheck size={18} /> : <span className="copy-glyph">⧉</span>}
          </button>
        </div>
        <div className="example-foot">
          <LockKeyhole size={14} />
          {t.exampleNotice}
        </div>
      </div>
    </section>
  );
}

export function DeveloperSection({ language }: { language: Language }) {
  const t = copy[language];
  return (
    <section className="developer-section" id="developer">
      <div className="developer-card">
        <div className="developer-info">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            {t.developerSectionBadge}
          </span>
          <h2>
            {t.developerSectionTitle} —{" "}
            <a
              href={DEVELOPER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="developer-highlight-link"
            >
              {DEVELOPER_NAME}
            </a>
          </h2>
          <p>{t.developerSectionDesc}</p>
          <div className="developer-actions">
            <a
              href={DEVELOPER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="button-primary developer-btn"
            >
              <Code2 size={17} />
              <span>{t.visitDeveloperPage}</span>
              <ExternalLink size={15} />
            </a>
            <Link href="/contact" className="button-soft developer-btn">
              <LifeBuoy size={17} />
              <span>{t.technicalSupportBtn}</span>
            </Link>
          </div>
        </div>
        <div className="developer-badge-visual">
          <div className="dev-avatar-ring">
            <Code2 size={34} />
          </div>
          <strong>{DEVELOPER_NAME}</strong>
          <a
            href={DEVELOPER_URL}
            target="_blank"
            rel="noopener noreferrer"
            dir="ltr"
            className="dev-url-pill"
          >
            msr-coder.pages.dev ↗
          </a>
        </div>
      </div>
    </section>
  );
}
