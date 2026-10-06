-- Migration number: 0016 	 2026-10-05T13:45:00.000Z

-- 1. Create Vibes Table
CREATE TABLE IF NOT EXISTS vibes (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT,
  group_label TEXT,
  color_theme TEXT NOT NULL DEFAULT 'indigo',
  seo_intro TEXT,
  meta_description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vibes_slug ON vibes(slug);
CREATE INDEX IF NOT EXISTS idx_vibes_active ON vibes(is_active);

-- 2. Seed Initial 2 Vibes with Exact Metadata
INSERT OR IGNORE INTO vibes (
  id,
  slug,
  name,
  tagline,
  group_label,
  color_theme,
  seo_intro,
  meta_description,
  is_active
) VALUES 
(
  'op-mc',
  'overpowered-mc',
  'Overpowered Main Character',
  'Instant dominance & hype',
  'HYPE & ACTION',
  'purple',
  'Protagonists who shatter power scales, outclass entire armies, and make absolute arrogance look effortless. This collection features anime where the lead possesses godlike strength, rare awakening abilities, or unmatched tactical supremacy. No endless filler training arcs — just pure kinetic satisfaction, high-stakes combat, and top-tier hype.',
  'Discover the best overpowered main character (OP MC) anime with carefully researched chronological watch orders, filler percentages, and honest viewer insights.',
  1
),
(
  'hidden-gems',
  'hidden-gems',
  'Hidden Gems',
  'Overlooked masterpieces',
  'CRITIC PICK',
  'cyan',
  'High-concept stories, razor-sharp dialogue, and exceptional character writing that never received the massive mainstream algorithm boost they deserved. From underground mystery thrillers to experimental psychological dramas, these are masterclass productions that reward viewers searching for something truly distinctive.',
  'Discover overlooked anime masterpieces with exceptional writing and unique storytelling that flew under the mainstream radar, complete with watch guides.',
  1
);
