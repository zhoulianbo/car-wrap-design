-- SQLite / D1: review before applying to a deployed database.
-- Apply once; existing designs remain excluded from the homepage.
ALTER TABLE design ADD COLUMN show_in_hero INTEGER NOT NULL DEFAULT false;
