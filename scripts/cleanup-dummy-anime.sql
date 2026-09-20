-- Cleanup all dummy/sample anime except the complete reference entry ('frieren')
DELETE FROM anime_aliases WHERE anime_id != 'frieren';
DELETE FROM anime_genres WHERE anime_id != 'frieren';
DELETE FROM anime_vibes WHERE anime_id != 'frieren';
DELETE FROM anime_filler_ranges WHERE anime_id != 'frieren';
DELETE FROM anime_characters WHERE anime_id != 'frieren';
DELETE FROM franchise_watch_order WHERE franchise_id != 'frieren';
DELETE FROM franchises WHERE id != 'frieren';
DELETE FROM blog_post_anime WHERE anime_id != 'frieren';
DELETE FROM anime WHERE id != 'frieren';
