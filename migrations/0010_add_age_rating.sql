-- Migration number: 0010 	 2026-09-29T13:35:00.000Z
-- Adds nullable age_rating column to anime table
ALTER TABLE anime ADD COLUMN age_rating INTEGER DEFAULT NULL;
