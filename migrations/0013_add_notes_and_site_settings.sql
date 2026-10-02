-- Migration number: 0013 	 2026-10-02T13:35:00.000Z
-- Adds editorial notes and character related article link to anime table, and creates site_settings table

ALTER TABLE anime ADD COLUMN watch_order_note TEXT DEFAULT NULL;
ALTER TABLE anime ADD COLUMN filler_note TEXT DEFAULT NULL;
ALTER TABLE anime ADD COLUMN character_related_post_slug TEXT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO site_settings (key, value) VALUES (
  'thought_of_the_week',
  'Plant a tree if you get the chance — future you will thank present you.'
);
