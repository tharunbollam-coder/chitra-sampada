-- Migration number: 0018 	 2026-10-31T13:30:00.000Z
-- Add optional cover_image column to blog_posts
ALTER TABLE blog_posts ADD COLUMN cover_image TEXT;
