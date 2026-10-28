import { useCallback, useRef, useState } from "react";
import {
  Archive,
  ArrowDownToLine,
  Check,
  Clipboard,
  ExternalLink,
  Eye,
  FileAudio2,
  FileImage,
  FileText,
  FileVideo2,
  RotateCcw,
  Share2,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import type { Language, UploadConfig } from "./types";
import { copy } from "./copy";

type UploadResult = {
  id: string;
  name: string;
  category: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  url: string;
  previewUrl?: string;
};
type TaskState = "queued" | "preparing" | "uploading" | "storing" | "done" | "error" | "cancelled";
type UploadTask = {
  taskId: string;
  file: File;
  status: TaskState;
  progress: number;
  result?: UploadResult;
  error?: string;
};

const CLIENT_BLOCKED_EXTENSIONS = new Set([
  "exe", "msi", "bat", "cmd", "com", "scr", "pif", "vbs", "vbe", "js", "jse", "ws", "wsf",
  "wsc", "wsh", "ps1", "psm1", "sh", "bash", "csh", "ksh", "dll", "sys", "drv", "bin",
  "apk", "ipa", "jar", "app", "dmg", "pkg", "deb", "rpm", "hta", "cpl", "msc", "reg",
  "html", "htm", "xhtml", "shtml", "svg", "php", "phtml", "asp", "aspx", "jsp", "jspx", "cgi", "pl", "py", "rb",
]);

export function formatBytes(bytes: number, language: Language) {
  if (bytes < 1024) return `${bytes} B`;
  const units = language === "ar" ? ["ك.ب", "م.ب", "ج.ب"] : ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", {
    maximumFractionDigits: 1,
  }).format(value)} ${units[index]}`;
}

export async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const field = document.createElement("textarea");
  field.value = value;
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Clipboard copy failed");
}

export async function shareOrCopyUrl(title: string, url: string, language: Language) {
  const t = copy[language];
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url });
      toast.success(t.shareSuccess);
      return;
    } catch (err: any) {
      if (err?.name === "AbortError") return;
    }
  }
  await copyToClipboard(url);
  toast.success(t.copied);
}

function directUrl(path: string) {
  return new URL(path, window.location.origin).toString();
}

function getFileTypeBadge(file: File): string {
  const ext = file.name.includes(".") ? file.name.split(".").pop()?.toUpperCase() : "";
  if (file.type && ext) return `${ext} · ${file.type}`;
  if (ext) return ext;
  if (file.type) return file.type;
  return "BINARY";
}

export function UploadCard({
  language,
  config,
  onUploaded,
}: {
  language: Language;
  config?: UploadConfig;
  onUploaded: () => void;
}) {
  const t = copy[language];
  const inputRef = useRef<HTMLInputElement>(null);
  const requests = useRef(new Map<string, XMLHttpRequest>());
  const tasksRef = useRef<UploadTask[]>([]);
  const workerRef = useRef(false);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [dragging, setDragging] = useState(false);

  const commitTasks = (next: UploadTask[]) => {
    tasksRef.current = next;
    setTasks(next);
  };
  const patchTask = useCallback((taskId: string, patch: Partial<UploadTask>) => {
    commitTasks(
      tasksRef.current.map(task => (task.taskId === taskId ? { ...task, ...patch } : task))
    );
  }, []);

  const processQueue = useCallback(async () => {
    if (workerRef.current) return;
    workerRef.current = true;
    try {
      while (true) {
        const task = tasksRef.current.find(item => item.status === "queued");
        if (!task) break;

        const maxBytes = config?.maxFileSizeBytes ?? 50 * 1024 * 1024;
        const ext = task.file.name.includes(".")
          ? task.file.name.split(".").pop()?.toLowerCase() ?? ""
          : "";
        const blockedSet = config?.blockedExtensions
          ? new Set(config.blockedExtensions)
          : CLIENT_BLOCKED_EXTENSIONS;

        if (task.file.size <= 0) {
          patchTask(task.taskId, { status: "error", error: t.invalidFile });
          continue;
        }
        if (ext && blockedSet.has(ext)) {
          patchTask(task.taskId, {
            status: "error",
            error: t.unsupportedFileType(ext),
          });
          continue;
        }
        if (task.file.size > maxBytes) {
          patchTask(task.taskId, {
            status: "error",
            error: t.tooLarge(task.file.name, formatBytes(maxBytes, language)),
          });
          continue;
        }

        patchTask(task.taskId, { status: "preparing", progress: 0, error: undefined });
        try {
          const prepareResponse = await fetch("/api/uploads/prepare", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: task.file.name,
              size: task.file.size,
              type: task.file.type,
            }),
          });
          const prepared = await prepareResponse.json().catch(() => null);
          if (!prepareResponse.ok || !prepared?.ticket || !prepared?.id) {
            const code = prepared?.error?.code;
            if (code === "STORAGE_NOT_CONFIGURED") throw new Error(t.storageMissing);
            if (code === "DATABASE_NOT_CONFIGURED") throw new Error(t.databaseMissing);
            if (code === "FILE_TOO_LARGE") {
              throw new Error(t.tooLarge(task.file.name, formatBytes(maxBytes, language)));
            }
            if (code === "UNSUPPORTED_FILE_TYPE") {
              throw new Error(t.unsupportedFileType(ext || "unknown"));
            }
            throw new Error(prepared?.error?.message || t.uploadFailed);
          }
          if (tasksRef.current.find(item => item.taskId === task.taskId)?.status === "cancelled") {
            continue;
          }

          const outcome = await new Promise<{ result?: UploadResult; error?: Error }>(resolve => {
            const xhr = new XMLHttpRequest();
            requests.current.set(task.taskId, xhr);
            xhr.open("PUT", `/api/uploads/${encodeURIComponent(prepared.id)}/content`);
            xhr.withCredentials = true;
            xhr.setRequestHeader("X-Upload-Ticket", prepared.ticket);
            xhr.setRequestHeader("Content-Type", "application/octet-stream");
            xhr.upload.onprogress = event => {
              if (!event.lengthComputable) return;
              const progress = Math.min(99, Math.floor((event.loaded / event.total) * 99));
              patchTask(task.taskId, {
                status: event.loaded >= event.total ? "storing" : "uploading",
                progress,
              });
            };
            xhr.onload = () => {
              requests.current.delete(task.taskId);
              try {
                const data = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300 && data?.id && data?.url) {
                  resolve({ result: data as UploadResult });
                } else {
                  const code = data?.error?.code;
                  const message =
                    code === "STORAGE_NOT_CONFIGURED"
                      ? t.storageMissing
                      : code === "DATABASE_NOT_CONFIGURED"
                        ? t.databaseMissing
                        : data?.error?.message || t.uploadFailed;
                  resolve({ error: new Error(message) });
                }
              } catch {
                resolve({ error: new Error(t.uploadFailed) });
              }
            };
            xhr.onerror = () => {
              requests.current.delete(task.taskId);
              resolve({ error: new Error(t.networkError) });
            };
            xhr.onabort = () => {
              requests.current.delete(task.taskId);
              resolve({ error: new Error(t.cancelUpload) });
            };
            patchTask(task.taskId, { status: "uploading", progress: 0 });
            xhr.send(task.file);
          });

          if (outcome.result) {
            patchTask(task.taskId, { status: "done", progress: 100, result: outcome.result });
            toast.success(t.uploadSuccess);
            onUploaded();
          } else if (
            tasksRef.current.find(item => item.taskId === task.taskId)?.status === "cancelled"
          ) {
            patchTask(task.taskId, { status: "cancelled", error: t.cancelUpload });
          } else {
            patchTask(task.taskId, {
              status: "error",
              error: outcome.error?.message || t.uploadFailed,
            });
            toast.error(outcome.error?.message || t.uploadFailed);
            onUploaded();
          }
        } catch (error) {
          const message =
            error instanceof TypeError
              ? t.networkError
              : error instanceof Error
                ? error.message
                : t.genericError;
          patchTask(task.taskId, { status: "error", error: message });
          toast.error(message);
        }
      }
    } finally {
      workerRef.current = false;
    }
  }, [config?.blockedExtensions, config?.maxFileSizeBytes, language, onUploaded, patchTask, t]);

  const enqueue = useCallback(
    (fileList: FileList | File[]) => {
      const next = Array.from(fileList).map(file => ({
        taskId: crypto.randomUUID(),
        file,
        status: "queued" as const,
        progress: 0,
      }));
      if (!next.length) return;
      commitTasks([...tasksRef.current, ...next]);
      void processQueue();
    },
    [processQueue]
  );

  const retryTask = (taskId: string) => {
    patchTask(taskId, { status: "queued", progress: 0, error: undefined });
    void processQueue();
  };

  const removeTask = (taskId: string) => {
    commitTasks(tasksRef.current.filter(item => item.taskId !== taskId));
  };

  const cancel = (task: UploadTask) => {
    if (task.status === "uploading" || task.status === "storing") {
      requests.current.get(task.taskId)?.abort();
    }
    patchTask(task.taskId, { status: "cancelled", error: t.cancelUpload });
    toast.message(t.cancelUpload);
  };

  const statusLabel = (task: UploadTask) =>
    task.status === "queued"
      ? language === "ar"
        ? "في قائمة الانتظار"
        : "Queued"
      : task.status === "preparing"
        ? t.preparing
        : task.status === "uploading"
          ? `${t.uploading} · ${task.progress}%`
          : task.status === "storing"
            ? t.storing
            : task.status === "done"
              ? t.uploaded
              : task.status === "cancelled"
                ? t.cancelUpload
                : t.notUploaded;

  return (
    <section className="upload-section" id="upload">
      <div
        className="upload-card"
        onDragEnter={event => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={event => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={event => {
          event.preventDefault();
          setDragging(false);
          enqueue(event.dataTransfer.files);
        }}
      >
        <div className="upload-heading">
          <span className="upload-heading-icon">
            <UploadCloud size={24} strokeWidth={1.8} />
          </span>
          <div>
            <h2>{t.uploadTitle}</h2>
            <p>{t.uploadSubtitle}</p>
          </div>
        </div>
        <button
          type="button"
          className={`drop-zone ${dragging ? "drop-zone-active" : ""}`}
          onClick={() => inputRef.current?.click()}
          onKeyDown={event => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          aria-label={t.dropFiles}
        >
          <span className="drop-icon">
            <UploadCloud size={30} strokeWidth={1.7} />
          </span>
          <strong>{t.dropFiles}</strong>
          <span>{t.dropHint}</span>
          <span className="button-primary upload-pick">
            <UploadCloud size={17} />
            {t.chooseFiles}
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={event => {
            if (event.currentTarget.files) enqueue(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        <div className="upload-meta" dir={language === "ar" ? "rtl" : "ltr"}>
          <span className="upload-limit">
            <span className="meta-dot" />
            {config
              ? t.maxSize(formatBytes(config.maxFileSizeBytes, language))
              : language === "ar"
                ? "جاري تحميل إعدادات الرفع…"
                : "Loading upload limit…"}
          </span>
          <span className="upload-types">{t.supported}</span>
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="upload-queue" aria-live="polite">
          <div className="queue-heading">
            <strong>{language === "ar" ? "قائمة وحالة الرفع" : "Upload Queue & Progress"}</strong>
            <div className="queue-heading-right">
              <span>
                {tasks.filter(item => item.status === "done").length}/{tasks.length}
              </span>
              {tasks.some(item => ["done", "error", "cancelled"].includes(item.status)) && (
                <button
                  type="button"
                  className="button-soft button-small"
                  onClick={() =>
                    commitTasks(
                      tasksRef.current.filter(
                        item => !["done", "error", "cancelled"].includes(item.status)
                      )
                    )
                  }
                >
                  <Trash2 size={14} />
                  {t.clearCompleted}
                </button>
              )}
            </div>
          </div>
          <div className="queue-list">
            {tasks.map(task => {
              const Icon = task.file.type.startsWith("image/")
                ? FileImage
                : task.file.type.startsWith("audio/")
                  ? FileAudio2
                  : task.file.type.startsWith("video/")
                    ? FileVideo2
                    : ["zip", "rar", "7z"].some(ext =>
                          task.file.name.toLowerCase().endsWith(`.${ext}`)
                        )
                      ? Archive
                      : FileText;
              const previewPath = task.result?.previewUrl || (task.result ? `/preview/${task.result.id}` : "");
              return (
                <article className="queue-item" key={task.taskId}>
                  <span className="queue-file-icon">
                    <Icon size={19} />
                  </span>
                  <div className="queue-info">
                    <div className="queue-file-row">
                      <strong title={task.file.name}>{task.file.name}</strong>
                      <div className="queue-file-badges">
                        <span className="file-type-pill">{getFileTypeBadge(task.file)}</span>
                        <span>{formatBytes(task.file.size, language)}</span>
                      </div>
                    </div>
                    <div className="queue-status-row">
                      <span
                        className={
                          task.status === "error"
                            ? "status-error"
                            : task.status === "done"
                              ? "status-done"
                              : ""
                        }
                      >
                        {statusLabel(task)}
                      </span>
                      {task.error && (task.status === "error" || task.status === "cancelled") && (
                        <small>{task.error}</small>
                      )}
                    </div>
                    {["uploading", "storing"].includes(task.status) && (
                      <div className="progress-track">
                        <span style={{ width: `${Math.max(4, task.progress)}%` }} />
                      </div>
                    )}
                    {task.result && (
                      <div className="upload-result">
                        <p className="result-success">
                          <Check size={16} />
                          {t.uploadSuccess}
                        </p>
                        <label className="result-url-wrap">
                          <span>{language === "ar" ? "الرابط المباشر" : "Direct URL"}</span>
                          <input
                            readOnly
                            value={directUrl(task.result.url)}
                            dir="ltr"
                            onFocus={event => event.currentTarget.select()}
                          />
                        </label>
                        <div className="result-actions">
                          <Link
                            className="button-primary button-small"
                            href={previewPath}
                          >
                            <Eye size={15} />
                            {t.preview}
                          </Link>
                          <button
                            type="button"
                            className="button-soft button-small"
                            onClick={() =>
                              void copyToClipboard(directUrl(task.result!.url))
                                .then(() => toast.success(t.copied))
                                .catch(() => toast.error(t.genericError))
                            }
                          >
                            <Clipboard size={15} />
                            {t.copyLink}
                          </button>
                          <button
                            type="button"
                            className="button-soft button-small"
                            onClick={() =>
                              void shareOrCopyUrl(
                                task.result!.name,
                                directUrl(previewPath),
                                language
                              )
                            }
                          >
                            <Share2 size={15} />
                            {t.shareFile}
                          </button>
                          <a
                            className="button-soft button-small"
                            href={directUrl(task.result.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink size={15} />
                            {t.openDirect}
                          </a>
                          <a
                            className="button-soft button-small"
                            href={`${directUrl(task.result.url)}?download=1`}
                            download={task.result.name}
                          >
                            <ArrowDownToLine size={15} />
                            {t.download}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                  {["queued", "preparing", "uploading", "storing"].includes(task.status) ? (
                    <button
                      type="button"
                      className="queue-action"
                      aria-label={t.cancel}
                      title={t.cancel}
                      onClick={() => cancel(task)}
                    >
                      <X size={17} />
                    </button>
                  ) : (
                    <div className="queue-end-actions">
                      {(task.status === "error" || task.status === "cancelled") && (
                        <button
                          type="button"
                          className="queue-action"
                          title={t.retry}
                          aria-label={t.retry}
                          onClick={() => retryTask(task.taskId)}
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="queue-action"
                        title={t.remove}
                        aria-label={t.remove}
                        onClick={() => removeTask(task.taskId)}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
