-- Migration number: 0012 	 2026-09-30T13:40:00.000Z
-- Adds community_suggested column to anime table
ALTER TABLE anime ADD COLUMN community_suggested INTEGER DEFAULT 0;
