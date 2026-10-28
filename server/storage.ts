import { randomUUID } from "node:crypto";
// Multi-driver storage layer for DropLink:
// 1. Local Disk Storage (`local`, default for standalone deployment outside Manus)
// 2. S3-Compatible Storage (`s3`, for AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces)
// 3. Remote Presigned API (`remote`, backward-compatible with managed storage APIs)
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { Readable } from "node:stream";
import { ENV } from "./_core/env";

export const PUBLIC_STORAGE_PREFIX = "/dl-storage";

export function isStorageReady(): boolean {
  const driver = ENV.storageDriver;
  if (driver === "local") return true;
  if (driver === "s3") {
    const s3 = ENV.s3Config;
    return Boolean(s3.bucket && s3.accessKeyId && s3.secretAccessKey);
  }
  return Boolean(ENV.forgeApiUrl && ENV.forgeApiKey);
}

export function isDeletionSupported(): boolean {
  const driver = ENV.storageDriver;
  return driver === "local" || driver === "s3";
}

export function normalizeKey(relKey: string): string {
  const key = relKey.replace(/^\/+/, "");
  if (
    !key ||
    key.length > 200 ||
    !/^[A-Za-z0-9/._-]+$/.test(key) ||
    key.split("/").some(segment => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("Invalid storage object key");
  }
  return key;
}

function appendHashSuffix(relKey: string): string {
  const hash = randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export function getLocalFilePath(relKey: string): string {
  const key = normalizeKey(relKey);
  const baseDir = path.resolve(ENV.localStorageDir);
  const resolved = path.resolve(baseDir, key);
  if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) {
    throw new Error("Unsafe storage path traversal blocked");
  }
  return resolved;
}

function getRemoteConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error("Storage config missing: set STORAGE_API_URL and STORAGE_API_KEY (or use DROPLINK_STORAGE_DRIVER=local)");
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

async function getPresignedPutUrl(forgeUrl: string, forgeKey: string, key: string) {
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const response = await fetch(presignUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`Storage presign failed (${response.status})`);
  }
  const result = (await response.json()) as { url?: string; error?: unknown };
  if (!result.url) throw new Error("Storage returned no upload URL");
  const url = new URL(result.url);
  if (url.protocol !== "https:") throw new Error("Storage returned an insecure upload URL");
  return url;
}

async function getS3Client() {
  const s3Cfg = ENV.s3Config;
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: s3Cfg.region || "auto",
    ...(s3Cfg.endpoint ? { endpoint: s3Cfg.endpoint, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: s3Cfg.accessKeyId,
      secretAccessKey: s3Cfg.secretAccessKey,
    },
  });
}

/** Stream an incoming HTTP body directly to storage without buffering the entire file in memory. */
export async function storagePutStream(
  relKey: string,
  body: Readable,
  contentType: string,
  sizeBytes: number,
  signal?: AbortSignal,
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0) throw new Error("Invalid upload size");

  const driver = ENV.storageDriver;

  if (driver === "local") {
    const destPath = getLocalFilePath(key);
    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    const tempPath = `${destPath}.part.${randomUUID().slice(0, 8)}`;
    let writtenBytes = 0;

    try {
      const writeStream = fs.createWriteStream(tempPath, { flags: "wx" });
      body.on("data", (chunk: Buffer) => {
        writtenBytes += chunk.length;
        if (writtenBytes > sizeBytes) {
          writeStream.destroy(new Error("Uploaded byte stream exceeded declared size"));
        }
      });
      await pipeline(body, writeStream, { signal });
      if (writtenBytes !== sizeBytes) {
        throw new Error(`Uploaded byte count (${writtenBytes}) did not match declared size (${sizeBytes})`);
      }
      await fs.promises.rename(tempPath, destPath);
      return { key, url: `${PUBLIC_STORAGE_PREFIX}/${key}` };
    } catch (error) {
      await fs.promises.unlink(tempPath).catch(() => undefined);
      throw error;
    }
  }

  if (driver === "s3") {
    const s3Cfg = ENV.s3Config;
    const client = await getS3Client();
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of body) {
      if (signal?.aborted) throw new Error("Upload cancelled");
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buf.length;
      if (total > sizeBytes) throw new Error("Uploaded bytes exceeded declared size");
      chunks.push(buf);
    }
    if (total !== sizeBytes) throw new Error("Uploaded byte length mismatch");
    await client.send(
      new PutObjectCommand({
        Bucket: s3Cfg.bucket,
        Key: key,
        Body: Buffer.concat(chunks),
        ContentType: contentType,
        ContentLength: sizeBytes,
      }),
      { abortSignal: signal }
    );
    return { key, url: `${PUBLIC_STORAGE_PREFIX}/${key}` };
  }

  // Remote presigned API driver
  const { forgeUrl, forgeKey } = getRemoteConfig();
  const target = await getPresignedPutUrl(forgeUrl, forgeKey, key);
  const requestFn = target.protocol === "https:" ? httpsRequest : httpRequest;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      body.removeListener("error", onBodyError);
      error ? reject(error) : resolve();
    };
    const onAbort = () => putRequest.destroy(new Error("Upload cancelled"));
    const onBodyError = (error: Error) => putRequest.destroy(error);
    const putRequest = requestFn(
      target,
      {
        method: "PUT",
        headers: { "Content-Type": contentType, "Content-Length": String(sizeBytes) },
      },
      response => {
        response.on("error", error => finish(error));
        response.on("end", () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) finish();
          else finish(new Error(`Storage upload failed (${response.statusCode ?? "unknown"})`));
        });
        response.resume();
      }
    );
    putRequest.setTimeout(180_000, () => putRequest.destroy(new Error("Storage upload timed out")));
    putRequest.on("error", error => finish(error));
    body.on("error", onBodyError);
    if (signal?.aborted) onAbort();
    else signal?.addEventListener("abort", onAbort, { once: true });
    body.pipe(putRequest);
  });

  return { key, url: `${PUBLIC_STORAGE_PREFIX}/${key}` };
}

