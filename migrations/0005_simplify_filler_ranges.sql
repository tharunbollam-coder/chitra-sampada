-- Migration number: 0005 	 2026-09-21T19:05:00.000Z

-- 1. Recreate anime_filler_ranges table to store one row per episode type per anime
DROP TABLE IF EXISTS anime_filler_ranges;

CREATE TABLE IF NOT EXISTS anime_filler_ranges (
  anime_id TEXT NOT NULL,
  type TEXT NOT NULL,
  episodes TEXT NOT NULL,
  episode_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (anime_id, type),
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_anime_filler_type ON anime_filler_ranges(anime_id, type);
