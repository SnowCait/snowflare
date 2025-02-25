CREATE TABLE events (
  id BLOB PRIMARY KEY,
  pubkey BLOB NOT NULL,
  kind INTEGER NOT NULL,
  created_at INTEGER NOT NULL
) STRICT;

CREATE INDEX pubkey ON events (pubkey, kind, created_at DESC);
CREATE INDEX kind ON events (kind, created_at DESC);
CREATE INDEX created_at ON events (created_at DESC);

CREATE TABLE tags (
  id BLOB,
  kind INTEGER NOT NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at INTEGER NOT NULL
) STRICT;

CREATE INDEX tag ON tags (name, value, created_at DESC);
