import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Download, ExternalLink, FileText, Home, Link2 } from "lucide-react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { SiteLayout } from "@/components/droplink/Layout";
import { copy } from "@/components/droplink/copy";
import { copyToClipboard, formatBytes } from "@/components/droplink/UploadCard";

export default function FilePreview() {
  const [, paramsA] = useRoute("/preview/:id");
  const [, paramsB] = useRoute("/f/:id");
  const id = paramsA?.id ?? paramsB?.id ?? "";
  const { language } = useLanguage();
  const t = copy[language].previewPage;
  const fileQuery = useQuery({
    queryKey: ["upload", id],
    enabled: Boolean(id),
    retry: false,
    queryFn: async () => {
      const response = await fetch(`/api/uploads/${encodeURIComponent(id)}`, { credentials: "include" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error?.message || "File not found");
      return data;
    },
  });
  const [zoom, setZoom] = useState(1);
  const [textCopied, setTextCopied] = useState(false);
  const file = fileQuery.data;
  const isText = Boolean(file && ["text/plain", "application/json", "text/csv"].includes(file.contentType));
  const textUrl = useMemo(() => `/api/uploads/${encodeURIComponent(id)}/text`, [id]);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState(false);
  // Fetch only safe text previews from the dedicated server endpoint.
  useEffect(() => {
    if (!isText || textContent !== null || !id) return;
    let active = true;
    fetch(textUrl, { credentials: "include" }).then(async response => {
      if (!response.ok) throw new Error("Preview unavailable");
      return response.text();
    }).then(value => { if (active) setTextContent(value); }).catch(() => { if (active) setTextError(true); });
    return () => { active = false; };
  }, [id, isText, textContent, textUrl]);
  const isAr = language === "ar";
  const back = isAr ? <ArrowRight size={17} /> : <ArrowLeft size={17} />;
  const copyLink = async (value: string) => { try { await copyToClipboard(new URL(value, window.location.origin).toString()); toast.success(copy[language].copied); } catch { toast.error(copy[language].genericError); } };
  if (fileQuery.isLoading) return <SiteLayout><div className="page-container"><p role="status">{copy[language].loading}</p></div></SiteLayout>;
  if (!file || fileQuery.isError) return <SiteLayout><div className="page-container notfound-page-container"><div className="info-hero-card"><h1>{t.notFoundTitle}</h1><p>{t.notFoundDescription}</p><Link href="/" className="button-primary"><Home size={17}/>{t.backToHome}</Link></div></div></SiteLayout>;
  const url = file.downloadUrl || file.url;
  const type = file.contentType || "application/octet-stream";
  return <SiteLayout><div className="page-container preview-page-container">
    <div className="preview-top-actions"><Link href="/" className="button-soft">{back}{t.backToHome}</Link><Link href="/#my-files" className="button-soft">{t.backToFiles}</Link></div>
    <section className="preview-layout"><div className="preview-main-panel"><div className="preview-file-heading"><span className="type-icon"><FileText size={22}/></span><div><h1>{file.name}</h1><p>{type} · {formatBytes(file.sizeBytes, language)}</p></div></div>
      <div className="preview-canvas">
        {type.startsWith("image/") ? <img src={file.url} alt={file.name} style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain", transform: `scale(${zoom})` }} />
        : type === "application/pdf" ? <iframe title={file.name} src={file.url} className="preview-iframe" />
        : type.startsWith("video/") ? <video controls playsInline src={file.url} className="preview-media">{t.videoUnsupported}</video>
        : type.startsWith("audio/") ? <audio controls src={file.url} className="preview-audio">{t.audioUnsupported}</audio>
        : isText ? <pre className="preview-text-content">{textError ? t.unsupportedDescription : textContent ?? copy[language].loading}</pre>
        : <div className="preview-unsupported"><FileText size={42}/><h2>{t.unsupportedTitle}</h2><p>{t.unsupportedDescription}</p></div>}
      </div>
      {isText && textContent && <div className="preview-controls"><button className="button-soft" onClick={async () => { try { await copyToClipboard(textContent); setTextCopied(true); toast.success(t.textCopied); } catch { toast.error(copy[language].genericError); } }}>{textCopied ? t.textCopied : t.copyTextContent}</button></div>}
      {type.startsWith("image/") && <div className="preview-controls"><button className="button-soft" onClick={() => setZoom(v => Math.min(3, v + .2))}>{t.zoomIn}</button><button className="button-soft" onClick={() => setZoom(v => Math.max(.4, v - .2))}>{t.zoomOut}</button><button className="button-soft" onClick={() => setZoom(1)}>{t.resetZoom}</button></div>}
    </div><aside className="preview-details-panel"><h2>{t.fileDetails}</h2><dl><dt>{t.fileName}</dt><dd>{file.name}</dd><dt>{t.fileType}</dt><dd dir="ltr">{type}</dd><dt>{t.fileSize}</dt><dd>{formatBytes(file.sizeBytes, language)}</dd><dt>{t.uploadedAt}</dt><dd>{new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(file.createdAt))}</dd></dl><div className="preview-action-stack"><a href={url} className="button-primary" download><Download size={17}/>{copy[language].download}</a><a href={file.url} className="button-soft" target="_blank" rel="noreferrer"><ExternalLink size={16}/>{t.openInNewTab}</a><button className="button-soft" onClick={() => void copyLink(file.url)}><Link2 size={16}/>{t.directLink}</button><button className="button-soft" onClick={() => void copyLink(window.location.href)}><Link2 size={16}/>{t.previewLink}</button></div></aside></section>
  </div></SiteLayout>;
}
