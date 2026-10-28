import { Mail, ShieldCheck, FileText, CircleHelp, Info } from "lucide-react";
import { Link } from "wouter";
import type { ReactNode, ComponentType } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SiteLayout } from "@/components/droplink/Layout";
import { copy, DEVELOPER_URL } from "@/components/droplink/copy";

function InfoPage({ icon: Icon, title, children }: { icon: ComponentType<{ size?: number }>; title: string; children: ReactNode }) {
  const { language } = useLanguage();
  return <SiteLayout><div className="page-container info-page-container"><section className="info-hero-card"><span className="empty-file-icon"><Icon size={30}/></span><h1>{title}</h1><div className="info-page-content">{children}</div><Link href="/" className="button-primary">{language === "ar" ? "العودة للرئيسية" : "Back to home"}</Link></section></div></SiteLayout>;
}

export function AboutPage() {
  const { language } = useLanguage(); const ar = language === "ar";
  return <InfoPage icon={Info} title={ar ? "من نحن" : "About DropLink"}><p>{ar ? "DropLink منصة بسيطة لرفع الملفات ومشاركتها عبر روابط مباشرة، مع معاينة آمنة للأنواع الشائعة وإدارة ملفاتك من المتصفح." : "DropLink is a simple file upload and sharing platform with direct links, safe previews for common formats, and browser-based file management."}</p><p>{ar ? "نهدف إلى جعل مشاركة الملفات سهلة وواضحة مع الاهتمام بالخصوصية وأمان الروابط." : "Our goal is to make file sharing straightforward while keeping privacy and link safety in mind."}</p><p><a href={DEVELOPER_URL} target="_blank" rel="noreferrer">{ar ? "صفحة المطور" : "Developer page"}</a></p></InfoPage>;
}

export function PrivacyPage() {
  const { language } = useLanguage(); const ar = language === "ar";
  return <InfoPage icon={ShieldCheck} title={copy[language].privacy}><h2>{ar ? "الملفات والروابط" : "Files and links"}</h2><p>{ar ? "روابط الملفات المباشرة متاحة لمن يمتلك الرابط. لا ترفع معلومات حساسة أو ملفات لا تملك حق مشاركتها." : "Direct file links are accessible to anyone who has the link. Do not upload sensitive information or files you do not have permission to share."}</p><h2>{ar ? "بيانات الاستخدام" : "Usage data"}</h2><p>{ar ? "قد تُعالج الخدمة البيانات اللازمة لتشغيل الرفع وإدارة الملفات وحماية الخدمة من إساءة الاستخدام. تعتمد مدة الاحتفاظ على إعدادات التخزين وسياسة المشغل." : "The service may process data needed to handle uploads, manage files, and prevent abuse. Retention depends on the storage configuration and operator policy."}</p><p>{ar ? "هذه صفحة معلومات عامة وليست استشارة قانونية؛ حدّثها بما يتوافق مع طريقة تشغيل الخدمة والقوانين التي تنطبق عليك قبل الإطلاق العام." : "This is general information, not legal advice. Update it to match your actual operations and applicable laws before public launch."}</p></InfoPage>;
}

export function TermsPage() {
  const { language } = useLanguage(); const ar = language === "ar";
  return <InfoPage icon={FileText} title={copy[language].terms}><h2>{ar ? "الاستخدام المقبول" : "Acceptable use"}</h2><p>{ar ? "يُمنع استخدام الخدمة لنشر البرمجيات الخبيثة أو المحتوى غير القانوني أو انتهاك حقوق الآخرين أو محاولة تجاوز ضوابط الأمان." : "Do not use the service to distribute malware or illegal content, infringe others’ rights, or bypass security controls."}</p><h2>{ar ? "مسؤولية الملفات" : "File responsibility"}</h2><p>{ar ? "أنت مسؤول عن الملفات التي ترفعها وعن مشاركة الروابط. قد تُحذف الملفات المخالفة أو التي تشكل خطرًا على الخدمة." : "You are responsible for the files you upload and the links you share. Files that violate these terms or threaten the service may be removed."}</p><p>{ar ? "حدّد حدود الاستخدام وحجم الملفات وسياسة الحذف والدعم الفعلية قبل نشر الخدمة للجمهور." : "Publish accurate usage limits, file-size limits, deletion rules, and support policies before launching publicly."}</p></InfoPage>;
}

export function FaqPage() {
  const { language } = useLanguage(); const ar = language === "ar";
  const entries = ar ? [
    ["كيف أرفع ملفًا؟", "اختر الملف من منطقة الرفع وانتظر تأكيد اكتمال التخزين، ثم انسخ رابط المشاركة."],
    ["هل يحتاج المستلم إلى حساب؟", "لا، يمكن لمن يمتلك الرابط الوصول إلى الملف ما دام متاحًا."],
    ["هل كل الملفات قابلة للمعاينة؟", "المعاينة متاحة للصور وPDF والصوت والفيديو وبعض النصوص؛ الأنواع الأخرى يمكن تنزيلها."],
    ["هل يمكن حذف ملف؟", "يمكن حذف الملفات من قائمة ملفاتك إذا كان مزود التخزين والإعدادات يدعمان الحذف."],
  ] : [
    ["How do I upload a file?", "Choose a file in the upload area and wait for storage confirmation, then copy its sharing link."],
    ["Does the recipient need an account?", "No. Anyone with the link can access the file while it remains available."],
    ["Can every file be previewed?", "Preview is available for images, PDFs, audio, video, and some text formats. Other types can be downloaded."],
    ["Can I delete a file?", "Files can be deleted from your file list when the configured storage provider supports deletion."],
  ];
  return <InfoPage icon={CircleHelp} title={copy[language].faq}><div className="faq-list">{entries.map(([q,a]) => <article key={q}><h2>{q}</h2><p>{a}</p></article>)}</div></InfoPage>;
}

export function ContactPage() {
  const { language } = useLanguage(); const ar = language === "ar";
  return <InfoPage icon={Mail} title={copy[language].contact}><p>{ar ? "للاستفسارات أو الإبلاغ عن مشكلة، تواصل مع مشغل الخدمة عبر قناة الدعم التي يعلنها." : "For questions or to report an issue, contact the service operator through its published support channel."}</p><p>{ar ? "لم يُضف عنوان بريد دعم إلى هذه النسخة؛ أضف بريدًا رسميًا قبل الإطلاق بدلًا من عرض عنوان غير مؤكد." : "No support email is configured in this build. Add an official address before launch rather than displaying an unverified one."}</p></InfoPage>;
}