/** Buffer/string helper retained for programmatic storage puts. */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const driver = ENV.storageDriver;

  if (driver === "local") {
    const destPath = getLocalFilePath(key);
    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    const buf = typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data);
    await fs.promises.writeFile(destPath, buf);
    return { key, url: `${PUBLIC_STORAGE_PREFIX}/${key}` };
  }

  if (driver === "s3") {
    const s3Cfg = ENV.s3Config;
    const client = await getS3Client();
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const buf = typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data);
    await client.send(
      new PutObjectCommand({
        Bucket: s3Cfg.bucket,
        Key: key,
        Body: buf,
        ContentType: contentType,
      })
    );
    return { key, url: `${PUBLIC_STORAGE_PREFIX}/${key}` };
  }

  const { forgeUrl, forgeKey } = getRemoteConfig();
  const target = await getPresignedPutUrl(forgeUrl, forgeKey, key);
  const body = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data as any], { type: contentType });
  const response = await fetch(target, { method: "PUT", headers: { "Content-Type": contentType }, body });
  if (!response.ok) throw new Error(`Storage upload failed (${response.status})`);
  return { key, url: `${PUBLIC_STORAGE_PREFIX}/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `${PUBLIC_STORAGE_PREFIX}/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  const driver = ENV.storageDriver;

  if (driver === "local") {
    return `${PUBLIC_STORAGE_PREFIX}/${key}`;
  }

  if (driver === "s3") {
    const s3Cfg = ENV.s3Config;
    if (s3Cfg.publicBaseUrl) {
      return `${s3Cfg.publicBaseUrl.replace(/\/+$/, "")}/${key}`;
    }
    const client = await getS3Client();
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    return await getSignedUrl(client, new GetObjectCommand({ Bucket: s3Cfg.bucket, Key: key }), { expiresIn: 3600 });
  }

  const { forgeUrl, forgeKey } = getRemoteConfig();
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);
  const response = await fetch(getUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`Storage signed URL failed (${response.status})`);
  }
  const result = (await response.json()) as { url?: string };
  if (!result.url) throw new Error("Storage did not return a download URL");
  return result.url;
}

/** Delete an object physically from storage when supported (`local` or `s3`). */
export async function storageDelete(relKey: string): Promise<boolean> {
  const key = normalizeKey(relKey);
  const driver = ENV.storageDriver;

  if (driver === "local") {
    const targetPath = getLocalFilePath(key);
    try {
      await fs.promises.unlink(targetPath);
      return true;
    } catch (error: any) {
      if (error?.code === "ENOENT") return true;
      throw error;
    }
  }

  if (driver === "s3") {
    const s3Cfg = ENV.s3Config;
    const client = await getS3Client();
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await client.send(new DeleteObjectCommand({ Bucket: s3Cfg.bucket, Key: key }));
    return true;
  }

  return false;
}
