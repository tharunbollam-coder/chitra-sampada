-- Migration number: 0011 	 2026-09-30T13:00:00.000Z
-- Adds review_spoiler_level column to anime table
ALTER TABLE anime ADD COLUMN review_spoiler_level TEXT DEFAULT 'none';
