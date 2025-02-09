CREATE TABLE events (
  id BLOB PRIMARY KEY,
  pubkey BLOB NOT NULL,
  kind INTEGER NOT NULL,
  created_at INTEGER NOT NULL
) STRICT;

CREATE INDEX pubkey ON events (pubkey, kind, created_at DESC);
CREATE INDEX kind ON events (kind, created_at DESC);
CREATE INDEX created_at ON events (created_at DESC);
