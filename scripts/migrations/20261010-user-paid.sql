-- SQLite / D1. Review before production; apply once. No paywall tracking is stored here.
ALTER TABLE user ADD COLUMN is_paid INTEGER NOT NULL DEFAULT 0;
UPDATE user SET is_paid = 1
WHERE EXISTS (
  SELECT 1 FROM "order"
  WHERE "order".user_id = user.id AND "order".status = 'paid' AND "order".amount > 0
);
