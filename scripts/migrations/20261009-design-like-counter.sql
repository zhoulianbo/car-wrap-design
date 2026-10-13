-- SQLite / D1: review before applying to a deployed database; run once after design-likes.
ALTER TABLE design ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;
UPDATE design SET like_count = (SELECT COUNT(*) FROM design_like WHERE design_like.design_id = design.id);
DROP TABLE design_like;
