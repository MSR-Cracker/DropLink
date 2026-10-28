import { useEffect, useState } from "react";
import {
  Archive,
  ArrowDownToLine,
  ArrowUpDown,
  Check,
  Clipboard,
  Eye,
  FileAudio2,
  FileImage,
  FileText,
  FileVideo2,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FileCategory, Language, SortOption, StoredFile } from "./types";
import { copy } from "./copy";
import { copyToClipboard, formatBytes, shareOrCopyUrl } from "./UploadCard";

const categories: { id: FileCategory | "all"; ar: string; en: string }[] = [
  { id: "all", ar: "كل الأنواع", en: "All types" },
  { id: "image", ar: "الصور", en: "Images" },
  { id: "pdf", ar: "PDF", en: "PDF" },
  { id: "audio", ar: "الصوت", en: "Audio" },
  { id: "video", ar: "الفيديو", en: "Video" },
  { id: "document", ar: "المستندات والنصوص", en: "Documents & Text" },
  { id: "archive", ar: "ZIP وأرشيف", en: "Archives" },
  { id: "other", ar: "أخرى", en: "Other" },
];

const sortKeys: SortOption[] = [
  "newest",
  "oldest",
  "largest",
  "smallest",
  "name_asc",
  "name_desc",
];

function fileIcon(category: FileCategory) {
  if (category === "image") return FileImage;
  if (category === "audio") return FileAudio2;
  if (category === "video") return FileVideo2;
  if (category === "archive") return Archive;
  return FileText;
}

function urlFor(path: string) {
  return new URL(path, window.location.origin).toString();
}

