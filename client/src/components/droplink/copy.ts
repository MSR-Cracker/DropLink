import type { FileCategory, Language, SortOption } from "./types";

export const DEVELOPER_NAME = "MSR_Coder";
export const DEVELOPER_URL = "https://msr-coder.pages.dev";

export type Copy = {
  navHome: string;
  navFiles: string;
  navAbout: string;
  navFaq: string;
  navPrivacy: string;
  navTerms: string;
  navContact: string;
  signIn: string;
  signOut: string;
  language: string;
  themeLight: string;
  themeDark: string;
  badge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroSupport: string;
  heroCta: string;
  heroExploreFiles: string;
  uploadTitle: string;
  uploadSubtitle: string;
  chooseFiles: string;
  dropFiles: string;
  dropHint: string;
  maxSize: (size: string) => string;
  supported: string;
  uploadModeGuest: string;
  uploadModeAccount: string;
  linksPublic: string;
  uploading: string;
  preparing: string;
  storing: string;
  uploaded: string;
  cancel: string;
  retry: string;
  remove: string;
  clearCompleted: string;
  uploadSuccess: string;
  copyLink: string;
  copyPreviewLink: string;
  copied: string;
  preview: string;
  openDirect: string;
  shareFile: string;
  shareSuccess: string;
  download: string;
  deleteFile: string;
  deleteConfirm: string;
  deleteSuccess: string;
  deleting: string;
  invalidFile: string;
  unsupportedFileType: (ext: string) => string;
  tooLarge: (name: string, max: string) => string;
  networkError: string;
  uploadFailed: string;
  cancelUpload: string;
  typeTitle: string;
  typeSubtitle: string;
  types: { name: string; description: string }[];
  stepsTitle: string;
  steps: { title: string; description: string }[];
  directTitle: string;
  directDescription: string;
  directExamples: string[];
  exampleUrl: string;
  exampleNotice: string;
  developerSectionBadge: string;
  developerSectionTitle: string;
  developerSectionDesc: string;
  visitDeveloperPage: string;
  technicalSupportBtn: string;
  filesTitle: string;
  filesDescription: string;
  search: string;
  filterAll: string;
  sortLabel: string;
  sortOptions: Record<SortOption, string>;
  viewCards: string;
  viewList: string;
  emptyFiles: string;
  fileCount: (count: number, hasMore?: boolean) => string;
  loadMore: string;
  loadingMore: string;
  guestNotice: string;
  accountNotice: string;
  deletionNotice: string;
  deletionSupportedNotice: string;
  loading: string;
  refresh: string;
  genericError: string;
  storageMissing: string;
  databaseMissing: string;
  notUploaded: string;
  deleteUnavailable: string;
  privacy: string;
  terms: string;
  contact: string;
  about: string;
  faq: string;
  footerDescription: string;
  footerHome: string;
  copyright: string;
  developedBy: string;
  shareHint: string;
  noFileYet: string;
  helpTitle: string;
  previewPage: {
    backToFiles: string;
    backToHome: string;
    fileDetails: string;
    fileName: string;
    fileType: string;
    fileSize: string;
    uploadedAt: string;
    directLink: string;
    previewLink: string;
    zoomIn: string;
    zoomOut: string;
    resetZoom: string;
    fullscreen: string;
    openInNewTab: string;
    pdfHint: string;
    textTruncatedNotice: string;
    copyTextContent: string;
    textCopied: string;
    audioUnsupported: string;
    videoUnsupported: string;
    unsupportedTitle: string;
    unsupportedDescription: string;
    notFoundTitle: string;
    notFoundDescription: string;
  };
};

