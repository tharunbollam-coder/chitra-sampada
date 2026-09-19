import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

let cachedDb = null;

function getSqliteDb() {
  if (cachedDb) return cachedDb;

  const d1Dir = path.resolve(process.cwd(), '.wrangler', 'state', 'v3', 'd1');
  if (!fs.existsSync(d1Dir)) {
    throw new Error(`Local D1 state directory not found at ${d1Dir}. Run 'npx wrangler d1 migrations apply chitra-sampada-db --local' first.`);
  }

  function findSqlite(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        const found = findSqlite(full);
        if (found) return found;
      } else if (f.endsWith('.sqlite')) {
        return full;
      }
    }
    return null;
  }

  const sqlitePath = findSqlite(d1Dir);
  if (!sqlitePath) {
    throw new Error(`No .sqlite database file found under ${d1Dir}`);
  }

  cachedDb = new DatabaseSync(sqlitePath);
  return cachedDb;
}

/**
 * Fetch all anime from D1 (or local D1 SQLite during build/prerender)
 * Formatted with camelCase properties matching the UI expectations.
 */
export function getAllAnime() {
  const db = getSqliteDb();

  // 1. Fetch all anime rows
  const animeRows = db.prepare(`
    SELECT * FROM anime ORDER BY year DESC, title ASC
  `).all();

  // 2. Fetch related collections
  const aliasesRows = db.prepare(`SELECT anime_id, alias FROM anime_aliases`).all();
  const genresRows = db.prepare(`SELECT anime_id, genre FROM anime_genres`).all();
  const vibesRows = db.prepare(`SELECT anime_id, vibe_id FROM anime_vibes`).all();
  const fillerRows = db.prepare(`SELECT anime_id, range, type, arc, range_order FROM anime_filler_ranges ORDER BY range_order ASC`).all();
  const characterRows = db.prepare(`SELECT anime_id, rank, name, category, role, commentary FROM anime_characters ORDER BY rank ASC`).all();
  const watchOrderRows = db.prepare(`SELECT franchise_id, step_order, title, type, episodes, anime_id, note FROM franchise_watch_order ORDER BY step_order ASC`).all();

  // Group helpers
  const aliasesMap = new Map();
  for (const row of aliasesRows) {
    if (!aliasesMap.has(row.anime_id)) aliasesMap.set(row.anime_id, []);
    aliasesMap.get(row.anime_id).push(row.alias);
  }

  const genresMap = new Map();
  for (const row of genresRows) {
    if (!genresMap.has(row.anime_id)) genresMap.set(row.anime_id, []);
    genresMap.get(row.anime_id).push(row.genre);
  }

  const vibesMap = new Map();
  for (const row of vibesRows) {
    if (!vibesMap.has(row.anime_id)) vibesMap.set(row.anime_id, []);
    vibesMap.get(row.anime_id).push(row.vibe_id);
  }

  const fillerMap = new Map();
  for (const row of fillerRows) {
    if (!fillerMap.has(row.anime_id)) fillerMap.set(row.anime_id, []);
    fillerMap.get(row.anime_id).push({
      range: row.range,
      type: row.type,
      arc: row.arc
    });
  }

  const charactersMap = new Map();
  for (const row of characterRows) {
    if (!charactersMap.has(row.anime_id)) charactersMap.set(row.anime_id, []);
    charactersMap.get(row.anime_id).push({
      rank: row.rank,
      name: row.name,
      category: row.category,
      role: row.role,
      commentary: row.commentary
    });
  }

  const watchOrderMap = new Map();
  for (const row of watchOrderRows) {
    if (!watchOrderMap.has(row.franchise_id)) watchOrderMap.set(row.franchise_id, []);
    watchOrderMap.get(row.franchise_id).push(row);
  }

  return animeRows.map((row) => {
    // Reconstruct review object if heading or paragraphs exist
    let review = null;
    let paragraphs = [];
    if (row.review_paragraphs) {
      try {
        paragraphs = JSON.parse(row.review_paragraphs);
      } catch (e) {
        paragraphs = [row.review_paragraphs];
      }
    }
    if (row.review_heading || paragraphs.length > 0) {
      review = {
        heading: row.review_heading,
        paragraphs
      };
    }

    // Reconstruct watchOrder sequence from franchise table
    const franchiseSteps = watchOrderMap.get(row.franchise_id) || [];
    const watchOrder = franchiseSteps.map((step) => ({
      order: step.step_order,
      title: step.title,
      type: step.type,
      episodes: step.episodes,
      // Current anime is highlighted if either step.anime_id matches or step_order matches franchise_step_order
      isCurrent: step.anime_id === row.id || step.step_order === row.franchise_step_order,
      note: step.note
    }));

    // Reconstruct fillerList
    const ranges = fillerMap.get(row.id) || [];
    let fillerList = null;
    if (ranges.length > 0) {
      const fillerCount = Math.round((row.filler_percentage / 100) * row.episodes);
      const canonCount = row.episodes - fillerCount;
      fillerList = {
        fillerEpisodes: fillerCount,
        canonEpisodes: canonCount,
        ranges
      };
    }

    // Reconstruct source
    let source = null;
    if (row.source_title || row.source_type) {
      source = {
        title: row.source_title,
        originalTitle: row.source_original_title,
        author: row.source_author,
        type: row.source_type,
        volumes: row.source_volumes,
        publicationStatus: row.source_publication_status,
        adaptationStatus: row.source_adaptation_status,
        coverage: row.source_coverage,
        notes: row.source_notes
      };
    }

    // Reconstruct powerSystem
    let powerSystem = null;
    if (row.power_system_name || row.power_system_paragraphs) {
      let powerParagraphs = [];
      if (row.power_system_paragraphs) {
        try {
          powerParagraphs = JSON.parse(row.power_system_paragraphs);
        } catch (e) {
          powerParagraphs = [row.power_system_paragraphs];
        }
      }
      powerSystem = {
        name: row.power_system_name,
        paragraphs: powerParagraphs
      };
    }

    // Reconstruct lessons
    let lessons = null;
    if (row.lesson_heading || row.lesson_takeaway) {
      lessons = {
        heading: row.lesson_heading,
        takeaway: row.lesson_takeaway
      };
    }

    return {
      id: row.id,
      slug: row.slug,
      aliases: aliasesMap.get(row.id) || [row.id, row.slug],
      title: row.title,
      originalTitle: row.original_title,
      year: row.year,
      episodes: row.episodes,
      status: row.status,
      personalRating: row.personal_rating !== null ? row.personal_rating : undefined,
      poster: row.poster,
      backdrop: row.backdrop,
      addedDate: row.added_date,
      lastUpdated: row.last_updated,
      honestyStatus: row.honesty_status,
      fillerPercentage: row.filler_percentage,
      genres: genresMap.get(row.id) || [],
      vibes: vibesMap.get(row.id) || [],
      trending: Boolean(row.trending),
      synopsis: row.synopsis,
      review,
      watchOrder,
      fillerList,
      characters: charactersMap.get(row.id) || [],
      source,
      powerSystem,
      lessons
    };
  });
}

