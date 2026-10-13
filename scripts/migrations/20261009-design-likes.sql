-- Additive SQLite / D1 migration. Review before applying to a deployed database.
CREATE TABLE design_like (
  id TEXT PRIMARY KEY NOT NULL,
  design_id TEXT NOT NULL REFERENCES design(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
CREATE UNIQUE INDEX uq_design_like_user ON design_like(design_id, user_id);
