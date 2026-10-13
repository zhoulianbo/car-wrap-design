-- SQLite / Cloudflare D1: independent, revocable links to saved wraps.
ALTER TABLE user_wrap ADD COLUMN share_token text;
ALTER TABLE user_wrap ADD COLUMN share_enabled integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX user_wrap_share_token_unique ON user_wrap (share_token);
