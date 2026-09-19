-- Migration number: 0002 	 2026-09-19T06:37:09.000Z

-- Add check constraint or index on honesty_status
-- SQLite in D1 allows 'watched', 'watchlist', 'reference'
CREATE INDEX IF NOT EXISTS idx_anime_honesty_status ON anime(honesty_status);
