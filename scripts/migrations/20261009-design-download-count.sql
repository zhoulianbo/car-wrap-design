-- SQLite / D1: review before applying to a deployed database.
ALTER TABLE design ADD COLUMN download_count INTEGER NOT NULL DEFAULT 0;
