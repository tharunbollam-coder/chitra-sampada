-- Migration number: 0009 	 2026-09-28T15:00:00.000Z
ALTER TABLE anime ADD COLUMN review_type TEXT DEFAULT 'full';
