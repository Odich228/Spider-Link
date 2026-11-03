-- Shared rooms are independent of existing application migrations.
CREATE TABLE IF NOT EXISTS spider_rooms (
  id TEXT PRIMARY KEY NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL CHECK (version > 0),
  body TEXT NOT NULL CHECK (json_valid(body)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spider_memberships (
  token_hash TEXT PRIMARY KEY NOT NULL,
  room_id TEXT NOT NULL REFERENCES spider_rooms(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (room_id, member_id)
);
CREATE INDEX IF NOT EXISTS spider_memberships_room ON spider_memberships(room_id);

CREATE TABLE IF NOT EXISTS spider_room_photos (
  id TEXT PRIMARY KEY NOT NULL,
  room_id TEXT NOT NULL REFERENCES spider_rooms(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  size INTEGER NOT NULL CHECK (size > 0 AND size <= 409600),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS spider_room_photos_room ON spider_room_photos(room_id);
