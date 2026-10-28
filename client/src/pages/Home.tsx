import { useState } from "react";
import {
  ArrowUpLeft,
  ArrowUpRight,
  Cloud,
  Eye,
  FileCheck2,
  FolderOpen,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { SiteLayout } from "@/components/droplink/Layout";
import {
  BrandMark,
  DeveloperSection,
  DirectLinksSection,
  FileTypeSection,
  HowItWorks,
} from "@/components/droplink/Sections";
import { MyFiles } from "@/components/droplink/MyFiles";
import { copyToClipboard, UploadCard } from "@/components/droplink/UploadCard";
import { copy } from "@/components/droplink/copy";

export default function Home() {
  const { language } = useLanguage();
  const [exampleCopied, setExampleCopied] = useState(false);
  const t = copy[language];
  const queryClient = useQueryClient();
  const configQuery = useQuery({
    queryKey: ["upload-config"],
    queryFn: async () => {
      const response = await fetch("/api/uploads/config", { credentials: "include" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error?.message || t.genericError);
      return data;
    },
    retry: false,
    staleTime: 60_000,
  });

  const onCopyExample = async (value: string) => {
    try {
      await copyToClipboard(value);
      setExampleCopied(true);
      toast.success(t.copied);
      window.setTimeout(() => setExampleCopied(false), 1800);
    } catch {
      toast.error(t.genericError);
    }
  };

  const goToUpload = () =>
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth", block: "center" });

  const goToFiles = () =>
    document.getElementById("my-files")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <SiteLayout>
      <section className="hero-section">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-content">
          <div className="hero-badge">
            <BrandMark compact />
            <span>{t.badge}</span>
          </div>
          <h1>{t.heroTitle}</h1>
          <p className="hero-subtitle">{t.heroSubtitle}</p>
          <p className="hero-support">{t.heroSupport}</p>
          <div className="hero-cta-row">
            <button type="button" className="button-primary hero-cta" onClick={goToUpload}>
              {t.heroCta}
              <span className="cta-arrow">
                {language === "ar" ? <ArrowUpLeft size={18} /> : <ArrowUpRight size={18} />}
              </span>
            </button>
            <button type="button" className="button-soft hero-secondary-cta" onClick={goToFiles}>
              <FolderOpen size={17} />
              <span>{t.heroExploreFiles}</span>
            </button>
          </div>
          <div className="hero-trust-row">
            <span>
              <Cloud size={16} />
              {language === "ar" ? "تخزين فعلي ومستدام" : "Real persistent storage"}
            </span>
            <span>
              <Eye size={16} />
              {language === "ar" ? "معاينة فورية وآمنة" : "Instant safe file preview"}
            </span>
            <span>
              <FileCheck2 size={16} />
              {language === "ar" ? "روابط مباشرة سريعة" : "Fast direct links"}
            </span>
            <span>
              <ShieldCheck size={16} />
              {language === "ar" ? "حماية وفحص على الخادم" : "Server-side security validation"}
            </span>
          </div>
        </div>
        <span className="hero-bottom-curve" />
      </section>

      <div className="main-content">
        <UploadCard
          language={language}
          config={configQuery.data}
          onUploaded={() => {
            void queryClient.invalidateQueries({ queryKey: ["uploads"] });
          }}
        />
        {configQuery.data &&
          (!configQuery.data.storageReady || !configQuery.data.databaseReady) && (
            <div className="service-warning" role="status">
              {!configQuery.data.storageReady ? t.storageMissing : t.databaseMissing}
            </div>
          )}
        <MyFiles language={language} />
        <FileTypeSection language={language} />
        <HowItWorks language={language} />
        <DirectLinksSection
          language={language}
          onCopy={value => void onCopyExample(value)}
          copied={exampleCopied}
        />
        <DeveloperSection language={language} />
      </div>
    </SiteLayout>
  );
}
