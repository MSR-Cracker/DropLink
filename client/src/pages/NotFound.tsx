import { AlertCircle, Home } from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { SiteLayout } from "@/components/droplink/Layout";

export default function NotFound() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  return (
    <SiteLayout>
      <div className="page-container notfound-page-container">
        <div className="info-hero-card notfound-card">
          <span className="empty-file-icon notfound-icon">
            <AlertCircle size={36} />
          </span>
          <span className="notfound-code">404</span>
          <h1>{isAr ? "الصفحة غير موجودة" : "Page Not Found"}</h1>
          <p>
            {isAr
              ? "عذرًا، الرابط الذي تحاول فتحه غير موجود أو ربما تم نقله أو حذفه."
              : "Sorry, the page you are looking for doesn't exist or may have been moved."}
          </p>
          <div className="notfound-actions">
            <Link href="/" className="button-primary hero-cta">
              <Home size={18} />
              <span>{isAr ? "العودة إلى الصفحة الرئيسية" : "Back to Home Page"}</span>
            </Link>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
