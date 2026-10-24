CREATE TABLE IF NOT EXISTS ai_connections (
 owner text PRIMARY KEY,
 encrypted_key text NOT NULL,
 model text NOT NULL,
 updated_at text NOT NULL,
 verified_at text
);
