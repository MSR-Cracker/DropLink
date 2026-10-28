// Application environment variables with standard standalone names and legacy compatibility fallbacks.
import path from "node:path";

export const ENV = {
  get appId() {
    return (
      process.env.APP_ID ??
      process.env.DROPLINK_APP_ID ??
      process.env.MANUS_PROJECT_ID ??
      "droplink-app"
    );
  },
  get cookieSecret() {
    return (
      process.env.JWT_SECRET ??
      process.env.DROPLINK_JWT_SECRET ??
      process.env.MANUS_JWT_SECRET ??
      (process.env.NODE_ENV === "production" ? "" : "droplink-dev-signing-secret-msr-coder-2026")
    );
  },
  get databaseUrl() {
    return process.env.DATABASE_URL ?? "";
  },
  get dbDriver(): "mysql" | "local" {
    const raw = (process.env.DROPLINK_DB_DRIVER ?? "").trim().toLowerCase();
    if (raw === "mysql") return "mysql";
    if (raw === "local" || raw === "json" || raw === "sqlite") return "local";
    return process.env.DATABASE_URL ? "mysql" : "local";
  },
  get localDbPath() {
    return (
      process.env.DROPLINK_LOCAL_DB_PATH ??
      path.resolve(process.cwd(), "storage_data", "droplink_db.json")
    );
  },
  get storageDriver(): "local" | "s3" | "remote" {
    const raw = (process.env.DROPLINK_STORAGE_DRIVER ?? "").trim().toLowerCase();
    if (raw === "s3") return "s3";
    if (raw === "remote" || raw === "forge") return "remote";
    if (raw === "local") return "local";
    if (process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
      return "s3";
    }
    if ((process.env.STORAGE_API_URL || process.env.MANUS_API_URL) && (process.env.STORAGE_API_KEY || process.env.MANUS_API_KEY)) {
      return "remote";
    }
    return "local";
  },
  get localStorageDir() {
    return (
      process.env.DROPLINK_STORAGE_DIR ??
      path.resolve(process.cwd(), "storage_data", "files")
    );
  },
  get s3Config() {
    return {
      endpoint: process.env.S3_ENDPOINT ?? "",
      region: process.env.S3_REGION ?? "auto",
      bucket: process.env.S3_BUCKET ?? "",
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      publicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? "",
    };
  },
  get oAuthServerUrl() {
    return process.env.OAUTH_API_URL ?? process.env.MANUS_OAUTH_API_URL ?? "";
  },
  get oAuthPortalUrl() {
    return process.env.OAUTH_PORTAL_URL ?? process.env.MANUS_OAUTH_PORTAL_URL ?? "";
  },
  get ownerOpenId() {
    return process.env.OWNER_OPEN_ID ?? "";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get forgeApiUrl() {
    return process.env.STORAGE_API_URL ?? process.env.EXTERNAL_API_URL ?? process.env.MANUS_API_URL ?? "";
  },
  get forgeApiKey() {
    return process.env.STORAGE_API_KEY ?? process.env.EXTERNAL_API_KEY ?? process.env.MANUS_API_KEY ?? "";
  },
};
