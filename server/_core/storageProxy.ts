import fs from "node:fs";
import type { Express, Request, Response } from "express";
import { ENV } from "./env";
import { getLocalFilePath, normalizeKey, storageGetSignedUrl } from "../storage";
import * as db from "../db";

const SAFE_INLINE_TYPES = new Set([
  "image/avif", "image/gif", "image/jpeg", "image/png", "image/webp",
  "application/pdf",
  "audio/aac", "audio/flac", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/webm",
  "video/mp4", "video/ogg", "video/webm", "video/quicktime",
  "text/plain", "application/json", "text/csv",
]);

function encodeContentDispositionFilename(name: string): string {
  const sanitized = name.replace(/[\r\n"\\]/g, "_");
  const encoded = encodeURIComponent(name);
  return `filename="${sanitized}"; filename*=UTF-8''${encoded}`;
}

async function handleStorageRequest(req: Request, res: Response) {
  const rawKey = (req.params as Record<string, string>)[0] ?? "";
  let key: string;
  try {
    key = normalizeKey(rawKey);
  } catch {
    res.status(400).send("Invalid storage key");
    return;
  }

  // Apply strict security headers so uploaded files can never execute JavaScript or HTML in the origin context
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; img-src 'self' data: blob:; media-src 'self' data: blob:; style-src 'unsafe-inline'; sandbox"
  );
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

  const forceDownload = req.query.download === "1" || req.query.download === "true";

  // Look up metadata if available so we can serve accurate Content-Type and original filename
  const record = await db.getUploadByObjectKey(key).catch(() => undefined);
  const rawType = record?.contentType || "application/octet-stream";
  const safeContentType = SAFE_INLINE_TYPES.has(rawType)
    ? (rawType.startsWith("text/") || rawType === "application/json" ? `${rawType}; charset=utf-8` : rawType)
    : "application/octet-stream";

  const dispositionType = !forceDownload && SAFE_INLINE_TYPES.has(rawType) ? "inline" : "attachment";
  const filenamePart = record?.originalName
    ? `; ${encodeContentDispositionFilename(record.originalName)}`
    : "";

  if (ENV.storageDriver === "local") {
    try {
      const filePath = getLocalFilePath(key);
      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile()) {
        res.status(404).send("File not found");
        return;
      }

      res.setHeader("Content-Type", safeContentType);
      res.setHeader("Content-Disposition", `${dispositionType}${filenamePart}`);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "public, max-age=3600");

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        if (!Number.isNaN(start) && !Number.isNaN(end) && start >= 0 && end < stat.size && start <= end) {
          res.status(206);
          res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
          res.setHeader("Content-Length", String(end - start + 1));
          fs.createReadStream(filePath, { start, end }).pipe(res);
          return;
        }
      }

      res.setHeader("Content-Length", String(stat.size));
      fs.createReadStream(filePath).pipe(res);
      return;
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        res.status(404).send("File not found");
        return;
      }
      console.error("[StorageProxy] Local file error:", error);
      res.status(500).send("Storage read error");
      return;
    }
  }

  try {
    const signedUrl = await storageGetSignedUrl(key);
    res.set("Cache-Control", "no-store");
    res.redirect(307, signedUrl);
  } catch (err) {
    console.error("[StorageProxy] Remote/S3 error:", err);
    res.status(502).send("Storage proxy error");
  }
}

export function registerStorageProxy(app: Express) {
  app.get("/dl-storage/*", handleStorageRequest);
  // Backward compatibility for existing links stored with /manus-storage/*
  app.get("/manus-storage/*", handleStorageRequest);
}
