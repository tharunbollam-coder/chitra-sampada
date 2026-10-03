-- Migration number: 0014 	 2026-10-03T13:30:00.000Z
-- Adds anime_streaming_platforms table to store streaming availability options

CREATE TABLE IF NOT EXISTS anime_streaming_platforms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anime_id TEXT NOT NULL,
  platform_name TEXT NOT NULL,
  stream_url TEXT,
  logo_url TEXT,
  note TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_anime_streaming_platforms_anime_id 
  ON anime_streaming_platforms(anime_id, display_order);