/**
 * Helper function to retrieve all available section tabs for an anime object.
 * Returns only tabs that have actual data.
 * "My Take" ('review') is placed in the FIRST position when present.
 */
export function getAvailableTabs(anime) {
  if (!anime) return [];
  const tabs = [];

  // 1. My Take (FIRST position when present or when watched with a personal rating; NEVER for reference guides or un-watched)
  const isWatched = anime.honestyStatus === 'watched';
  const hasReviewContent = isWatched && anime.review && (
    anime.review.heading ||
    (Array.isArray(anime.review.paragraphs) && anime.review.paragraphs.length > 0)
  );
  const isWatchedWithRating = isWatched && (anime.personalRating !== undefined && anime.personalRating !== null);

  if (hasReviewContent || isWatchedWithRating) {
    tabs.push({ key: 'review', label: 'My Take' });
  }

  // 2. Watch Order
  if (anime.watchOrder && anime.watchOrder.length > 0) {
    tabs.push({ key: 'watch-order', label: 'Watch Order', count: anime.watchOrder.length });
  }

  // 3. Filler List
  if (anime.fillerList && anime.fillerList.ranges && anime.fillerList.ranges.length > 0) {
    tabs.push({ key: 'filler-list', label: 'Filler List' });
  }

  // 4. Characters
  if (anime.characters && anime.characters.length > 0) {
    tabs.push({ key: 'characters', label: 'Characters', count: anime.characters.length });
  }

  // 5. Manga & Light Novel
  if (anime.source && (anime.source.title || anime.source.type)) {
    tabs.push({ key: 'source', label: 'Manga & Light Novel' });
  }

  // 6. Power System
  if (anime.powerSystem && (anime.powerSystem.paragraphs?.length > 0 || anime.powerSystem.name)) {
    tabs.push({ key: 'power-system', label: 'Power System' });
  }

  return tabs;
}

/**
 * Helper function to determine the preferred default tab.
 * Prefers "My Take" ('review') if available; otherwise falls back to the first available tab.
 */
export function getDefaultTabKey(anime, availableTabs) {
  if (!availableTabs || availableTabs.length === 0) return null;
  const reviewTab = availableTabs.find((t) => t.key === 'review');
  if (reviewTab) {
    return 'review';
  }
  return availableTabs[0].key;
}