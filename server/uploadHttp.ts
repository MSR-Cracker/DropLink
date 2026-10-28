import fs from "node:fs";
import { Router, type Request, type Response } from "express";
import { parse } from "cookie";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import * as db from "./db";
import {
  getLocalFilePath,
  isDeletionSupported,
  isStorageReady,
  PUBLIC_STORAGE_PREFIX,
  storageGetSignedUrl,
  storagePutStream,
} from "./storage";
import {
  accountOwner,
  BLOCKED_EXTENSIONS,
  checkRateLimit,
  ensureGuestOwner,
  getMaxUploadBytes,
  guestOwnerFromToken,
  guestTokenFromRequest,
  isBlockedFilename,
  newUploadId,
  sanitizeFilename,
  signUploadTicket,
  verifyUploadTicket,
  type UploadTicket,
} from "./uploadSecurity";
import type { User } from "../drizzle/schema";

const router = Router();

const INLINE_TYPES = new Set([
  "image/avif", "image/gif", "image/jpeg", "image/png", "image/webp",
  "application/pdf",
  "audio/aac", "audio/flac", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/webm",
  "video/mp4", "video/ogg", "video/webm", "video/quicktime",
  "text/plain", "application/json", "text/csv",
]);

const TEXT_EXTENSIONS = new Set(["txt", "json", "csv", "log", "md", "xml", "yml", "yaml", "ini", "conf"]);

function jsonError(res: Response, status: number, code: string, message: string) {
  if (!res.headersSent) res.status(status).json({ error: { code, message } });
}

export function getNormalizedType(raw: unknown, filename: string) {
  const candidate = typeof raw === "string" ? raw.split(";")[0].trim().toLowerCase() : "";
  const syntacticallyValid = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(candidate);
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const knownByExtension: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", avif: "image/avif",
    pdf: "application/pdf",
    mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav", flac: "audio/flac", ogg: "audio/ogg",
    mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm",
    txt: "text/plain", log: "text/plain", md: "text/plain", ini: "text/plain", conf: "text/plain",
    yml: "text/plain", yaml: "text/plain", xml: "text/plain",
    json: "application/json",
    csv: "text/csv",
  };
  const inferred = knownByExtension[extension];
  if (inferred && (TEXT_EXTENSIONS.has(extension) || !candidate || candidate === "application/octet-stream")) {
    return inferred;
  }
  const supplied = syntacticallyValid ? candidate : "";
  if (supplied && INLINE_TYPES.has(supplied)) return supplied;
  if (inferred && INLINE_TYPES.has(inferred)) return inferred;
  return "application/octet-stream";
}

export function getCategory(type: string, filename: string): UploadTicket["category"] {
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("video/")) return "video";
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(extension)) return "archive";
  if (
    type === "text/plain" ||
    type === "application/json" ||
    type === "text/csv" ||
    ["doc", "docx", "odt", "rtf", "txt", "md", "csv", "json", "log", "xml", "yml", "yaml", "xls", "xlsx", "ods", "ppt", "pptx", "odp"].includes(extension)
  ) {
    return "document";
  }
  return "other";
}

export function isTextPreviewable(contentType: string, filename: string): boolean {
  if (contentType === "text/plain" || contentType === "application/json" || contentType === "text/csv") {
    return true;
  }
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return TEXT_EXTENSIONS.has(ext);
}

async function optionalUser(req: Request): Promise<User | null> {
  let hasSession = false;
  try {
    const cookies = parse(req.headers.cookie ?? "");
    hasSession = Boolean(cookies.webdev_app_session || req.headers.authorization?.startsWith("Bearer "));
  } catch {
    return null;
  }
  if (!hasSession) return null;
  try {
    return await sdk.authenticateRequest(req);
  } catch {
    return null;
  }
}

async function ownerFor(req: Request, res: Response, user: User | null) {
  return user ? accountOwner(user) : ensureGuestOwner(req, res);
}

function ticketFromRequest(req: Request) {
  const value = req.headers["x-upload-ticket"];
  return typeof value === "string" ? verifyUploadTicket(value) : null;
}

function clientIp(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) return xff.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
}

router.get("/config", (_req, res) => {
  try {
    res.json({
      maxFileSizeBytes: getMaxUploadBytes(),
      deletionSupported: isDeletionSupported(),
      storageReady: isStorageReady(),
      databaseReady: db.isDatabaseReady(),
      storageDriver: ENV.storageDriver,
      blockedExtensions: Array.from(BLOCKED_EXTENSIONS),
      loginConfigured: Boolean(ENV.appId && ENV.oAuthPortalUrl),
    });
  } catch {
    jsonError(res, 503, "UPLOAD_CONFIG_INVALID", "Upload size configuration is invalid.");
  }
});

