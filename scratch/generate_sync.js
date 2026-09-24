import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

const dbPath = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/a0ffe8df0ce462ac9160ad5be213d411f9f2ecdfd4d85bbf872456bacfc0a02f.sqlite';
const db = new DatabaseSync(dbPath);

let sql = `-- ==========================================
-- Chitra Sampada Remote Database Sync Script
-- ==========================================

-- 1. Apply Migration 0005 schema for anime_filler_ranges
DROP TABLE IF EXISTS anime_filler_ranges;

CREATE TABLE IF NOT EXISTS anime_filler_ranges (
  anime_id TEXT NOT NULL,
  type TEXT NOT NULL,
  episodes TEXT NOT NULL,
  episode_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (anime_id, type),
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_anime_filler_type ON anime_filler_ranges(anime_id, type);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_anime_year_title ON anime(year DESC, title ASC);

-- 3. Mark migrations 0005 and 0006 as applied
INSERT OR REPLACE INTO d1_migrations (id, name, applied_at)
VALUES 
  (5, '0005_simplify_filler_ranges.sql', datetime('now')),
  (6, '0006_add_section_visibility.sql', datetime('now'));

-- 4. Sync Table Data
`;

const tables = [
  'franchises',
  'franchise_watch_order',
  'anime',
  'anime_aliases',
  'anime_genres',
  'anime_vibes',
  'anime_characters',
  'anime_filler_ranges',
  'blog_posts',
  'blog_post_anime'
];

for (const table of tables) {
  const rows = db.prepare('SELECT * FROM ' + table).all();
  if (rows.length === 0) continue;
  
  sql += `\n-- Table: ${table} (${rows.length} rows)\n`;
  const cols = Object.keys(rows[0]);
  for (const row of rows) {
    const vals = cols.map(c => {
      const v = row[c];
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') return v;
      return "'" + String(v).replace(/'/g, "''") + "'";
    });
    sql += `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')});\n`;
  }
}

fs.writeFileSync('scratch/sync_to_remote.sql', sql, 'utf8');
console.log('Generated scratch/sync_to_remote.sql successfully. Total size:', sql.length, 'bytes');
