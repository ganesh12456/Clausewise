CREATE TABLE IF NOT EXISTS records (
 id text PRIMARY KEY, owner text NOT NULL, kind text NOT NULL CHECK(kind IN ('contract','policy','obligation')),
 data jsonb NOT NULL, revision integer NOT NULL DEFAULT 1, created text NOT NULL,
 parent_id text, UNIQUE(id,owner), FOREIGN KEY(parent_id,owner) REFERENCES records(id,owner) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS records_owner ON records(owner,created);
CREATE TABLE IF NOT EXISTS originals (
 id text PRIMARY KEY REFERENCES records(id) ON DELETE CASCADE, content bytea NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
 id text PRIMARY KEY, owner text NOT NULL, action text NOT NULL, subject text NOT NULL, created text NOT NULL
);
CREATE INDEX IF NOT EXISTS events_owner ON events(owner,created);
CREATE TABLE IF NOT EXISTS login_attempts (id text PRIMARY KEY, failures integer NOT NULL, reset_at bigint NOT NULL);
