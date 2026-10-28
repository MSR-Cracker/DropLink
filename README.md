# DropLink — منصة مشاركة ومعاينة الملفات عبر روابط مباشرة

تم تطوير وتحديث هذا المشروع بواسطة **[MSR_Coder](https://msr-coder.pages.dev)**.

**DropLink** هو تطبيق ويب Full-Stack احترافي لرفع الملفات ومشاركتها عبر روابط مباشرة وسريعة، مع نظام معاينة مدمج وآمن داخل المتصفح، ودعم كامل للغتين العربية (RTL) والإنجليزية (LTR)، والوضعين الفاتح والداكن.

---

## الميزات الرئيسية

- **هوية مستقلة واحترافية**: يعمل بشكل مستقل تمامًا عن أي منصات خارجية مقيدة، مع هوية المطور الرسمية **MSR_Coder** (`https://msr-coder.pages.dev`).
- **نظام رفع ملفات متطور**:
  - سحب وإفلات (Drag & Drop) أو اختيار ملفات متعددة.
  - عرض اسم كل ملف، نوعه، وحجمه، مع شريط تقدم مستقل لكل ملف في الوقت الفعلي.
  - التحقق الصارم من حجم الملف وامتداده على الواجهة الأمامية والخادم (حظر الملفات التنفيذية والبرمجية الخطرة مثل `.exe`, `.bat`, `.sh`, `.php`, `.html`).
  - عدم إظهار أي رسالة نجاح إلا بعد تأكيد الحفظ الفعلي في خدمة التخزين وقاعدة البيانات.
- **نظام معاينة الملفات المتكامل (`/preview/:id`)**:
  - **الصور** (`PNG`, `JPEG`, `WebP`, `GIF`, `AVIF`): معاينة عالية الدقة مع أدوات التكبير والتصغير والعرض بملء الشاشة (Lightbox).
  - **ملفات PDF**: عارض PDF مدمج مع أزرار التنقل بين الصفحات، التحكم في التكبير/التصغير، والفتح في تبويب مستقل أو التنزيل.
  - **الملفات النصية والبيانات** (`TXT`, `JSON`, `CSV`, `LOG`, `MD`, `XML`, `YAML`): معاينة آمنة ومعزولة بدون تنفيذ أي شيفرات HTML/JS، مع تنسيق تلقائي لملفات JSON وعرض جدولي لملفات CSV.
  - **الملفات الصوتية** (`MP3`, `WAV`, `OGG`, `AAC`): مشغل صوتي قياسي يدعم التقديم والتأخير (HTTP Range Requests).
  - **ملفات الفيديو** (`MP4`, `WebM`, `OGG`): مشغل فيديو HTML5 قياسي متجاوب.
  - **الملفات غير المدعومة للمعاينة** (`ZIP`, `RAR`, المستندات المكتبية): عرض بطاقة واضحة تتضمن أيقونة الملف واسمه وحجمه مع زر تنزيل مباشر.
- **إدارة الملفات («ملفاتي»)**:
  - التبديل بين عرض البطاقات (Cards) وعرض القائمة (List).
  - البحث الفوري بالاسم، التصفية حسب نوع الملف، والترتيب حسب (الأحدث، الأقدم، الأكبر حجمًا، الأصغر حجمًا، والاسم أبجديًا).
  - التحميل التدريجي (Pagination) والحذف الفعلي الآمن من التخزين وقاعدة البيانات.
- **الصفحات التعريفية والقانونية**:
  - الصفحة الرئيسية (`/`)
  - صفحة معاينة الملف (`/preview/:id`)
  - صفحة من نحن (`/about`)
  - صفحة سياسة الخصوصية (`/privacy`)
  - صفحة شروط الاستخدام (`/terms`)
  - صفحة الأسئلة الشائعة (`/faq`)
  - صفحة التواصل والدعم (`/contact`)
  - صفحة الخطأ 404 (`/404`)

---

## المتطلبات التقنية وتشغيل المشروع

### 1. تثبيت الاعتمادات

```bash
pnpm install
# أو باستخدام npm:
npm install
```

### 2. إعداد متغيرات البيئة

انسخ ملف `.env.example` إلى `.env`:

```bash
cp .env.example .env
```

بشكل افتراضي، يعمل المشروع فورًا بدون الحاجة إلى إعدادات خارجية معقدة باستخدام:
- `DROPLINK_STORAGE_DRIVER=local` (تخزين الملفات محليًا داخل `./storage_data/files`)
- `DROPLINK_DB_DRIVER=local` (حفظ البيانات الوصفية داخل `./storage_data/droplink_db.json`)

إذا أردت ربط قاعدة بيانات **MySQL / MariaDB / TiDB** أو تخزين سحابي **AWS S3 / Cloudflare R2 / MinIO** في بيئة الإنتاج:
1. عيّن `JWT_SECRET` بقيمة عشوائية قوية.
2. لقاعدة بيانات MySQL: عيّن `DROPLINK_DB_DRIVER=mysql` و`DATABASE_URL=mysql://user:pass@host:3306/dbname` ثم نفّذ `pnpm db:migrate`.
3. لتخزين S3: عيّن `DROPLINK_STORAGE_DRIVER=s3` مع متغيرات `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_REGION`.

### 3. التشغيل في بيئة التطوير

```bash
pnpm dev
```

### 4. البناء والتشغيل الإنتاجي

```bash
pnpm build
pnpm start
```

### 5. فحص الأنواع والاختبارات

```bash
pnpm check
pnpm test
```

---

## المطور والدعم الفني

- **اسم المطور**: MSR_Coder
- **الصفحة الرسمية للمطور والدعم الفني**: [https://msr-coder.pages.dev](https://msr-coder.pages.dev)


## Production deployment with Cloudflare R2

**R2 is object storage, not an application host or a database.** This project currently runs an Express/Node.js server plus a React/Vite frontend. Deploy the app to a Node-compatible host (or port the server endpoints to Cloudflare Workers before using Workers/Pages Functions), use Cloudflare R2 for file objects, and use a persistent MySQL-compatible database such as a managed MySQL/MariaDB/TiDB service for file metadata. Do not use the local JSON database or local disk storage for a multi-instance/serverless production deployment.

Configure these environment variables in the application host's secret settings:

```env
NODE_ENV=production
JWT_SECRET=<long-random-secret>
DROPLINK_DB_DRIVER=mysql
DATABASE_URL=<managed-mysql-connection-string>
DROPLINK_STORAGE_DRIVER=s3
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=<R2_BUCKET_NAME>
S3_ACCESS_KEY_ID=<R2_ACCESS_KEY_ID>
S3_SECRET_ACCESS_KEY=<R2_SECRET_ACCESS_KEY>
S3_PUBLIC_BASE_URL=
DROPLINK_MAX_FILE_SIZE_BYTES=52428800
```

Create an R2 bucket and an R2 API token with only the permissions this app needs. Use the S3 API endpoint for the account, not the public `r2.dev` URL. Keep the bucket private and leave `S3_PUBLIC_BASE_URL` empty to use signed links unless you intentionally configure a public custom domain. Never commit real secrets to Git or include them in client-side environment variables.

The existing Express application is **not deployable to R2 itself**. If the target is Cloudflare Pages/Workers, the backend needs a Workers-compatible implementation and the metadata database needs a supported service (for example D1 after adapting the schema/queries, or an external MySQL-compatible database). The current MySQL/Express code should be hosted on a Node-compatible runtime until that port is completed.

Before launch, configure the production domain and HTTPS, use a strong `JWT_SECRET`, verify database migrations, test upload/preview/download/delete end-to-end, and review the privacy/terms pages to reflect your real retention and support policies.


## Cloudflare-only deployment

For the guest-only Cloudflare Workers + D1 + R2 deployment profile, follow [`CLOUDFLARE.md`](./CLOUDFLARE.md). This is a separate runtime from the legacy Express/MySQL server.