export function MyFiles({ language }: { language: Language }) {
  const t = copy[language];
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FileCategory | "all">("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [offset, setOffset] = useState(0);
  const [loadedFiles, setLoadedFiles] = useState<StoredFile[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["uploads", search.trim(), category, sort, offset],
    queryFn: async () => {
      const params = new URLSearchParams({ sort, offset: String(offset) });
      if (search.trim()) params.set("search", search.trim());
      if (category !== "all") params.set("category", category);
      const response = await fetch(`/api/uploads?${params}`, { credentials: "include" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error?.message || t.genericError);
      return data as { files: StoredFile[]; hasMore: boolean; ownerType: string; deletionSupported: boolean };
    },
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const response = await fetch(`/api/uploads/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error?.message || t.genericError);
      return data as { id: string };
    },
    onSuccess: data => {
      setLoadedFiles(prev => prev.filter(item => item.id !== data.id));
      toast.success(t.deleteSuccess);
      void queryClient.invalidateQueries({ queryKey: ["uploads"] });
      setDeletingId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || t.genericError);
      setDeletingId(null);
    },
  });

  useEffect(() => {
    const page = query.data?.files;
    if (!page) return;
    setLoadedFiles(previous => {
      if (offset === 0) return page;
      const known = new Set(previous.map(file => file.id));
      return [...previous, ...page.filter(file => !known.has(file.id))];
    });
  }, [query.data, offset]);

  const files = offset === 0 ? (query.data?.files ?? loadedFiles) : loadedFiles;
  const deletionSupported = Boolean(query.data?.deletionSupported);

  const handleDelete = (file: StoredFile) => {
    if (!deletionSupported || deletingId) return;
    if (!window.confirm(`${t.deleteConfirm}\n\n${file.name}`)) return;
    setDeletingId(file.id);
    deleteMutation.mutate({ id: file.id });
  };

  return (
    <section className="files-section" id="my-files">
      <div className="files-panel">
        <div className="files-heading-row">
          <div className="files-title-wrap">
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              {language === "ar" ? "إدارة ملفاتك" : "Manage your files"}
            </span>
            <h2>{t.filesTitle}</h2>
            <p>{t.filesDescription}</p>
          </div>
          <div className="files-header-controls">
            <div className="view-toggle-group" role="group" aria-label="View mode">
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === "cards" ? "is-active" : ""}`}
                onClick={() => setViewMode("cards")}
                title={t.viewCards}
                aria-label={t.viewCards}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === "list" ? "is-active" : ""}`}
                onClick={() => setViewMode("list")}
                title={t.viewList}
                aria-label={t.viewList}
              >
                <List size={16} />
              </button>
            </div>
            <button
              type="button"
              className="button-soft refresh-button"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw size={16} className={query.isFetching ? "spin-icon" : ""} />
              {t.refresh}
            </button>
          </div>
        </div>

        <div className="file-management-notices">
          <div className="owner-notice">
            <ShieldCheck size={17} />
            <span>{query.data?.ownerType === "account" ? t.accountNotice : t.guestNotice}</span>
          </div>
          <div className={`deletion-notice ${deletionSupported ? "deletion-supported" : ""}`}>
            <span className="notice-mark">{deletionSupported ? "✓" : "!"}</span>
            <span>{deletionSupported ? t.deletionSupportedNotice : t.deletionNotice}</span>
          </div>
        </div>

        <div className="files-toolbar">
          <label className="search-control">
            <Search size={18} />
            <input
              value={search}
              onChange={event => {
                setSearch(event.target.value);
                setOffset(0);
                setLoadedFiles([]);
              }}
              placeholder={t.search}
              aria-label={t.search}
            />
          </label>
          <label className="filter-control">
            <span>{language === "ar" ? "النوع" : "Type"}</span>
            <select
              value={category}
              onChange={event => {
                setCategory(event.target.value as FileCategory | "all");
                setOffset(0);
                setLoadedFiles([]);
              }}
              aria-label={language === "ar" ? "فلتر نوع الملف" : "Filter file type"}
            >
              {categories.map(item => (
                <option key={item.id} value={item.id}>
                  {language === "ar" ? item.ar : item.en}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-control">
            <ArrowUpDown size={14} />
            <span>{t.sortLabel}</span>
            <select
              value={sort}
              onChange={event => {
                setSort(event.target.value as SortOption);
                setOffset(0);
                setLoadedFiles([]);
              }}
              aria-label={t.sortLabel}
            >
              {sortKeys.map(key => (
                <option key={key} value={key}>
                  {t.sortOptions[key]}
                </option>
              ))}
            </select>
          </label>
          <span className="file-count">{t.fileCount(files.length, query.data?.hasMore)}</span>
        </div>

        {query.isLoading && files.length === 0 ? (
          <div className="files-state">
            <span className="loader-ring" />
            {t.loading}
          </div>
        ) : query.error && files.length === 0 ? (
          <div className="files-state files-error">
            <p>{query.error.message.includes("Database") ? t.databaseMissing : t.genericError}</p>
            <button type="button" className="button-soft" onClick={() => void query.refetch()}>
              {t.retry}
            </button>
          </div>
        ) : files.length === 0 ? (
          <div className="files-state empty-state">
            <span className="empty-file-icon">
              <FileText size={27} />
            </span>
            <strong>{search || category !== "all" ? t.noFileYet : t.emptyFiles}</strong>
          </div>
        ) : (
          <>
            <div className={viewMode === "cards" ? "files-cards-grid" : "files-list"}>
              {files.map(file => {
                const Icon = fileIcon(file.category);
                const href = urlFor(file.url);
                const previewHref = file.previewUrl || `/preview/${file.id}`;
                const date = new Date(file.createdAt).toLocaleDateString(
                  language === "ar" ? "ar-EG" : "en-US",
                  { year: "numeric", month: "short", day: "numeric" }
                );
                const isDeleting = deletingId === file.id;

                if (viewMode === "cards") {
                  return (
                    <article className="file-card-item" key={file.id}>
                      <Link href={previewHref} className="file-card-media">
                        {file.category === "image" ? (
                          <img
                            className="file-card-thumb"
                            src={href}
                            alt={file.name}
                            loading="lazy"
                            onError={event => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="file-card-icon-large">
                            <Icon size={34} />
                          </span>
                        )}
                        <span className="file-category-tag">{file.category.toUpperCase()}</span>
                      </Link>
                      <div className="file-card-body">
                        <Link href={previewHref} className="file-card-title" title={file.name}>
                          {file.name}
                        </Link>
                        <div className="file-card-meta">
                          <span>{formatBytes(file.sizeBytes, language)}</span>
                          <i />
                          <span>{date}</span>
                        </div>
                        <div className="file-card-actions">
                          <Link
                            href={previewHref}
                            className="button-primary button-small file-preview-btn"
                          >
                            <Eye size={14} />
                            <span>{t.preview}</span>
                          </Link>
                          <a
                            className="file-action"
                            href={`${href}?download=1`}
                            download={file.name}
                            title={t.download}
                            aria-label={t.download}
                          >
                            <ArrowDownToLine size={16} />
                          </a>
                          <button
                            type="button"
                            className="file-action"
                            onClick={() =>
                              void copyToClipboard(href)
                                .then(() => toast.success(t.copied))
                                .catch(() => toast.error(t.genericError))
                            }
                            title={t.copyLink}
                            aria-label={t.copyLink}
                          >
                            <Clipboard size={16} />
                          </button>
                          <button
                            type="button"
                            className="file-action"
                            onClick={() =>
                              void shareOrCopyUrl(file.name, urlFor(previewHref), language)
                            }
                            title={t.shareFile}
                            aria-label={t.shareFile}
                          >
                            <Share2 size={16} />
                          </button>
                          {deletionSupported && (
                            <button
                              type="button"
                              className="file-action file-action-danger"
                              disabled={isDeleting}
                              onClick={() => handleDelete(file)}
                              title={t.deleteFile}
                              aria-label={t.deleteFile}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                }

                return (
                  <article className="file-row" key={file.id}>
                    {file.category === "image" ? (
                      <img
                        className="file-thumb"
                        src={href}
                        alt=""
                        loading="lazy"
                        onError={event => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="file-type-icon">
                        <Icon size={20} />
                      </span>
                    )}
                    <div className="file-main">
                      <Link href={previewHref} className="file-row-title-link" title={file.name}>
                        <strong>{file.name}</strong>
                      </Link>
                      <span>
                        {formatBytes(file.sizeBytes, language)} <i /> {date} <i />{" "}
                        {file.contentType}
                      </span>
                    </div>
                    <div className="file-actions">
                      <Link
                        className="button-primary button-small"
                        href={previewHref}
                        title={t.preview}
                      >
                        <Eye size={15} />
                        <span>{t.preview}</span>
                      </Link>
                      <a
                        className="file-action"
                        href={`${href}?download=1`}
                        download={file.name}
                        title={t.download}
                        aria-label={t.download}
                      >
                        <ArrowDownToLine size={17} />
                      </a>
                      <button
                        type="button"
                        className="file-action"
                        onClick={() =>
                          void copyToClipboard(href)
                            .then(() => toast.success(t.copied))
                            .catch(() => toast.error(t.genericError))
                        }
                        title={t.copyLink}
                        aria-label={t.copyLink}
                      >
                        <Clipboard size={17} />
                      </button>
                      <button
                        type="button"
                        className="file-action"
                        onClick={() =>
                          void shareOrCopyUrl(file.name, urlFor(previewHref), language)
                        }
                        title={t.shareFile}
                        aria-label={t.shareFile}
                      >
                        <Share2 size={17} />
                      </button>
                      {deletionSupported && (
                        <button
                          type="button"
                          className="file-action file-action-danger"
                          disabled={isDeleting}
                          onClick={() => handleDelete(file)}
                          title={t.deleteFile}
                          aria-label={t.deleteFile}
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {query.error && (
              <div className="pagination-error">
                <span>
                  {query.error.message.includes("Database") ? t.databaseMissing : t.genericError}
                </span>
                <button
                  type="button"
                  className="button-soft"
                  onClick={() => void query.refetch()}
                >
                  {t.retry}
                </button>
              </div>
            )}
            {query.data?.hasMore && (
              <div className="load-more-row">
                <button
                  type="button"
                  className="button-soft"
                  disabled={query.isFetching}
                  onClick={() => setOffset(files.length)}
                >
                  {query.isFetching ? t.loadingMore : t.loadMore}
                </button>
              </div>
            )}
          </>
        )}
        <div className="files-footnote">
          <Check size={15} />
          {t.shareHint}
        </div>
      </div>
    </section>
  );
}