router.post("/prepare", async (req, res) => {
  try {
    const ip = clientIp(req);
    if (!checkRateLimit(`prepare:${ip}`, 60, 60_000)) {
      return jsonError(res, 429, "RATE_LIMITED", "Too many upload requests. Please wait a moment and try again.");
    }

    if (!req.is("application/json")) return jsonError(res, 415, "JSON_REQUIRED", "Upload setup requires JSON.");
    const originalName = sanitizeFilename(req.body?.name);
    const sizeBytes = req.body?.size;
    const maxBytes = getMaxUploadBytes();
    if (!originalName) return jsonError(res, 400, "INVALID_FILENAME", "Choose a valid file name.");

    const blockedCheck = isBlockedFilename(originalName);
    if (blockedCheck.blocked) {
      return jsonError(
        res,
        415,
        "UNSUPPORTED_FILE_TYPE",
        `Files of type .${blockedCheck.extension} are not allowed for security reasons.`
      );
    }

    if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
      return jsonError(res, 400, "INVALID_SIZE", "File size must be greater than 0 bytes.");
    }
    if (sizeBytes > maxBytes) {
      return jsonError(res, 413, "FILE_TOO_LARGE", `This file exceeds the ${maxBytes}-byte upload limit.`);
    }

    const user = await optionalUser(req);
    const owner = await ownerFor(req, res, user);
    if (!ENV.cookieSecret) return jsonError(res, 503, "UPLOAD_SIGNING_UNAVAILABLE", "Secure upload configuration is unavailable.");
    if (!isStorageReady()) return jsonError(res, 503, "STORAGE_NOT_CONFIGURED", "File storage is not configured.");
    if (!db.isDatabaseReady()) return jsonError(res, 503, "DATABASE_NOT_CONFIGURED", "Persistent file records are not configured.");

    const id = newUploadId();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const safeType = getNormalizedType(req.body?.type, originalName);
    const ticket: UploadTicket = {
      id,
      ownerHash: owner.ownerHash,
      ownerType: owner.ownerType,
      originalName,
      category: getCategory(safeType, originalName),
      contentType: safeType,
      sizeBytes,
      objectKey: `droplink/${id}`,
      expiresAt: expiresAt.getTime(),
    };

    await db.createUploadIntent({ id, ownerHash: owner.ownerHash, expiresAt });
    res.status(201).json({ id, ticket: signUploadTicket(ticket), expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error("[DropLink] Could not prepare upload:", error instanceof Error ? error.message : "unknown error");
    jsonError(res, 503, "UPLOAD_PREPARE_FAILED", "Could not prepare this upload. Check the server/database configuration and try again.");
  }
});

router.put("/:id/content", async (req, res) => {
  const ticket = ticketFromRequest(req);
  if (!ticket || ticket.id !== req.params.id) {
    req.resume();
    return jsonError(res, 401, "UPLOAD_TICKET_INVALID", "This upload session is invalid or expired. Please start again.");
  }

  let intentClaimed = false;
  const abortController = new AbortController();
  req.once("aborted", () => abortController.abort());
  try {
    const contentLength = req.headers["content-length"];
    if (typeof contentLength !== "string" || !/^\d+$/.test(contentLength) || Number(contentLength) !== ticket.sizeBytes) {
      req.resume();
      return jsonError(res, 400, "UPLOAD_LENGTH_MISMATCH", "The uploaded bytes do not match the selected file size.");
    }
    if (ticket.sizeBytes > getMaxUploadBytes()) {
      req.resume();
      return jsonError(res, 413, "FILE_TOO_LARGE", "This file exceeds the current upload limit.");
    }

    const user = await optionalUser(req);
    const guestToken = guestTokenFromRequest(req);
    const guestHash = guestToken ? guestOwnerFromToken(guestToken).ownerHash : null;
    const accountHash = user ? accountOwner(user).ownerHash : null;
    const isAuthorized = ticket.ownerType === "account"
      ? accountHash === ticket.ownerHash
      : guestHash === ticket.ownerHash;
    if (!isAuthorized) {
      req.resume();
      return jsonError(res, 403, "UPLOAD_OWNER_MISMATCH", "This upload belongs to another browser or account.");
    }

    intentClaimed = await db.claimUploadIntent(ticket.id, ticket.ownerHash);
    if (!intentClaimed) {
      req.resume();
      return jsonError(res, 409, "UPLOAD_ALREADY_USED", "This upload session has already been used or expired. Start a new upload.");
    }

    await storagePutStream(ticket.objectKey, req, ticket.contentType, ticket.sizeBytes, abortController.signal);
    if (abortController.signal.aborted) throw new Error("Upload cancelled");

    const finalOwner = user ? accountOwner(user) : guestOwnerFromToken(guestToken!);
    const saved = {
      id: ticket.id,
      ownerHash: finalOwner.ownerHash,
      ownerType: finalOwner.ownerType,
      originalName: ticket.originalName,
      category: ticket.category,
      contentType: ticket.contentType,
      sizeBytes: ticket.sizeBytes,
      objectKey: ticket.objectKey,
    };
    await db.completeUpload(saved, ticket.id);
    res.status(201).json({
      id: ticket.id,
      name: ticket.originalName,
      category: ticket.category,
      contentType: ticket.contentType,
      sizeBytes: ticket.sizeBytes,
      createdAt: new Date().toISOString(),
      url: `${PUBLIC_STORAGE_PREFIX}/${ticket.objectKey}`,
      previewUrl: `/preview/${ticket.id}`,
    });
  } catch (error) {
    if (intentClaimed) await db.discardUploadIntent(ticket.id).catch(() => undefined);
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("[DropLink] Upload did not complete:", message);
    if (!res.headersSent && !req.aborted) {
      const code = message.includes("Storage config missing") ? "STORAGE_NOT_CONFIGURED"
        : message.includes("Database is not available") ? "DATABASE_NOT_CONFIGURED"
        : message.includes("cancelled") ? "UPLOAD_CANCELLED"
        : "UPLOAD_FAILED";
      const status = code === "STORAGE_NOT_CONFIGURED" || code === "DATABASE_NOT_CONFIGURED" ? 503 : 502;
      jsonError(res, status, code, "Storage could not confirm this upload. No successful file record was created; try again.");
    }
    return;
  }
});

/**
 * Safe text content preview endpoint (`GET /api/uploads/:id/text`).
 * Reads up to 256 KB of text for supported text files (TXT, JSON, CSV, LOG, MD)
 * and returns it as JSON so the frontend never injects raw HTML or executes scripts.
 */
router.get("/:id/text", async (req, res) => {
  try {
    const id = req.params.id;
    const record = await db.getUploadById(id);
    if (!record) {
      return jsonError(res, 404, "FILE_NOT_FOUND", "The requested file was not found.");
    }

    if (!isTextPreviewable(record.contentType, record.originalName)) {
      return jsonError(res, 415, "PREVIEW_NOT_TEXT", "This file is not a supported text document.");
    }

    const MAX_PREVIEW_BYTES = 256 * 1024; // 256 KB max preview slice
    let buffer: Buffer;

    if (ENV.storageDriver === "local") {
      const filePath = getLocalFilePath(record.objectKey);
      const handle = await fs.promises.open(filePath, "r");
      try {
        const bytesToRead = Math.min(record.sizeBytes, MAX_PREVIEW_BYTES);
        buffer = Buffer.alloc(bytesToRead);
        const { bytesRead } = await handle.read(buffer, 0, bytesToRead, 0);
        buffer = buffer.subarray(0, bytesRead);
      } finally {
        await handle.close();
      }
    } else {
      const signedUrl = await storageGetSignedUrl(record.objectKey);
      const response = await fetch(signedUrl, {
        headers: { Range: `bytes=0-${MAX_PREVIEW_BYTES - 1}` },
      });
      if (!response.ok) {
        return jsonError(res, 502, "STORAGE_READ_FAILED", "Could not fetch file content for preview.");
      }
      const arr = await response.arrayBuffer();
      buffer = Buffer.from(arr).subarray(0, MAX_PREVIEW_BYTES);
    }

    const text = buffer.toString("utf8");
    res.setHeader("Cache-Control", "private, max-age=60");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.json({
      id: record.id,
      name: record.originalName,
      contentType: record.contentType,
      sizeBytes: record.sizeBytes,
      truncated: record.sizeBytes > MAX_PREVIEW_BYTES,
      text,
    });
  } catch (error) {
    console.error("[DropLink] Text preview error:", error);
    jsonError(res, 500, "TEXT_PREVIEW_FAILED", "Could not read text preview.");
  }
});

export const uploadHttpRouter = router;
