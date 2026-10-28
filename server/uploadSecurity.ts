import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { parse } from "cookie";
import type { User } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { isSecureRequest } from "./_core/cookies";

export const GUEST_COOKIE = "__Host-droplink_guest";
export const GUEST_COOKIE_FALLBACK = "droplink_guest";
export const DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const MAX_CONFIGURABLE_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
const GUEST_COOKIE_AGE_SECONDS = 60 * 60 * 24 * 365;

export type OwnerType = "account" | "guest";
export type UploadOwner = { ownerHash: string; ownerType: OwnerType; guestToken?: string };
export type UploadTicket = {
  id: string;
  ownerHash: string;
  ownerType: OwnerType;
  originalName: string;
  category: "image" | "pdf" | "audio" | "video" | "document" | "archive" | "other";
  contentType: string;
  sizeBytes: number;
  objectKey: string;
  expiresAt: number;
};

// Disallow dangerous executable or active script file extensions on upload
export const BLOCKED_EXTENSIONS = new Set([
  "exe", "msi", "bat", "cmd", "com", "scr", "pif", "vbs", "vbe", "js", "jse", "ws", "wsf",
  "wsc", "wsh", "ps1", "psm1", "sh", "bash", "csh", "ksh", "dll", "sys", "drv", "bin",
  "apk", "ipa", "jar", "app", "dmg", "pkg", "deb", "rpm", "hta", "cpl", "msc", "reg",
  "html", "htm", "xhtml", "shtml", "svg", "php", "phtml", "asp", "aspx", "jsp", "jspx", "cgi", "pl", "py", "rb",
]);

export function isBlockedFilename(filename: string): { blocked: boolean; extension?: string } {
  const clean = filename.trim().toLowerCase();
  const parts = clean.split(".");
  if (parts.length < 2) return { blocked: false };
  const ext = parts[parts.length - 1] ?? "";
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { blocked: true, extension: ext };
  }
  return { blocked: false };
}

export function sanitizeFilename(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // Strip any path components if a client sent a full path
  const base = raw.replace(/\\/g, "/").split("/").pop()?.trim() ?? "";
  if (!base || base === "." || base === ".." || Array.from(base).length > 255) return null;
  if (/[\u0000-\u001f\u007f]/.test(base)) return null;
  return base;
}

export function getMaxUploadBytes(): number {
  const raw = process.env.DROPLINK_MAX_FILE_SIZE_BYTES;
  if (raw === undefined || raw.trim() === "") return DEFAULT_MAX_UPLOAD_BYTES;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > MAX_CONFIGURABLE_UPLOAD_BYTES) {
    throw new Error(`DROPLINK_MAX_FILE_SIZE_BYTES must be an integer from 0 to ${MAX_CONFIGURABLE_UPLOAD_BYTES}`);
  }
  return parsed;
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function accountOwner(user: User): UploadOwner {
  return { ownerHash: sha256(`account:${user.openId}`), ownerType: "account" };
}

export function guestTokenFromRequest(req: Request) {
  try {
    const parsed = parse(req.headers.cookie ?? "");
    const value = parsed[GUEST_COOKIE] ?? parsed[GUEST_COOKIE_FALLBACK];
    return typeof value === "string" && /^[A-Za-z0-9_-]{40,60}$/.test(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function ensureGuestOwner(req: Request, res: Response): UploadOwner {
  let token = guestTokenFromRequest(req);
  if (!token) {
    token = randomBytes(32).toString("base64url");
    const secure = isSecureRequest(req);
    if (secure) {
      res.append(
        "Set-Cookie",
        `${GUEST_COOKIE}=${token}; Max-Age=${GUEST_COOKIE_AGE_SECONDS}; Path=/; HttpOnly; Secure; SameSite=None`
      );
    } else {
      res.append(
        "Set-Cookie",
        `${GUEST_COOKIE_FALLBACK}=${token}; Max-Age=${GUEST_COOKIE_AGE_SECONDS}; Path=/; HttpOnly; SameSite=Lax`
      );
    }
  }
  return { ownerHash: sha256(`guest:${token}`), ownerType: "guest", guestToken: token };
}

export function guestOwnerFromToken(token: string): UploadOwner {
  return { ownerHash: sha256(`guest:${token}`), ownerType: "guest", guestToken: token };
}

export function newUploadId() {
  return randomUUID();
}

function ticketKey() {
  if (!ENV.cookieSecret) throw new Error("Secure upload signing is unavailable: JWT_SECRET is not configured");
  return createHash("sha256").update(`droplink-upload-ticket:${ENV.cookieSecret}`).digest();
}

export function signUploadTicket(ticket: UploadTicket) {
  const encoded = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  const signature = createHmac("sha256", ticketKey()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyUploadTicket(value: string): UploadTicket | null {
  if (!value || value.length > 8192) return null;
  const [encoded, signature, extra] = value.split(".");
  if (!encoded || !signature || extra !== undefined) return null;
  let expected: Buffer;
  try {
    expected = createHmac("sha256", ticketKey()).update(encoded).digest();
  } catch {
    return null;
  }
  let received: Buffer;
  try {
    received = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const ticket = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as UploadTicket;
    const validCategory = ["image", "pdf", "audio", "video", "document", "archive", "other"].includes(ticket.category);
    if (
      typeof ticket.id !== "string" || !/^[0-9a-f-]{36}$/i.test(ticket.id) ||
      typeof ticket.ownerHash !== "string" || !/^[a-f0-9]{64}$/i.test(ticket.ownerHash) ||
      (ticket.ownerType !== "guest" && ticket.ownerType !== "account") ||
      typeof ticket.originalName !== "string" || ticket.originalName.length < 1 || ticket.originalName.length > 255 ||
      !validCategory || typeof ticket.contentType !== "string" || ticket.contentType.length > 127 ||
      !Number.isSafeInteger(ticket.sizeBytes) || ticket.sizeBytes < 0 ||
      ticket.objectKey !== `droplink/${ticket.id}` ||
      !Number.isSafeInteger(ticket.expiresAt) || ticket.expiresAt <= Date.now()
    ) return null;
    return ticket;
  } catch {
    return null;
  }
}

// ============================================================================
// Lightweight Rate Limiter to prevent upload / API abuse
// ============================================================================
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets.entries()) {
      if (v.resetAt <= now) rateBuckets.delete(k);
    }
  }
  const existing = rateBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= maxRequests) return false;
  existing.count += 1;
  return true;
}
