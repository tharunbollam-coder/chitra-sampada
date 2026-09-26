-- Migration number: 0007 	 2026-09-25T13:00:00.000Z
-- Add movie support fields to anime table
ALTER TABLE anime ADD COLUMN type TEXT NOT NULL DEFAULT 'series';
ALTER TABLE anime ADD COLUMN runtime INTEGER DEFAULT NULL;
ALTER TABLE anime ADD COLUMN movie_canon_type TEXT DEFAULT NULL;
