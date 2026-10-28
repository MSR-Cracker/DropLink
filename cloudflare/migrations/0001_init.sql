CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  owner_hash TEXT NOT NULL,
  original_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('image','pdf','audio','video','document','archive','other')),
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  object_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS uploads_owner_created_idx ON uploads(owner_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS uploads_owner_name_idx ON uploads(owner_hash, original_name);
CREATE TABLE IF NOT EXISTS upload_intents (
  id TEXT PRIMARY KEY,
  owner_hash TEXT NOT NULL,
  original_name TEXT NOT NULL,
  category TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS upload_intents_expiry_idx ON upload_intents(expires_at);
