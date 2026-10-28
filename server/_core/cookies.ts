import type { CookieOptions, Request } from "express";

export function isSecureRequest(req: Request): boolean {
  if (req.protocol === "https" || req.secure) return true;
  const xfp = req.headers["x-forwarded-proto"];
  if (typeof xfp === "string" && xfp.split(",")[0].trim().toLowerCase() === "https") return true;
  return process.env.NODE_ENV === "production" && process.env.DROPLINK_FORCE_INSECURE_COOKIES !== "1";
}

export function getSessionCookieOptions(req: Request): CookieOptions {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
