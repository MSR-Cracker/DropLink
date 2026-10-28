import fs from "node:fs";
import path from "node:path";
import { and, asc, desc, eq, like, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  UploadRecord,
  InsertUpload,
  UploadIntent,
  uploadIntents,
  uploads,
  users,
  User,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export function isDatabaseReady(): boolean {
  if (ENV.dbDriver === "local") return true;
  return Boolean(process.env.DATABASE_URL);
}

/** Lazily create the Drizzle MySQL instance when configured. */
export async function getDb() {
  if (ENV.dbDriver === "local") return null;
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// Standalone Local Persistent Store (JSON file backed with atomic rename)
// Used automatically when DATABASE_URL is not set or DROPLINK_DB_DRIVER=local
// ============================================================================

type LocalStoreData = {
  nextUserId: number;
  users: User[];
  uploads: UploadRecord[];
  uploadIntents: UploadIntent[];
};

let _localStoreCache: LocalStoreData | null = null;

function readLocalStore(): LocalStoreData {
  if (_localStoreCache) return _localStoreCache;
  const dbPath = ENV.localDbPath;
  try {
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, "utf8");
      const parsed = JSON.parse(raw) as LocalStoreData;
      _localStoreCache = {
        nextUserId: parsed.nextUserId || 1,
        users: (parsed.users || []).map(u => ({
          ...u,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
          lastSignedIn: new Date(u.lastSignedIn),
        })),
        uploads: (parsed.uploads || []).map(f => ({
          ...f,
          createdAt: new Date(f.createdAt),
        })),
        uploadIntents: (parsed.uploadIntents || []).map(i => ({
          ...i,
          expiresAt: new Date(i.expiresAt),
          createdAt: new Date(i.createdAt),
        })),
      };
      return _localStoreCache;
    }
  } catch (err) {
    console.warn("[LocalDB] Could not parse existing store, initializing fresh store:", err);
  }
  _localStoreCache = { nextUserId: 1, users: [], uploads: [], uploadIntents: [] };
  return _localStoreCache;
}

function writeLocalStore(data: LocalStoreData) {
  _localStoreCache = data;
  const dbPath = ENV.localDbPath;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const tmpPath = `${dbPath}.tmp.${process.pid}`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmpPath, dbPath);
}

// ============================================================================
// Repository Methods
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  if (ENV.dbDriver === "local") {
    const store = readLocalStore();
    const now = new Date();
    const existing = store.users.find(u => u.openId === user.openId);
    if (existing) {
      if (user.name !== undefined) existing.name = user.name ?? null;
      if (user.email !== undefined) existing.email = user.email ?? null;
      if (user.loginMethod !== undefined) existing.loginMethod = user.loginMethod ?? null;
      if (user.role !== undefined) existing.role = user.role;
      else if (user.openId === ENV.ownerOpenId) existing.role = "admin";
      existing.lastSignedIn = user.lastSignedIn ?? now;
      existing.updatedAt = now;
    } else {
      store.users.push({
        id: store.nextUserId++,
        openId: user.openId,
        name: user.name ?? null,
        email: user.email ?? null,
        loginMethod: user.loginMethod ?? null,
        role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
        createdAt: now,
        updatedAt: now,
        lastSignedIn: user.lastSignedIn ?? now,
      });
    }
    writeLocalStore(store);
    return;
  }

  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  if (ENV.dbDriver === "local") {
    const store = readLocalStore();
    return store.users.find(u => u.openId === openId);
  }
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUploadIntent(input: { id: string; ownerHash: string; expiresAt: Date }) {
  if (ENV.dbDriver === "local") {
    const store = readLocalStore();
    const now = Date.now();
    store.uploadIntents = store.uploadIntents.filter(i => new Date(i.expiresAt).getTime() > now);
    store.uploadIntents.push({
      id: input.id,
      ownerHash: input.ownerHash,
      status: "pending",
      expiresAt: input.expiresAt,
      createdAt: new Date(),
    });
    writeLocalStore(store);
    return;
  }

  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(uploadIntents).where(lt(uploadIntents.expiresAt, new Date()));
  await db.insert(uploadIntents).values(input);
}

