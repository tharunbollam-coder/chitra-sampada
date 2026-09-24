import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const dbPath = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/a0ffe8df0ce462ac9160ad5be213d411f9f2ecdfd4d85bbf872456bacfc0a02f.sqlite';
const db = new DatabaseSync(dbPath);

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

let sql = '-- Data Sync Export from Local SQLite\n';

for (const table of tables) {
  const rows = db.prepare('SELECT * FROM ' + table).all();
  if (rows.length === 0) continue;
  
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
  sql += '\n';
}

if (!fs.existsSync('scratch')) {
  fs.mkdirSync('scratch', { recursive: true });
}

fs.writeFileSync('scratch/remote_sync.sql', sql, 'utf8');
console.log('Exported remote_sync.sql successfully. Size:', sql.length, 'bytes');