export const copy: Record<Language, Copy> = {
  ar: {
    navHome: "الرئيسية",
    navFiles: "ملفاتي",
    navAbout: "من نحن",
    navFaq: "الأسئلة الشائعة",
    navPrivacy: "سياسة الخصوصية",
    navTerms: "شروط الاستخدام",
    navContact: "التواصل والدعم",
    signIn: "تسجيل الدخول",
    signOut: "تسجيل الخروج",
    language: "English",
    themeLight: "الوضع الفاتح",
    themeDark: "الوضع الداكن",
    badge: "DropLink · روابط مباشرة ومعاينة فورية لملفاتك",
    heroTitle: "ارفع ملفاتك واحصل على رابط مباشر ومعاينة فورية في ثوانٍ",
    heroSubtitle:
      "ارفع الصور وملفات PDF والنصوص والصوتيات والفيديوهات والمستندات، وشاركها عبر روابط مباشرة سريعة مع نظام معاينة مدمج وآمن.",
    heroSupport: "ملفاتك في مكان واحد، وروابطك جاهزة للمعاينة والتنزيل والمشاركة.",
    heroCta: "ابدأ رفع ملفاتك الآن",
    heroExploreFiles: "استعرض ملفاتي",
    uploadTitle: "منطقة رفع الملفات",
    uploadSubtitle: "اسحب ملفاتك وأفلتها هنا أو اختر ملفات متعددة — نتحقق من نوع وحجم كل ملف ونعرض تقدم الرفع لحظة بلحظة.",
    chooseFiles: "اختر الملفات",
    dropFiles: "اسحب ملفاتك وأفلتها هنا",
    dropHint: "أو اضغط لاختيار ملف أو عدة ملفات من جهازك",
    maxSize: size => `الحد الأقصى ${size} لكل ملف`,
    supported: "يدعم: الصور (PNG, JPEG, WebP, GIF) · PDF · النصوص (TXT, JSON, CSV, LOG) · الصوت · الفيديو · ZIP والمستندات",
    uploadModeGuest: "وضع الضيف: إدارة ملفاتك مرتبطة بهذا المتصفح عبر ملف تعريف ارتباط مشفر.",
    uploadModeAccount: "أنت مسجل الدخول: ملفاتك مرتبطة بحسابك.",
    linksPublic: "روابط الملفات المباشرة متاحة لمن يملك الرابط.",
    uploading: "جاري الرفع",
    preparing: "جاري التجهيز…",
    storing: "جاري تأكيد الحفظ في التخزين…",
    uploaded: "تم الرفع بنجاح",
    cancel: "إلغاء الرفع",
    retry: "إعادة المحاولة",
    remove: "إزالة من القائمة",
    clearCompleted: "مسح المكتمل",
    uploadSuccess: "تم رفع الملف وحفظه بنجاح!",
    copyLink: "نسخ الرابط",
    copyPreviewLink: "نسخ رابط المعاينة",
    copied: "تم نسخ الرابط إلى الحافظة!",
    preview: "معاينة",
    openDirect: "فتح الرابط المباشر",
    shareFile: "مشاركة",
    shareSuccess: "تمت مشاركة الرابط أو نسخه بنجاح!",
    download: "تنزيل",
    deleteFile: "حذف",
    deleteConfirm: "هل أنت متأكد من حذف هذا الملف نهائيًا من التخزين وقاعدة البيانات؟",
    deleteSuccess: "تم حذف الملف نهائيًا بنجاح.",
    deleting: "جاري الحذف…",
    invalidFile: "اسم الملف أو حجمه غير صالح (لا يمكن رفع ملف فارغ 0 بايت).",
    unsupportedFileType: ext => `امتداد الملف (.${ext}) غير مدعوم لأسباب أمنية (يُمنع رفع الملفات التنفيذية أو البرمجية النشطة).`,
    tooLarge: (name, max) => `الملف "${name}" يتجاوز الحد الأقصى المسموح به (${max}).`,
    networkError: "انقطع الاتصال بالشبكة أثناء رفع الملف. تحقق من اتصالك وأعد المحاولة.",
    uploadFailed: "تعذر إكمال رفع الملف وحفظه. يرجى المحاولة مرة أخرى.",
    cancelUpload: "تم إلغاء عملية الرفع.",
    typeTitle: "معاينة ومشاركة جميع أنواع الملفات الشائعة",
    typeSubtitle: "يوفر DropLink روابط مباشرة مع نظام معاينة متكامل وآمن داخل المتصفح.",
    types: [
      { name: "الصور (PNG, JPEG, WebP, GIF)", description: "معاينة فورية عالية الدقة مع إمكانية التكبير والتصغير والعرض بملء الشاشة." },
      { name: "ملفات PDF", description: "عارض PDF مدمج يدعم تصفح الصفحات، التكبير والتصغير، والفتح أو التنزيل المباشر." },
      { name: "الملفات النصية والبيانات", description: "معاينة آمنة لملفات TXT وJSON وCSV وLOG وMD بتنسيق واضح دون تنفيذ أي شيفرات." },
      { name: "الملفات الصوتية", description: "مشغل صوتي مدمج يدعم MP3 وWAV وOGG وAAC مع عناصر تحكم كاملة." },
      { name: "ملفات الفيديو", description: "مشغل فيديو قياسي يدعم تشغيل صيغ MP4 وWebM وOGG المتوافقة مع متصفحك." },
      { name: "الأرشيف والمستندات الأخرى", description: "روابط تنزيل مباشرة وموثوقة لملفات ZIP وWord وExcel وغيرها." },
    ],
    stepsTitle: "كيف يعمل DropLink؟ ثلاث خطوات بسيطة",
    steps: [
      { title: "اختر أو اسحب ملفاتك", description: "حدد ملفًا واحدًا أو عدة ملفات من جهازك أو اسحبها مباشرة إلى منطقة الرفع." },
      { title: "ارفع وتابع التقدم", description: "يتم فحص الملف ورفعه بأمان مع شريط تقدم مستقل لكل ملف حتى تأكيد الحفظ الفعلي." },
      { title: "عاين وشارك الرابط", description: "افتح صفحة المعاينة الفورية أو انسخ الرابط المباشر لمشاركته في أي مكان." },
    ],
    directTitle: "روابط مباشرة حقيقية + صفحة معاينة احترافية",
    directDescription:
      "يمنحك DropLink خيارين لكل ملف: رابط مباشر للملف المخزّن نفسه (/dl-storage/...)، ورابط صفحة معاينة غنية (/preview/...) تعرض تفاصيل الملف ومحتواه بأمان.",
    directExamples: [
      "معاينة مباشرة للصور وملفات PDF والنصوص والصوت والفيديو.",
      "حماية صارمة ضد تنفيذ أي شيفرات JavaScript أو HTML داخل الملفات المرفوعة.",
      "روابط سريعة تدعم استئناف التحميل (Range Requests) لتشغيل الوسائط بسلاسة.",
      "إدارة منظمة لملفاتك مع البحث، التصفية، الترتيب، والحذف الآمن.",
    ],
    exampleUrl: "https://your-domain.com/dl-storage/droplink/<file-id>",
    exampleNotice: "مثال توضيحي لهيكل الرابط المباشر — ليس ملفًا فعليًا.",
    developerSectionBadge: "هوية المطور والدعم",
    developerSectionTitle: "تم التطوير بواسطة MSR_Coder",
    developerSectionDesc:
      "تم تصميم وتطوير منصة DropLink بواسطة MSR_Coder وفق أعلى معايير هندسة البرمجيات، أمن الملفات، وتجربة المستخدم العصرية.",
    visitDeveloperPage: "زيارة صفحة المطور",
    technicalSupportBtn: "الدعم الفني",
    filesTitle: "ملفاتي",
    filesDescription: "ابحث، صفِّ، رتّب، وعاين جميع الملفات التي رفعتها من هذا الحساب أو المتصفح.",
    search: "ابحث باسم الملف…",
    filterAll: "كل الأنواع",
    sortLabel: "الترتيب",
    sortOptions: {
      newest: "الأحدث أولًا",
      oldest: "الأقدم أولًا",
      largest: "الأكبر حجمًا",
      smallest: "الأصغر حجمًا",
      name_asc: "الاسم (أ - ي)",
      name_desc: "الاسم (ي - أ)",
    },
    viewCards: "عرض البطاقات",
    viewList: "عرض القائمة",
    emptyFiles: "لا توجد ملفات مرفوعة حتى الآن. ارفع ملفك الأول من الأعلى ليظهر هنا فورًا.",
    fileCount: (count, hasMore) => (hasMore ? `معروض ${count} ملف — توجد ملفات إضافية` : `${count} ملف`),
    loadMore: "تحميل المزيد من الملفات",
    loadingMore: "جاري تحميل المزيد…",
    guestNotice: "وضع الضيف: ملفاتك مرتبطة بهذا المتصفح. مسح ملفات الارتباط (Cookies) قد يفقدك صلاحية إدارتها.",
    accountNotice: "أنت مسجل الدخول: الملفات المعروضة مرتبطة بحسابك.",
    deletionNotice: "الحذف الفعلي غير مدعوم في مزود التخزين الخارجي الحالي؛ لذلك لا نخفي الملفات وهميًا.",
    deletionSupportedNotice: "الحذف الآمن مفعل: عند حذف أي ملف يتم مسحه فعليًا من خدمة التخزين وقاعدة البيانات.",
    loading: "جاري تحميل الملفات…",
    refresh: "تحديث",
    genericError: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
    storageMissing: "خدمة التخزين غير مهيأة حاليًا، لذلك لم يتم حفظ الملف.",
    databaseMissing: "قاعدة البيانات غير متاحة حاليًا، ولم يتم تسجيل الملف.",
    notUploaded: "لم يكتمل الرفع",
    deleteUnavailable: "الحذف الفعلي غير مدعوم من مزود التخزين الحالي.",
    privacy: "سياسة الخصوصية",
    terms: "شروط الاستخدام",
    contact: "التواصل والدعم",
    about: "من نحن",
    faq: "الأسئلة الشائعة",
    footerDescription: "منصة احترافية لرفع ومشاركة ومعاينة الملفات عبر روابط مباشرة وسريعة.",
    footerHome: "الرئيسية",
    copyright: "DropLink. جميع الحقوق محفوظة.",
    developedBy: "تطوير وبرمجة",
    shareHint: "يمكن لأي شخص يملك الرابط المباشر أو رابط المعاينة الوصول إلى الملف.",
    noFileYet: "لا توجد ملفات تطابق معايير البحث أو التصفية الحالية.",
    helpTitle: "روابط سريعة",
    previewPage: {
      backToFiles: "العودة إلى ملفاتي",
      backToHome: "العودة للرئيسية",
      fileDetails: "معلومات الملف",
      fileName: "اسم الملف",
      fileType: "نوع الملف (MIME)",
      fileSize: "حجم الملف",
      uploadedAt: "تاريخ الرفع",
      directLink: "الرابط المباشر للملف",
      previewLink: "رابط صفحة المعاينة",
      zoomIn: "تكبير",
      zoomOut: "تصغير",
      resetZoom: "الحجم الأصلي",
      fullscreen: "عرض بحجم كامل",
      openInNewTab: "فتح في علامة تبويب جديدة",
      pdfHint: "استخدم أدوات التحكم للتكبير أو فتح ملف PDF في نافذة مستقلة للتنقل الكامل بين الصفحات.",
      textTruncatedNotice: "تم عرض أول 256 كيلوبايت من الملف النصي لضمان سرعة التصفح. قم بتنزيل الملف لعرض المحتوى الكامل.",
      copyTextContent: "نسخ النص",
      textCopied: "تم نسخ محتوى النص!",
      audioUnsupported: "متصفحك لا يدعم تشغيل هذا التنسيق الصوتي مباشرة. يمكنك تنزيل الملف لتشغيله على جهازك.",
      videoUnsupported: "متصفحك لا يدعم تشغيل صيغة الفيديو هذه مباشرة. يمكنك تنزيل الملف لمشاهدته.",
      unsupportedTitle: "المعاينة المباشرة غير متاحة لهذا النوع من الملفات",
      unsupportedDescription:
        "حرصًا على أمانك، لا يقوم DropLink بتشغيل البرامج أو عرض صيغ الملفات غير المدعومة داخل المتصفح. يمكنك تنزيل الملف مباشرة إلى جهازك.",
      notFoundTitle: "الملف غير موجود أو تم حذفه",
      notFoundDescription: "تأكد من صحة الرابط أو ربما قام مالك الملف بحذفه نهائيًا من الخدمة.",
    },
  },
  en: {
    navHome: "Home",
    navFiles: "My Files",
    navAbout: "About Us",
    navFaq: "FAQ",
    navPrivacy: "Privacy Policy",
    navTerms: "Terms of Use",
    navContact: "Contact & Support",
    signIn: "Sign in",
    signOut: "Sign out",
    language: "العربية",
    themeLight: "Light Mode",
    themeDark: "Dark Mode",
    badge: "DropLink · Direct links & instant file preview",
    heroTitle: "Upload your files. Get a direct link & instant preview in seconds.",
    heroSubtitle:
      "Upload images, PDFs, text files, audio, video, and documents, then share them via fast direct links with a built-in secure preview experience.",
    heroSupport: "All your files in one place, ready to preview, download, and share.",
    heroCta: "Start uploading now",
    heroExploreFiles: "Browse My Files",
    uploadTitle: "File Upload Zone",
    uploadSubtitle: "Drag and drop multiple files here or browse your device — with real-time per-file progress and server-side validation.",
    chooseFiles: "Choose files",
    dropFiles: "Drag & drop your files here",
    dropHint: "or click to select one or multiple files from your device",
    maxSize: size => `Up to ${size} per file`,
    supported: "Supports: Images (PNG, JPEG, WebP, GIF) · PDF · Text (TXT, JSON, CSV, LOG) · Audio · Video · ZIP & Documents",
    uploadModeGuest: "Guest mode: file management is tied to this browser via a secure HttpOnly cookie.",
    uploadModeAccount: "Signed in: your files are linked to your account.",
    linksPublic: "Direct file links are accessible to anyone with the link.",
    uploading: "Uploading",
    preparing: "Preparing…",
    storing: "Confirming storage…",
    uploaded: "Uploaded",
    cancel: "Cancel upload",
    retry: "Retry",
    remove: "Remove from queue",
    clearCompleted: "Clear completed",
    uploadSuccess: "File uploaded and stored!",
    copyLink: "Copy Link",
    copyPreviewLink: "Copy Preview Link",
    copied: "Link copied to clipboard!",
    preview: "Preview",
    openDirect: "Open Direct Link",
    shareFile: "Share",
    shareSuccess: "Link shared or copied!",
    download: "Download",
    deleteFile: "Delete",
    deleteConfirm: "Are you sure you want to permanently delete this file from storage and database?",
    deleteSuccess: "File permanently deleted.",
    deleting: "Deleting…",
    invalidFile: "Invalid file name or size (0-byte empty files are not allowed).",
    unsupportedFileType: ext => `File extension (.${ext}) is blocked for security reasons (executable/active script files are prohibited).`,
    tooLarge: (name, max) => `File "${name}" exceeds the maximum allowed size (${max}).`,
    networkError: "Network connection interrupted during upload. Check your connection and try again.",
    uploadFailed: "Could not confirm file upload. Please try again.",
    cancelUpload: "Upload cancelled.",
    typeTitle: "Preview & Share All Popular File Types",
    typeSubtitle: "DropLink provides direct links paired with a secure in-browser file previewer.",
    types: [
      { name: "Images (PNG, JPEG, WebP, GIF)", description: "Instant high-resolution preview with zoom controls and full-screen lightbox view." },
      { name: "PDF Documents", description: "Built-in PDF viewer supporting page navigation, zoom in/out, and direct download." },
      { name: "Text & Data Files", description: "Safe formatted preview for TXT, JSON, CSV, LOG, and MD files without executing any scripts." },
      { name: "Audio Files", description: "Integrated audio player for MP3, WAV, OGG, and AAC with standard playback controls." },
      { name: "Video Files", description: "Standard HTML5 video player supporting MP4, WebM, and OGG formats playable by your browser." },
      { name: "Archives & Other Files", description: "Reliable direct download links for ZIP archives, Office documents, and other formats." },
    ],
    stepsTitle: "How DropLink Works — Three Simple Steps",
    steps: [
      { title: "Select or Drop Files", description: "Pick one or multiple files from your device or drag them directly into the upload zone." },
      { title: "Upload & Track Progress", description: "Files are validated and streamed securely with independent progress bars until storage is confirmed." },
      { title: "Preview & Share Link", description: "Open the rich preview page or copy the direct link to share anywhere." },
    ],
    directTitle: "Real Direct Links + Rich File Preview",
    directDescription:
      "DropLink gives you both a direct storage URL (/dl-storage/...) that serves the raw file bytes and a dedicated preview page (/preview/...) with safe in-browser rendering.",
    directExamples: [
      "Live in-browser preview for images, PDFs, text/code, audio, and video.",
      "Strict security policy prevents execution of uploaded HTML or JavaScript.",
      "Byte-range streaming support for smooth audio and video scrubbing.",
      "Organized file manager with search, category filter, sorting, and real deletion.",
    ],
    exampleUrl: "https://your-domain.com/dl-storage/droplink/<file-id>",
    exampleNotice: "Illustrative example of the direct URL structure — not an uploaded file.",
    developerSectionBadge: "Developer & Official Support",
    developerSectionTitle: "Developed by MSR_Coder",
    developerSectionDesc:
      "DropLink is engineered and maintained by MSR_Coder with a focus on modern web architecture, file security, and clean user experience.",
    visitDeveloperPage: "Visit Developer Page",
    technicalSupportBtn: "Technical Support",
    filesTitle: "My Files",
    filesDescription: "Search, filter, sort, preview, and manage files uploaded from your account or browser.",
    search: "Search by filename…",
    filterAll: "All types",
    sortLabel: "Sort by",
    sortOptions: {
      newest: "Newest first",
      oldest: "Oldest first",
      largest: "Largest size",
      smallest: "Smallest size",
      name_asc: "Name (A - Z)",
      name_desc: "Name (Z - A)",
    },
    viewCards: "Card view",
    viewList: "List view",
    emptyFiles: "No uploaded files yet. Upload your first file above and it will appear here immediately.",
    fileCount: (count, hasMore) => `${count} file${count === 1 ? "" : "s"}${hasMore ? " shown (more available)" : ""}`,
    loadMore: "Load more files",
    loadingMore: "Loading more…",
    guestNotice: "Guest mode: your files are bound to this browser. Clearing browser cookies may remove management access.",
    accountNotice: "Signed in: these files are linked to your account.",
    deletionNotice: "Physical deletion is not supported by the current remote storage provider; files are never falsely hidden.",
    deletionSupportedNotice: "Secure deletion enabled: deleting a file permanently removes it from both storage and the database.",
    loading: "Loading files…",
    refresh: "Refresh",
    genericError: "Something went wrong. Please try again.",
    storageMissing: "Storage service is not configured; the file was not saved.",
    databaseMissing: "Database service is unavailable; the file was not recorded.",
    notUploaded: "Upload incomplete",
    deleteUnavailable: "Physical deletion is not supported by the current storage provider.",
    privacy: "Privacy Policy",
    terms: "Terms of Use",
    contact: "Contact & Support",
    about: "About Us",
    faq: "FAQ",
    footerDescription: "Professional file sharing and instant preview platform via fast direct links.",
    footerHome: "Home",
    copyright: "DropLink. All rights reserved.",
    developedBy: "Developed by",
    shareHint: "Anyone with the direct link or preview link can view or download the file.",
    noFileYet: "No files match your current search or filter.",
    helpTitle: "Quick Links",
    previewPage: {
      backToFiles: "Back to My Files",
      backToHome: "Back to Home",
      fileDetails: "File Details",
      fileName: "File Name",
      fileType: "MIME Type",
      fileSize: "File Size",
      uploadedAt: "Uploaded Date",
      directLink: "Direct File URL",
      previewLink: "Preview Page URL",
      zoomIn: "Zoom In",
      zoomOut: "Zoom Out",
      resetZoom: "Reset Zoom",
      fullscreen: "Fullscreen",
      openInNewTab: "Open in New Tab",
      pdfHint: "Use the controls to zoom or open the PDF in a new tab for full multi-page browser navigation.",
      textTruncatedNotice: "Showing the first 256 KB of this text file for fast rendering. Download the file to view the full content.",
      copyTextContent: "Copy Text",
      textCopied: "Text content copied!",
      audioUnsupported: "Your browser does not support playing this audio format directly. Please download the file to play it.",
      videoUnsupported: "Your browser does not support playing this video format directly. Please download the file to watch it.",
      unsupportedTitle: "Live Preview Not Available for This File Type",
      unsupportedDescription:
        "For your security, DropLink does not execute binaries or render unsupported formats in the browser. You can download the file directly below.",
      notFoundTitle: "File Not Found or Deleted",
      notFoundDescription: "Check the link address, or the file owner may have permanently deleted this file.",
    },
  },
};

export const categoryOptions: { id: FileCategory | "all"; icon: string }[] = [
  { id: "all", icon: "" },
  { id: "image", icon: "image" },
  { id: "pdf", icon: "pdf" },
  { id: "audio", icon: "audio" },
  { id: "video", icon: "video" },
  { id: "document", icon: "document" },
  { id: "archive", icon: "archive" },
  { id: "other", icon: "other" },
];