export async function claimUploadIntent(id: string, ownerHash: string) {
  if (ENV.dbDriver === "local") {
    const store = readLocalStore();
    const now = Date.now();
    const intent = store.uploadIntents.find(
      i => i.id === id && i.ownerHash === ownerHash && i.status === "pending" && new Date(i.expiresAt).getTime() > now
    );
    if (!intent) return false;
    intent.status = "uploading";
    writeLocalStore(store);
    return true;
  }

  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db
    .update(uploadIntents)
    .set({ status: "uploading" })
    .where(
      and(
        eq(uploadIntents.id, id),
        eq(uploadIntents.ownerHash, ownerHash),
        eq(uploadIntents.status, "pending"),
        sql`${uploadIntents.expiresAt} > NOW()`,
      )
    );
  const affectedRows = (result as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0;
  return affectedRows === 1;
}

export async function discardUploadIntent(id: string) {
  if (ENV.dbDriver === "local") {
    const store = readLocalStore();
    store.uploadIntents = store.uploadIntents.filter(i => i.id !== id);
    writeLocalStore(store);
    return;
  }

  const db = await getDb();
  if (!db) return;
  await db.delete(uploadIntents).where(eq(uploadIntents.id, id));
}

export async function completeUpload(input: InsertUpload, intentId: string) {
  if (ENV.dbDriver === "local") {
    const store = readLocalStore();
    store.uploads.push({
      id: input.id,
      ownerHash: input.ownerHash,
      ownerType: input.ownerType,
      originalName: input.originalName,
      category: input.category,
      contentType: input.contentType,
      sizeBytes: Number(input.sizeBytes),
      objectKey: input.objectKey,
      createdAt: input.createdAt ?? new Date(),
    });
    store.uploadIntents = store.uploadIntents.filter(i => i.id !== intentId);
    writeLocalStore(store);
    return;
  }

  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.transaction(async tx => {
    await tx.insert(uploads).values(input);
    await tx.delete(uploadIntents).where(eq(uploadIntents.id, intentId));
  });
}

export type SortOption = "newest" | "oldest" | "largest" | "smallest" | "name_asc" | "name_desc";

export type UploadFilter = {
  search?: string;
  category?: UploadRecord["category"];
  sort?: SortOption;
};

const UPLOADS_PAGE_SIZE = 50;

export async function listUploads(ownerHash: string, filter: UploadFilter = {}, offset = 0) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) {
    throw new Error("Invalid file-list page offset");
  }
  const sort = filter.sort ?? "newest";

  if (ENV.dbDriver === "local") {
    const store = readLocalStore();
    const search = filter.search?.trim().toLowerCase();
    let matched = store.uploads.filter(f => {
      if (f.ownerHash !== ownerHash) return false;
      if (filter.category && f.category !== filter.category) return false;
      if (search && !f.originalName.toLowerCase().includes(search)) return false;
      return true;
    });

    matched.sort((a, b) => {
      if (sort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "largest") return b.sizeBytes - a.sizeBytes;
      if (sort === "smallest") return a.sizeBytes - b.sizeBytes;
      if (sort === "name_asc") return a.originalName.localeCompare(b.originalName);
      if (sort === "name_desc") return b.originalName.localeCompare(a.originalName);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const slice = matched.slice(offset, offset + UPLOADS_PAGE_SIZE + 1);
    return {
      files: slice.slice(0, UPLOADS_PAGE_SIZE),
      hasMore: slice.length > UPLOADS_PAGE_SIZE,
      totalCount: matched.length,
    };
  }

  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const conditions = [eq(uploads.ownerHash, ownerHash)];
  const search = filter.search?.trim();
  if (search) {
    const escaped = search.replace(/[\\%_]/g, "\\$&");
    conditions.push(like(uploads.originalName, `%${escaped}%`));
  }
  if (filter.category) conditions.push(eq(uploads.category, filter.category));

  const orderClause =
    sort === "oldest" ? [asc(uploads.createdAt), asc(uploads.id)]
    : sort === "largest" ? [desc(uploads.sizeBytes), desc(uploads.id)]
    : sort === "smallest" ? [asc(uploads.sizeBytes), asc(uploads.id)]
    : sort === "name_asc" ? [asc(uploads.originalName), asc(uploads.id)]
    : sort === "name_desc" ? [desc(uploads.originalName), desc(uploads.id)]
    : [desc(uploads.createdAt), desc(uploads.id)];

  const rows = await db
    .select()
    .from(uploads)
    .where(and(...conditions))
    .orderBy(...orderClause)
    .limit(UPLOADS_PAGE_SIZE + 1)
    .offset(offset);

  return {
    files: rows.slice(0, UPLOADS_PAGE_SIZE),
    hasMore: rows.length > UPLOADS_PAGE_SIZE,
  };
}

export async function getUploadById(id: string): Promise<UploadRecord | undefined> {
  if (!id || typeof id !== "string" || id.length > 64) return undefined;
  if (ENV.dbDriver === "local") {
    const store = readLocalStore();
    return store.uploads.find(f => f.id === id);
  }
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(uploads).where(eq(uploads.id, id)).limit(1);
  return rows[0];
}

export async function getUploadByObjectKey(objectKey: string): Promise<UploadRecord | undefined> {
  if (!objectKey || typeof objectKey !== "string") return undefined;
  if (ENV.dbDriver === "local") {
    const store = readLocalStore();
    return store.uploads.find(f => f.objectKey === objectKey);
  }
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(uploads).where(eq(uploads.objectKey, objectKey)).limit(1);
  return rows[0];
}

export async function deleteUploadByOwner(id: string, ownerHash: string): Promise<UploadRecord | null> {
  if (ENV.dbDriver === "local") {
    const store = readLocalStore();
    const index = store.uploads.findIndex(f => f.id === id && f.ownerHash === ownerHash);
    if (index === -1) return null;
    const [removed] = store.uploads.splice(index, 1);
    writeLocalStore(store);
    return removed;
  }

  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db
    .select()
    .from(uploads)
    .where(and(eq(uploads.id, id), eq(uploads.ownerHash, ownerHash)))
    .limit(1);
  if (!existing[0]) return null;
  await db.delete(uploads).where(and(eq(uploads.id, id), eq(uploads.ownerHash, ownerHash)));
  return existing[0];
}

export async function claimGuestUploads(guestHash: string, accountHash: string) {
  if (guestHash === accountHash) return;
  if (ENV.dbDriver === "local") {
    const store = readLocalStore();
    for (const file of store.uploads) {
      if (file.ownerHash === guestHash) {
        file.ownerHash = accountHash;
        file.ownerType = "account";
      }
    }
    store.uploadIntents = store.uploadIntents.filter(i => i.ownerHash !== guestHash);
    writeLocalStore(store);
    return;
  }

  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.transaction(async tx => {
    await tx
      .update(uploads)
      .set({ ownerHash: accountHash, ownerType: "account" })
      .where(eq(uploads.ownerHash, guestHash));
    await tx.delete(uploadIntents).where(eq(uploadIntents.ownerHash, guestHash));
  });
}
