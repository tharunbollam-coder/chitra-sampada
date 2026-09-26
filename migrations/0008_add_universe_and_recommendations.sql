-- Migration number: 0008 	 2026-09-25T14:42:00.000Z
-- Adds dedicated tables for franchise universe directories and curated recommendations

-- 1. Related & Universe Media Table
CREATE TABLE IF NOT EXISTS anime_related_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anime_id TEXT NOT NULL,
  section TEXT NOT NULL CHECK(section IN ('canon', 'non_canon')), -- 'canon' = Official Canon Storyline, 'non_canon' = Non-Canon, Spin-offs & Specials
  title TEXT NOT NULL,
  badge TEXT NOT NULL, -- e.g. 'Main Series', 'Canon Movie', 'Canon Sequel/Prequel', 'Non-Canon Movie', 'Spin-off', 'OVA / Special'
  link_slug TEXT DEFAULT NULL, -- internal slug of existing show/movie page, or NULL if no page exists
  editorial_note TEXT DEFAULT NULL, -- optional review/guidance text
  item_order INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_anime_related_media_anime_id ON anime_related_media(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_related_media_order ON anime_related_media(anime_id, section, item_order ASC);

-- 2. Shows Like This (Recommendations) Table
CREATE TABLE IF NOT EXISTS anime_recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anime_id TEXT NOT NULL,
  target_anime_id TEXT NOT NULL, -- strictly points to an existing anime on our platform
  category_badge TEXT NOT NULL, -- e.g. 'Similar Worldbuilding', 'Same Studio', 'Dark Fantasy'
  editorial_note TEXT DEFAULT NULL, -- optional "Why You Should Watch" guidance
  item_order INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE,
  FOREIGN KEY (target_anime_id) REFERENCES anime(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_anime_recommendations_anime_id ON anime_recommendations(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_recommendations_target ON anime_recommendations(target_anime_id);
