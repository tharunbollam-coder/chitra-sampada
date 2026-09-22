-- Migration number: 0006 	 2026-09-22T13:00:00.000Z
-- Non-destructive add of section_visibility JSON column to anime table
ALTER TABLE anime ADD COLUMN section_visibility TEXT;
