import {
  bigint,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table backing DropLink authentication. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Persisted file metadata is written only after storage confirms the upload. */
export const uploads = mysqlTable(
  "uploads",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    ownerHash: varchar("ownerHash", { length: 64 }).notNull(),
    ownerType: mysqlEnum("ownerType", ["account", "guest"]).notNull(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    category: mysqlEnum("category", ["image", "pdf", "audio", "video", "document", "archive", "other"]).notNull(),
    contentType: varchar("contentType", { length: 127 }).notNull(),
    sizeBytes: bigint("sizeBytes", { mode: "number" }).notNull(),
    objectKey: varchar("objectKey", { length: 127 }).notNull().unique(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("uploads_owner_created_idx").on(table.ownerHash, table.createdAt),
    index("uploads_owner_name_idx").on(table.ownerHash, table.originalName),
    index("uploads_owner_category_idx").on(table.ownerHash, table.category),
  ],
);

/** Short-lived reservations prevent replay without persisting file metadata pre-upload. */
export const uploadIntents = mysqlTable(
  "uploadIntents",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    ownerHash: varchar("ownerHash", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["pending", "uploading"]).default("pending").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("upload_intents_owner_expiry_idx").on(table.ownerHash, table.expiresAt)],
);

export type UploadRecord = typeof uploads.$inferSelect;
export type InsertUpload = typeof uploads.$inferInsert;
export type UploadIntent = typeof uploadIntents.$inferSelect;
