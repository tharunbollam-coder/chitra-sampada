-- Migration number: 0017 	 2026-10-25T07:35:00.000Z

ALTER TABLE franchises ADD COLUMN watch_order_note TEXT;

DROP TABLE IF EXISTS franchise_watch_order;
