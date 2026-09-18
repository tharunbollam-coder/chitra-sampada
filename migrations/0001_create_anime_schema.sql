-- Migration number: 0001 	 2026-09-18T09:12:45.885Z

-- 1. Franchises Table
CREATE TABLE IF NOT EXISTS franchises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

-- 2. Franchise Watch Order Steps Table
CREATE TABLE IF NOT EXISTS franchise_watch_order (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  franchise_id TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  episodes TEXT NOT NULL,
  anime_id TEXT,
  note TEXT,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
);

-- 3. Anime Table
CREATE TABLE IF NOT EXISTS anime (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  original_title TEXT,
  year INTEGER NOT NULL,
  episodes INTEGER NOT NULL,
  status TEXT NOT NULL,
  personal_rating REAL,
  poster TEXT NOT NULL,
  backdrop TEXT,
  added_date TEXT,
  last_updated TEXT,
  honesty_status TEXT NOT NULL,
  filler_percentage INTEGER NOT NULL DEFAULT 0,
  trending INTEGER NOT NULL DEFAULT 0,
  synopsis TEXT,
  franchise_id TEXT,
  franchise_step_order INTEGER,
  review_heading TEXT,
  review_paragraphs TEXT,
  source_title TEXT,
  source_original_title TEXT,
  source_author TEXT,
  source_type TEXT,
  source_volumes TEXT,
  source_publication_status TEXT,
  source_adaptation_status TEXT,
  source_coverage TEXT,
  source_notes TEXT,
  power_system_name TEXT,
  power_system_paragraphs TEXT,
  lesson_heading TEXT,
  lesson_takeaway TEXT,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE SET NULL
);

-- 4. Anime Aliases
CREATE TABLE IF NOT EXISTS anime_aliases (
  anime_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  PRIMARY KEY (anime_id, alias),
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE
);

-- 5. Anime Genres
CREATE TABLE IF NOT EXISTS anime_genres (
  anime_id TEXT NOT NULL,
  genre TEXT NOT NULL,
  PRIMARY KEY (anime_id, genre),
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE
);

-- 6. Anime Vibes
CREATE TABLE IF NOT EXISTS anime_vibes (
  anime_id TEXT NOT NULL,
  vibe_id TEXT NOT NULL,
  PRIMARY KEY (anime_id, vibe_id),
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE
);

-- 7. Filler Ranges
CREATE TABLE IF NOT EXISTS anime_filler_ranges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anime_id TEXT NOT NULL,
  range TEXT NOT NULL,
  type TEXT NOT NULL,
  arc TEXT,
  range_order INTEGER NOT NULL,
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE
);

-- 8. Characters
CREATE TABLE IF NOT EXISTS anime_characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anime_id TEXT NOT NULL,
  rank INTEGER NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  role TEXT,
  commentary TEXT,
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_anime_slug ON anime(slug);
CREATE INDEX IF NOT EXISTS idx_anime_aliases_alias ON anime_aliases(alias);
CREATE INDEX IF NOT EXISTS idx_franchise_watch_order ON franchise_watch_order(franchise_id, step_order);
CREATE INDEX IF NOT EXISTS idx_anime_filler_ranges ON anime_filler_ranges(anime_id, range_order);
CREATE INDEX IF NOT EXISTS idx_anime_characters ON anime_characters(anime_id, rank);
CREATE INDEX IF NOT EXISTS idx_anime_vibes ON anime_vibes(vibe_id);
