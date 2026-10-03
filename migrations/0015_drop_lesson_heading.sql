-- Migration number: 0015 	 2026-10-03T14:00:00.000Z
-- Drops unused lesson_heading column from anime table

ALTER TABLE anime DROP COLUMN lesson_heading;
