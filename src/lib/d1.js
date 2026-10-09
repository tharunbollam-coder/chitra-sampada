import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

let cachedDb = null;

export function getSqliteDb() {
  if (cachedDb) return cachedDb;

  let metaDir = null;
  try {
    if (typeof import.meta?.url === 'string' && import.meta.url.startsWith('file:')) {
      metaDir = path.resolve(fileURLToPath(new URL('../../', import.meta.url)).replace(/^[/\\](?=[a-zA-Z]:)/, ''), '.wrangler', 'state', 'v3', 'd1');
    }
  } catch {}

  const candidateDirs = [
    path.resolve(process.cwd(), '.wrangler', 'state', 'v3', 'd1'),
    ...(metaDir ? [metaDir] : []),
    'C:\\projects\\chitra-sampada\\.wrangler\\state\\v3\\d1'
  ];
  const d1Dir = candidateDirs.find(d => fs.existsSync(d));
  if (!d1Dir) {
    throw new Error(`Local D1 state directory not found at ${candidateDirs.join(', ')}. Run 'npx wrangler d1 migrations apply chitra-sampada-db --local' first.`);
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

function getDiagnosticsContext(contextOrLocals) {
  if (!contextOrLocals || typeof contextOrLocals !== 'object') return null;
  return contextOrLocals.locals || contextOrLocals;
}

function recordD1Timing(contextOrLocals, startedAt) {
  const context = getDiagnosticsContext(contextOrLocals);
  if (!context) return;

  const metrics = context.__chitraPerformance || (context.__chitraPerformance = {
    d1Duration: 0,
    d1Queries: 0
  });
  metrics.d1Duration += performance.now() - startedAt;
  metrics.d1Queries += 1;
}

function wrapD1(cfDb, contextOrLocals = null) {
  return {
    isD1: true,
    async query(sql, ...params) {
      const startedAt = performance.now();
      let stmt = cfDb.prepare(sql);
      if (params.length > 0) stmt = stmt.bind(...params);
      try {
        const res = await stmt.all();
        return res.results || [];
      } finally {
        recordD1Timing(contextOrLocals, startedAt);
      }
    },
    async queryOne(sql, ...params) {
      const startedAt = performance.now();
      let stmt = cfDb.prepare(sql);
      if (params.length > 0) stmt = stmt.bind(...params);
      try {
        return await stmt.first() || null;
      } finally {
        recordD1Timing(contextOrLocals, startedAt);
      }
    },
    async run(sql, ...params) {
      const startedAt = performance.now();
      let stmt = cfDb.prepare(sql);
      if (params.length > 0) stmt = stmt.bind(...params);
      try {
        return await stmt.run();
      } finally {
        recordD1Timing(contextOrLocals, startedAt);
      }
    }
  };
}

/**
 * Universal Database Accessor
 * Uses Cloudflare D1 binding (DB or chitra_sampada_db) when running in Cloudflare Workers / workerd,
 * and falls back to Node.js DatabaseSync when running in Node.js build or CLI tools.
 */
/**
 * @param {any} [contextOrLocals]
 */
export async function getDatabase(contextOrLocals = null) {
  let cfDb = null;

  // 1. Direct binding or context object passed
  if (contextOrLocals) {
    if (typeof contextOrLocals.prepare === 'function') {
      cfDb = contextOrLocals;
    } else if (contextOrLocals.DB && typeof contextOrLocals.DB.prepare === 'function') {
      cfDb = contextOrLocals.DB;
    } else if (contextOrLocals.chitra_sampada_db && typeof contextOrLocals.chitra_sampada_db.prepare === 'function') {
      cfDb = contextOrLocals.chitra_sampada_db;
    } else if (contextOrLocals.env?.DB && typeof contextOrLocals.env.DB.prepare === 'function') {
      cfDb = contextOrLocals.env.DB;
    } else if (contextOrLocals.env?.chitra_sampada_db && typeof contextOrLocals.env.chitra_sampada_db.prepare === 'function') {
      cfDb = contextOrLocals.env.chitra_sampada_db;
    }
  }

  // 2. Official Cloudflare Workers module import (Astro v6+ / @astrojs/cloudflare recommendation)
  if (!cfDb) {
    try {
      const cf = await import('cloudflare:workers');
      if (cf?.env?.DB && typeof cf.env.DB.prepare === 'function') {
        cfDb = cf.env.DB;
      } else if (cf?.env?.chitra_sampada_db && typeof cf.env.chitra_sampada_db.prepare === 'function') {
        cfDb = cf.env.chitra_sampada_db;
      }
    } catch {}
  }

  // 3. Global scope fallback
  if (!cfDb && typeof globalThis !== 'undefined') {
    if (globalThis.DB && typeof globalThis.DB.prepare === 'function') {
      cfDb = globalThis.DB;
    } else if (globalThis.env?.DB && typeof globalThis.env.DB.prepare === 'function') {
      cfDb = globalThis.env.DB;
    } else if (globalThis.env?.chitra_sampada_db && typeof globalThis.env.chitra_sampada_db.prepare === 'function') {
      cfDb = globalThis.env.chitra_sampada_db;
    }
  }

  if (cfDb && typeof cfDb.prepare === 'function') {
    return wrapD1(cfDb, contextOrLocals);
  }

  // 4. Check if running in Cloudflare Workers runtime where Node SQLite is completely unavailable
  const isCloudflare = 
    (typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers') ||
    (typeof WebSocketPair !== 'undefined') ||
    (typeof process === 'undefined') ||
    (!process.versions?.node);

  if (isCloudflare) {
    throw new Error("Cloudflare D1 database binding 'DB' was not found in Astro.locals.runtime.env or cloudflare:workers.");
  }

  // 5. Local Node.js / CLI / Build environment fallback
  const sqlite = getSqliteDb();
  const wrapped = {
    isD1: false,
    async query(sql, ...params) {
      const startedAt = performance.now();
      try {
        return sqlite.prepare(sql).all(...params);
      } finally {
        recordD1Timing(contextOrLocals, startedAt);
      }
    },
    async queryOne(sql, ...params) {
      const startedAt = performance.now();
      try {
        return sqlite.prepare(sql).get(...params) || null;
      } finally {
        recordD1Timing(contextOrLocals, startedAt);
      }
    },
    async run(sql, ...params) {
      const startedAt = performance.now();
      try {
        return sqlite.prepare(sql).run(...params);
      } finally {
        recordD1Timing(contextOrLocals, startedAt);
      }
    }
  };
  return wrapped;
}

let animeCache = {
  data: null,
  timestamp: 0
};

let compactAnimeCache = {
  data: null,
  timestamp: 0
};

let blogCache = {
  data: null,
  timestamp: 0
};

let siteSettingsCache = {
  data: new Map(),
  timestamp: 0
};

let vibesCache = {
  data: null,
  timestamp: 0
};

export { optimizeTmdbPoster } from './image-utils.js';

export function invalidateAnimeCache() {
  animeCache.data = null;
  animeCache.timestamp = 0;
  compactAnimeCache.data = null;
  compactAnimeCache.timestamp = 0;
}

/**
 * Fetch lightweight compact anime list for card grids, catalog listings, and vibe pages.
 * Queries ONLY essential card columns (omits heavy reviews, lore, character lists,
 * watch orders, related universe media, blog linkages, and streaming platform records).
 * @param {any} [contextOrLocals]
 */
export async function getCompactAnimeList(contextOrLocals = null) {
  const now = Date.now();
  if (compactAnimeCache.data && (now - compactAnimeCache.timestamp < 30000)) {
    return compactAnimeCache.data;
  }

  const db = await getDatabase(contextOrLocals);

  const [animeRes, genresRes, vibesRes, fillerRes] = await Promise.allSettled([
    db.query(`SELECT id, slug, title, year, type, runtime, episodes, status, poster, honesty_status, filler_percentage, trending, community_suggested, personal_rating FROM anime ORDER BY year DESC, title ASC`),
    db.query(`SELECT anime_id, genre FROM anime_genres`),
    db.query(`SELECT anime_id, vibe_id FROM anime_vibes`),
    db.query(`SELECT anime_id, type, episodes, episode_count FROM anime_filler_ranges`)
  ]);

  const animeRows = animeRes.status === 'fulfilled' ? animeRes.value : [];
  const genresRows = genresRes.status === 'fulfilled' ? genresRes.value : [];
  const vibesRows = vibesRes.status === 'fulfilled' ? vibesRes.value : [];
  const fillerRows = fillerRes.status === 'fulfilled' ? fillerRes.value : [];

  if (animeRes.status === 'rejected') {
    console.error("Failed to query compact anime list:", animeRes.reason);
    return [];
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
    if (!fillerMap.has(row.anime_id)) fillerMap.set(row.anime_id, { fillerCount: 0, totalCount: 0 });
    const stat = fillerMap.get(row.anime_id);
    const epVal = row.episodes || '';
    const epCount = typeof row.episode_count === 'number' && row.episode_count > 0
      ? row.episode_count
      : (epVal ? epVal.split(',').length : 0);
    if (epVal && epVal.trim().length > 0) {
      stat.totalCount += epCount;
      if (row.type === 'Filler') {
        stat.fillerCount += epCount;
      }
    }
  }

  const formatted = animeRows.map((row) => {
    const fillerInfo = fillerMap.get(row.id);
    let fillerPercentage = row.filler_percentage;
    let episodes = row.episodes || 0;

    if (fillerInfo && fillerInfo.totalCount > 0) {
      fillerPercentage = Math.round((fillerInfo.fillerCount / fillerInfo.totalCount) * 100);
      episodes = episodes || fillerInfo.totalCount;
    }

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      year: row.year,
      type: row.type || 'series',
      runtime: (row.runtime !== null && row.runtime !== undefined && row.runtime !== '') ? Number(row.runtime) : null,
      episodes,
      status: row.status,
      personalRating: (row.personal_rating !== null && row.personal_rating !== undefined && row.personal_rating !== '') ? Number(row.personal_rating) : undefined,
      personal_rating: (row.personal_rating !== null && row.personal_rating !== undefined && row.personal_rating !== '') ? Number(row.personal_rating) : undefined,
      poster: row.poster,
      honestyStatus: row.honesty_status,
      fillerPercentage,
      genres: genresMap.get(row.id) || [],
      vibes: vibesMap.get(row.id) || [],
      trending: Boolean(row.trending),
      communitySuggested: Boolean(row.community_suggested)
    };
  });

  compactAnimeCache.data = formatted;
  compactAnimeCache.timestamp = Date.now();
  return formatted;
}

export function invalidateBlogCache() {
  blogCache.data = null;
  blogCache.timestamp = 0;
}

export function invalidateSiteSettingsCache() {
  siteSettingsCache.data.clear();
  siteSettingsCache.timestamp = 0;
}

export function invalidateVibesCache() {
  vibesCache.data = null;
  vibesCache.timestamp = 0;
}

/**
 * Fetch all anime from D1 (or local D1 SQLite during build/prerender)
 * Formatted with camelCase properties matching the UI expectations.
 * @param {any} [contextOrLocals]
 */
export async function getAllAnime(contextOrLocals = null) {
  const now = Date.now();
  if (animeCache.data && (now - animeCache.timestamp < 30000)) {
    return animeCache.data;
  }

  const db = await getDatabase(contextOrLocals);

  // Parallelize all 9 sub-queries concurrently via Promise.allSettled to eliminate query waterfalls
  const [
    animeRes,
    aliasesRes,
    genresRes,
    vibesRes,
    fillerRes,
    charRes,
    watchRes,
    universeRes,
    recsRes,
    blogRes,
    streamingRes
  ] = await Promise.allSettled([
    db.query(`SELECT * FROM anime ORDER BY year DESC, title ASC`),
    db.query(`SELECT anime_id, alias FROM anime_aliases`),
    db.query(`SELECT anime_id, genre FROM anime_genres`),
    db.query(`SELECT anime_id, vibe_id FROM anime_vibes`),
    db.query(`SELECT * FROM anime_filler_ranges`),
    db.query(`SELECT anime_id, rank, name, category, role, commentary FROM anime_characters ORDER BY rank ASC`),
    db.query(`SELECT franchise_id, step_order, title, type, episodes, anime_id, note FROM franchise_watch_order ORDER BY step_order ASC`),
    db.query(`SELECT id, anime_id, section, title, badge, link_slug, editorial_note, item_order FROM anime_related_media ORDER BY item_order ASC, id ASC`),
    db.query(`SELECT id, anime_id, target_anime_id, category_badge, editorial_note, item_order FROM anime_recommendations ORDER BY item_order ASC, id ASC`),
    db.query(`SELECT id, slug, title, status FROM blog_posts`),
    db.query(`SELECT id, anime_id, platform_name, stream_url, logo_url, note, display_order, is_active FROM anime_streaming_platforms ORDER BY display_order ASC, id ASC`)
  ]);

  const animeRows = animeRes.status === 'fulfilled' ? animeRes.value : [];
  const aliasesRows = aliasesRes.status === 'fulfilled' ? aliasesRes.value : [];
  const genresRows = genresRes.status === 'fulfilled' ? genresRes.value : [];
  const vibesRows = vibesRes.status === 'fulfilled' ? vibesRes.value : [];
  const fillerRows = fillerRes.status === 'fulfilled' ? fillerRes.value : [];
  const characterRows = charRes.status === 'fulfilled' ? charRes.value : [];
  const watchOrderRows = watchRes.status === 'fulfilled' ? watchRes.value : [];
  const universeRows = universeRes.status === 'fulfilled' ? universeRes.value : [];
  const recsRows = recsRes.status === 'fulfilled' ? recsRes.value : [];
  const blogRows = blogRes.status === 'fulfilled' ? blogRes.value : [];
  const streamingRows = streamingRes.status === 'fulfilled' ? streamingRes.value : [];

  if (animeRes.status === 'rejected') {
    console.error("Failed to query anime table:", animeRes.reason);
    return [];
  }

  const blogPostMap = new Map();
  for (const bp of blogRows) {
    blogPostMap.set(bp.slug, { id: bp.id, slug: bp.slug, title: bp.title, status: bp.status });
  }

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
    const epVal = row.episodes || row.range || '';
    const epCount = typeof row.episode_count === 'number'
      ? row.episode_count
      : (epVal ? epVal.split(',').length : 0);
    fillerMap.get(row.anime_id).push({
      type: row.type,
      episodes: epVal,
      count: epCount
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

  const universeMap = new Map();
  for (const row of universeRows) {
    if (!universeMap.has(row.anime_id)) universeMap.set(row.anime_id, []);
    universeMap.get(row.anime_id).push({
      id: row.id,
      section: row.section,
      title: row.title,
      badge: row.badge,
      linkSlug: row.link_slug,
      editorialNote: row.editorial_note,
      itemOrder: row.item_order
    });
  }

  const recsMap = new Map();
  for (const row of recsRows) {
    if (!recsMap.has(row.anime_id)) recsMap.set(row.anime_id, []);
    recsMap.get(row.anime_id).push(row);
  }

  const streamingMap = new Map();
  for (const row of streamingRows) {
    if (!streamingMap.has(row.anime_id)) streamingMap.set(row.anime_id, []);
    streamingMap.get(row.anime_id).push({
      id: row.id,
      platformName: row.platform_name,
      streamUrl: row.stream_url,
      logoUrl: row.logo_url,
      note: row.note,
      displayOrder: row.display_order,
      isActive: row.is_active !== 0
    });
  }

  const animeSlugMap = new Map();
  const animeTitleMap = new Map();
  const animeMapById = new Map();
  for (const a of animeRows) {
    animeSlugMap.set(a.id, a.slug);
    animeMapById.set(a.id, a);
    if (a.title) animeTitleMap.set(a.title.trim().toLowerCase(), a.slug);
  }

  const formattedAnime = animeRows.map((row) => {
    // Reconstruct review object if heading or paragraphs exist
    let review = null;
    const reviewText = row.review_paragraphs || '';
    if (row.review_heading || reviewText.trim().length > 0) {
      review = {
        heading: row.review_heading,
        paragraphs: reviewText,
        text: reviewText,
        type: (row.review_type === 'quick' || row.review_type === 'quick_take') ? 'quick' : 'full',
        spoilerLevel: row.review_spoiler_level || 'none'
      };
    }

    // Reconstruct watchOrder sequence from franchise table
    const franchiseSteps = watchOrderMap.get(row.franchise_id) || [];
    const watchOrder = franchiseSteps.map((step) => {
      const stepTitleClean = (step.title || '').trim().toLowerCase();
      const resolvedSlug = (step.anime_id && animeSlugMap.get(step.anime_id)) ||
        animeTitleMap.get(stepTitleClean) ||
        step.anime_id ||
        null;

      return {
        order: step.step_order,
        title: step.title,
        type: step.type,
        episodes: step.episodes,
        animeId: step.anime_id,
        slug: resolvedSlug,
        // Current anime is highlighted if either step.anime_id matches or step_order matches franchise_step_order
        isCurrent: step.anime_id === row.id || step.step_order === row.franchise_step_order,
        note: step.note
      };
    });

    // Reconstruct fillerList
    const rawFillerEntries = fillerMap.get(row.id) || [];
    let fillerList = null;
    const activeFillerTypes = rawFillerEntries.filter(e => e.episodes && e.episodes.trim().length > 0);

    if (activeFillerTypes.length > 0) {
      let mangaCanonCount = 0;
      let animeCanonCount = 0;
      let mixedCount = 0;
      let fillerCount = 0;

      for (const entry of activeFillerTypes) {
        if (entry.type === 'Manga Canon') mangaCanonCount = entry.count;
        else if (entry.type === 'Anime Canon') animeCanonCount = entry.count;
        else if (entry.type === 'Mixed Canon/Filler') mixedCount = entry.count;
        else if (entry.type === 'Filler') fillerCount = entry.count;
      }

      const totalCanonCount = mangaCanonCount + animeCanonCount;
      const totalEpisodes = mangaCanonCount + animeCanonCount + mixedCount + fillerCount;
      const calculatedFillerPercentage = totalEpisodes > 0 ? Math.round((fillerCount / totalEpisodes) * 100) : 0;

      fillerList = {
        totalEpisodes,
        fillerEpisodes: fillerCount,
        canonEpisodes: totalCanonCount,
        mangaCanonEpisodes: mangaCanonCount,
        animeCanonEpisodes: animeCanonCount,
        mixedEpisodes: mixedCount,
        fillerPercentage: calculatedFillerPercentage,
        types: activeFillerTypes.map(t => ({
          type: t.type,
          episodes: t.episodes,
          count: t.count
        }))
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
    const powerText = row.power_system_paragraphs || '';
    if (row.power_system_name || powerText.trim().length > 0) {
      powerSystem = {
        name: row.power_system_name,
        paragraphs: powerText,
        text: powerText
      };
    }

    // Reconstruct lessons
    let lessons = null;
    const lessonTakeaway = row.lesson_takeaway || '';
    if (lessonTakeaway.trim().length > 0) {
      lessons = {
        takeaway: lessonTakeaway,
        paragraphs: lessonTakeaway,
        text: lessonTakeaway
      };
    }

    // Reconstruct sectionVisibility
    let sectionVisibility = {
      review: true,
      lessons: true,
      watchOrder: true,
      fillerList: true,
      characters: true,
      source: true,
      powerSystem: true,
      universe: true,
      recommendations: true,
      streaming: true
    };
    if (row.section_visibility) {
      try {
        sectionVisibility = { ...sectionVisibility, ...JSON.parse(row.section_visibility) };
      } catch {}
    }

    const rawRecs = recsMap.get(row.id) || [];
    const recommendations = rawRecs.map(rec => {
      const target = animeMapById.get(rec.target_anime_id);
      return {
        id: rec.id,
        targetAnimeId: rec.target_anime_id,
        targetTitle: target?.title || '',
        targetSlug: target?.slug || '',
        targetPoster: target?.poster || '',
        targetYear: target?.year || null,
        targetStatus: target?.status || '',
        targetRating: target?.personal_rating !== null && target?.personal_rating !== undefined ? target.personal_rating : undefined,
        categoryBadge: rec.category_badge,
        editorialNote: rec.editorial_note,
        itemOrder: rec.item_order
      };
    });

    return {
      id: row.id,
      slug: row.slug,
      aliases: aliasesMap.get(row.id) || [row.id, row.slug],
      title: row.title,
      originalTitle: row.original_title,
      year: row.year,
      type: row.type || 'series',
      runtime: (row.runtime !== null && row.runtime !== undefined && row.runtime !== '') ? Number(row.runtime) : null,
      movieCanonType: row.movie_canon_type || null,
      episodes: row.episodes || fillerList?.totalEpisodes || 0,
      status: row.status,
      personalRating: (row.personal_rating !== null && row.personal_rating !== undefined && row.personal_rating !== '') ? Number(row.personal_rating) : undefined,
      personal_rating: (row.personal_rating !== null && row.personal_rating !== undefined && row.personal_rating !== '') ? Number(row.personal_rating) : undefined,
      ageRating: (row.age_rating !== null && row.age_rating !== undefined && row.age_rating !== '') ? Number(row.age_rating) : null,
      poster: row.poster,
      backdrop: row.backdrop,
      addedDate: row.added_date,
      lastUpdated: row.last_updated,
      honestyStatus: row.honesty_status,
      fillerPercentage: (fillerList && fillerList.totalEpisodes > 0) ? fillerList.fillerPercentage : row.filler_percentage,
      genres: genresMap.get(row.id) || [],
      vibes: vibesMap.get(row.id) || [],
      trending: Boolean(row.trending),
      communitySuggested: Boolean(row.community_suggested),
      synopsis: row.synopsis,
      review,
      watchOrder,
      watchOrderNote: row.watch_order_note || null,
      fillerList,
      fillerNote: row.filler_note || null,
      characters: charactersMap.get(row.id) || [],
      characterRelatedPostSlug: row.character_related_post_slug || null,
      characterRelatedPost: (row.character_related_post_slug && blogPostMap.has(row.character_related_post_slug))
        ? blogPostMap.get(row.character_related_post_slug)
        : (row.character_related_post_slug ? { slug: row.character_related_post_slug, title: 'Related Article' } : null),
      source,
      powerSystem,
      lessons,
      review_paragraphs: reviewText,
      power_system_paragraphs: powerText,
      lesson_takeaway: lessonTakeaway,
      what_i_learned_paragraphs: lessonTakeaway,
      universe: universeMap.get(row.id) || [],
      recommendations,
      streamingPlatforms: streamingMap.get(row.id) || [],
      sectionVisibility
    };
  });

  animeCache.data = formattedAnime;
  animeCache.timestamp = Date.now();
  return formattedAnime;
}

/**
 * Fetch exactly one anime detail record and its displayed relations.
 * This is intentionally read-only and avoids loading the full catalogue for a detail page.
 * @param {string} slugOrId
 * @param {any} [contextOrLocals]
 */
export async function getAnimeDetailBySlugOrId(slugOrId, contextOrLocals = null) {
  if (!slugOrId) return null;

  const db = await getDatabase(contextOrLocals);
  const anime = await db.queryOne(`
    SELECT
      a.id, a.slug, a.title, a.original_title, a.year, a.type, a.runtime,
      a.movie_canon_type, a.episodes, a.status, a.personal_rating,
      a.age_rating, a.poster, a.backdrop, a.added_date, a.last_updated,
      a.honesty_status, a.filler_percentage, a.trending, a.community_suggested,
      a.synopsis, a.franchise_id, a.franchise_step_order, a.review_heading,
      a.review_paragraphs, a.review_type, a.review_spoiler_level,
      a.source_title, a.source_original_title, a.source_author, a.source_type,
      a.source_volumes, a.source_publication_status, a.source_adaptation_status,
      a.source_coverage, a.source_notes, a.power_system_name,
      a.power_system_paragraphs, a.lesson_takeaway, a.watch_order_note,
      a.filler_note, a.character_related_post_slug, a.section_visibility
    FROM anime a
    LEFT JOIN anime_aliases aa ON aa.anime_id = a.id
    WHERE a.slug = ? OR a.id = ? OR aa.alias = ?
    LIMIT 1
  `, slugOrId, slugOrId, slugOrId);

  if (!anime) return null;

  const [
    aliases,
    genres,
    vibes,
    fillerRows,
    characters,
    watchOrder,
    universe,
    recommendations,
    streamingPlatforms,
    relatedPost
  ] = await Promise.all([
    db.query(`SELECT alias FROM anime_aliases WHERE anime_id = ?`, anime.id),
    db.query(`SELECT genre FROM anime_genres WHERE anime_id = ?`, anime.id),
    db.query(`SELECT vibe_id FROM anime_vibes WHERE anime_id = ?`, anime.id),
    db.query(`
      SELECT type, episodes, episode_count
      FROM anime_filler_ranges
      WHERE anime_id = ?
      ORDER BY range_order ASC
    `, anime.id),
    db.query(`
      SELECT rank, name, category, role, commentary
      FROM anime_characters
      WHERE anime_id = ?
      ORDER BY rank ASC
    `, anime.id),
    anime.franchise_id
      ? db.query(`
          SELECT fwo.step_order, fwo.title, fwo.type, fwo.episodes, fwo.anime_id, fwo.note,
                 target.slug AS target_slug
          FROM franchise_watch_order fwo
          LEFT JOIN anime target ON target.id = fwo.anime_id
            OR LOWER(TRIM(target.title)) = LOWER(TRIM(fwo.title))
          WHERE fwo.franchise_id = ?
          ORDER BY fwo.step_order ASC
        `, anime.franchise_id)
      : Promise.resolve([]),
    db.query(`
      SELECT id, section, title, badge, link_slug, editorial_note, item_order
      FROM anime_related_media
      WHERE anime_id = ?
      ORDER BY item_order ASC, id ASC
    `, anime.id),
    db.query(`
      SELECT
        r.id, r.target_anime_id, r.category_badge, r.editorial_note, r.item_order,
        target.title AS target_title, target.slug AS target_slug, target.poster AS target_poster,
        target.year AS target_year, target.status AS target_status,
        target.personal_rating AS target_rating
      FROM anime_recommendations r
      JOIN anime target ON target.id = r.target_anime_id
      WHERE r.anime_id = ?
      ORDER BY r.item_order ASC, r.id ASC
    `, anime.id),
    db.query(`
      SELECT id, platform_name, stream_url, logo_url, note, display_order, is_active
      FROM anime_streaming_platforms
      WHERE anime_id = ?
      ORDER BY display_order ASC, id ASC
    `, anime.id),
    anime.character_related_post_slug
      ? db.queryOne(`
          SELECT id, slug, title, status
          FROM blog_posts
          WHERE slug = ?
          LIMIT 1
        `, anime.character_related_post_slug)
      : Promise.resolve(null)
  ]);

  const fillerEntries = fillerRows.map((row) => {
    const episodes = row.episodes || '';
    return {
      type: row.type,
      episodes,
      count: typeof row.episode_count === 'number' && row.episode_count >= 0
        ? row.episode_count
        : (episodes ? episodes.split(',').length : 0)
    };
  }).filter((row) => row.episodes.trim().length > 0);

  const countFor = (type) => fillerEntries.find((entry) => entry.type === type)?.count || 0;
  const mangaCanonEpisodes = countFor('Manga Canon');
  const animeCanonEpisodes = countFor('Anime Canon');
  const mixedEpisodes = countFor('Mixed Canon/Filler');
  const fillerEpisodes = countFor('Filler');
  const totalEpisodes = mangaCanonEpisodes + animeCanonEpisodes + mixedEpisodes + fillerEpisodes;
  const fillerList = fillerEntries.length > 0 ? {
    totalEpisodes,
    fillerEpisodes,
    canonEpisodes: mangaCanonEpisodes + animeCanonEpisodes,
    mangaCanonEpisodes,
    animeCanonEpisodes,
    mixedEpisodes,
    fillerPercentage: totalEpisodes > 0 ? Math.round((fillerEpisodes / totalEpisodes) * 100) : 0,
    types: fillerEntries
  } : null;

  let sectionVisibility = {
    review: true,
    lessons: true,
    watchOrder: true,
    fillerList: true,
    characters: true,
    source: true,
    powerSystem: true,
    universe: true,
    recommendations: true,
    streaming: true
  };
  if (anime.section_visibility) {
    try {
      sectionVisibility = { ...sectionVisibility, ...JSON.parse(anime.section_visibility) };
    } catch {}
  }

  const reviewText = anime.review_paragraphs || '';
  const powerText = anime.power_system_paragraphs || '';
  const lessonTakeaway = anime.lesson_takeaway || '';

  return {
    id: anime.id,
    slug: anime.slug,
    aliases: aliases.length > 0 ? aliases.map((row) => row.alias) : [anime.id, anime.slug],
    title: anime.title,
    originalTitle: anime.original_title,
    year: anime.year,
    type: anime.type || 'series',
    runtime: anime.runtime !== null && anime.runtime !== undefined && anime.runtime !== '' ? Number(anime.runtime) : null,
    movieCanonType: anime.movie_canon_type || null,
    episodes: anime.episodes || fillerList?.totalEpisodes || 0,
    status: anime.status,
    personalRating: anime.personal_rating !== null && anime.personal_rating !== undefined && anime.personal_rating !== '' ? Number(anime.personal_rating) : undefined,
    personal_rating: anime.personal_rating !== null && anime.personal_rating !== undefined && anime.personal_rating !== '' ? Number(anime.personal_rating) : undefined,
    ageRating: anime.age_rating !== null && anime.age_rating !== undefined && anime.age_rating !== '' ? Number(anime.age_rating) : null,
    poster: anime.poster,
    backdrop: anime.backdrop,
    addedDate: anime.added_date,
    lastUpdated: anime.last_updated,
    honestyStatus: anime.honesty_status,
    fillerPercentage: fillerList?.totalEpisodes > 0 ? fillerList.fillerPercentage : anime.filler_percentage,
    genres: genres.map((row) => row.genre),
    vibes: vibes.map((row) => row.vibe_id),
    trending: Boolean(anime.trending),
    communitySuggested: Boolean(anime.community_suggested),
    synopsis: anime.synopsis,
    review: reviewText.trim().length > 0 || anime.review_heading ? {
      heading: anime.review_heading,
      paragraphs: reviewText,
      text: reviewText,
      type: anime.review_type === 'quick' || anime.review_type === 'quick_take' ? 'quick' : 'full',
      spoilerLevel: anime.review_spoiler_level || 'none'
    } : null,
    watchOrder: watchOrder.map((step) => ({
      order: step.step_order,
      title: step.title,
      type: step.type,
      episodes: step.episodes,
      animeId: step.anime_id,
      slug: step.target_slug || step.anime_id || null,
      isCurrent: step.anime_id === anime.id || step.step_order === anime.franchise_step_order,
      note: step.note
    })),
    watchOrderNote: anime.watch_order_note || null,
    fillerList,
    fillerNote: anime.filler_note || null,
    characters,
    characterRelatedPostSlug: anime.character_related_post_slug || null,
    characterRelatedPost: relatedPost || (anime.character_related_post_slug ? { slug: anime.character_related_post_slug, title: 'Related Article' } : null),
    source: anime.source_title || anime.source_type ? {
      title: anime.source_title,
      originalTitle: anime.source_original_title,
      author: anime.source_author,
      type: anime.source_type,
      volumes: anime.source_volumes,
      publicationStatus: anime.source_publication_status,
      adaptationStatus: anime.source_adaptation_status,
      coverage: anime.source_coverage,
      notes: anime.source_notes
    } : null,
    powerSystem: anime.power_system_name || powerText.trim().length > 0 ? {
      name: anime.power_system_name,
      paragraphs: powerText,
      text: powerText
    } : null,
    lessons: lessonTakeaway.trim().length > 0 ? {
      takeaway: lessonTakeaway,
      paragraphs: lessonTakeaway,
      text: lessonTakeaway
    } : null,
    review_paragraphs: reviewText,
    power_system_paragraphs: powerText,
    lesson_takeaway: lessonTakeaway,
    what_i_learned_paragraphs: lessonTakeaway,
    universe: universe.map((row) => ({
      id: row.id,
      section: row.section,
      title: row.title,
      badge: row.badge,
      linkSlug: row.link_slug,
      editorialNote: row.editorial_note,
      itemOrder: row.item_order
    })),
    recommendations: recommendations.map((row) => ({
      id: row.id,
      targetAnimeId: row.target_anime_id,
      targetTitle: row.target_title || '',
      targetSlug: row.target_slug || '',
      targetPoster: row.target_poster || '',
      targetYear: row.target_year || null,
      targetStatus: row.target_status || '',
      targetRating: row.target_rating !== null && row.target_rating !== undefined ? row.target_rating : undefined,
      categoryBadge: row.category_badge,
      editorialNote: row.editorial_note,
      itemOrder: row.item_order
    })),
    streamingPlatforms: streamingPlatforms.map((row) => ({
      id: row.id,
      platformName: row.platform_name,
      streamUrl: row.stream_url,
      logoUrl: row.logo_url,
      note: row.note,
      displayOrder: row.display_order,
      isActive: row.is_active !== 0
    })),
    sectionVisibility
  };
}

/**
 * Helper function to retrieve all available section tabs for an anime object.
 * Returns only tabs that have actual data AND have their Admin visibility toggle set to "Show".
 * "My Take" ('review') is placed in the FIRST position when present.
 */
export function getAvailableTabs(anime) {
  if (!anime) return [];
  const tabs = [];
  const vis = anime.sectionVisibility || {};

  // 1. My Take / Quick Take (FIRST position when present; NEVER for reference guides, un-watched, or when no review text is written)
  const isWatched = anime.honestyStatus === 'watched';
  const hasReviewContent = isWatched && Boolean(
    anime.review && (
      (anime.review.heading && anime.review.heading.trim().length > 0) ||
      (typeof anime.review.paragraphs === 'string' && anime.review.paragraphs.trim().length > 0) ||
      (typeof anime.review.text === 'string' && anime.review.text.trim().length > 0) ||
      (typeof anime.review_paragraphs === 'string' && anime.review_paragraphs.trim().length > 0)
    )
  );

  if (hasReviewContent && vis.review !== false) {
    const reviewTabLabel = anime.review?.type === 'quick' ? 'Quick Take' : 'My Take';
    tabs.push({ key: 'review', label: reviewTabLabel });
  }

  // 2. What I Learned (Personal reflections / philosophical takeaways)
  const hasLessonsContent = isWatched && Boolean(
    anime.lessons && (
      (typeof anime.lessons === 'string' && anime.lessons.trim().length > 0) ||
      (anime.lessons.takeaway && anime.lessons.takeaway.trim().length > 0) ||
      (typeof anime.lessons.paragraphs === 'string' && anime.lessons.paragraphs.trim().length > 0) ||
      (typeof anime.lesson_takeaway === 'string' && anime.lesson_takeaway.trim().length > 0) ||
      (typeof anime.what_i_learned_paragraphs === 'string' && anime.what_i_learned_paragraphs.trim().length > 0)
    )
  );
  if (hasLessonsContent && vis.lessons !== false) {
    tabs.push({ key: 'lessons', label: 'What I Learned' });
  }

  // 3. Watch Order
  const hasWatchOrderSteps = anime.watchOrder && anime.watchOrder.length > 0;
  const hasWatchOrderNote = Boolean(anime.watchOrderNote && anime.watchOrderNote.trim().length > 0);
  if ((hasWatchOrderSteps || hasWatchOrderNote) && vis.watchOrder !== false) {
    tabs.push({
      key: 'watch-order',
      label: 'Watch Order',
      ...(hasWatchOrderSteps ? { count: anime.watchOrder.length } : {})
    });
  }

  // 4. Filler List (Movies can show Filler tab if fillerNote exists)
  const hasFillerData = anime.type !== 'movie' && anime.fillerList && anime.fillerList.types && anime.fillerList.types.length > 0;
  const hasFillerNote = Boolean(anime.fillerNote && anime.fillerNote.trim().length > 0);
  if ((hasFillerData || hasFillerNote) && vis.fillerList !== false) {
    tabs.push({ key: 'filler-list', label: 'Filler List' });
  }

  // 4. Characters
  if (anime.characters && anime.characters.length > 0 && vis.characters !== false) {
    tabs.push({ key: 'characters', label: 'Characters', count: anime.characters.length });
  }

  // 5. Manga & Light Novel
  const hasSourceContent = Boolean(
    anime.source && (
      (anime.source.title && anime.source.title.trim().length > 0) ||
      (anime.source.coverage && anime.source.coverage.trim().length > 0) ||
      (anime.source.volumes && anime.source.volumes.trim().length > 0) ||
      (anime.source.notes && anime.source.notes.trim().length > 0) ||
      (anime.source.author && anime.source.author.trim().length > 0)
    )
  );
  if (hasSourceContent && vis.source !== false) {
    tabs.push({ key: 'source', label: 'Manga & Light Novel' });
  }

  // 6. Power System
  const hasPowerContent = Boolean(
    anime.powerSystem && (
      (anime.powerSystem.name && anime.powerSystem.name.trim().length > 0) ||
      (typeof anime.powerSystem.paragraphs === 'string' && anime.powerSystem.paragraphs.trim().length > 0) ||
      (typeof anime.powerSystem.text === 'string' && anime.powerSystem.text.trim().length > 0) ||
      (typeof anime.power_system_paragraphs === 'string' && anime.power_system_paragraphs.trim().length > 0)
    )
  );
  if (hasPowerContent && vis.powerSystem !== false) {
    tabs.push({ key: 'power-system', label: 'Power System' });
  }

  // 7. Related & Universe Media
  if (anime.universe && anime.universe.length > 0 && vis.universe !== false) {
    tabs.push({ key: 'universe', label: 'Related & Universe', count: anime.universe.length });
  }

  // 8. Shows Like This (Recommendations)
  if (anime.recommendations && anime.recommendations.length > 0 && vis.recommendations !== false) {
    tabs.push({ key: 'recommendations', label: 'Shows Like This', count: anime.recommendations.length });
  }

  return tabs;
}

/**
 * Fetch all blog posts from D1 SQLite (optionally including drafts)
/**
 * @param {any} [optionsOrContext]
 * @param {any} [contextOrLocals]
 */
export async function getAllBlogPosts(optionsOrContext = {}, contextOrLocals = null) {
  let includeDrafts = false;
  let ctx = contextOrLocals;

  if (optionsOrContext) {
    if (optionsOrContext.runtime || optionsOrContext.locals || optionsOrContext.env || optionsOrContext.DB || optionsOrContext.prepare) {
      ctx = optionsOrContext;
    } else {
      if (typeof optionsOrContext.includeDrafts === 'boolean') {
        includeDrafts = optionsOrContext.includeDrafts;
      }
      if (optionsOrContext.contextOrLocals || optionsOrContext.locals) {
        ctx = optionsOrContext.contextOrLocals || optionsOrContext.locals;
      }
    }
  }

  const now = Date.now();
  if (!includeDrafts && blogCache.data && (now - blogCache.timestamp < 30000)) {
    return blogCache.data;
  }

  const db = await getDatabase(ctx);
  const query = includeDrafts
    ? `
        SELECT id, slug, title, excerpt, published_date, last_updated, status,
               MAX(1, CAST((LENGTH(TRIM(content)) - LENGTH(REPLACE(TRIM(content), ' ', '')) + 200) / 200 AS INTEGER)) AS read_time_minutes
        FROM blog_posts
        ORDER BY published_date DESC
      `
    : `
        SELECT id, slug, title, excerpt, published_date, last_updated, status,
               MAX(1, CAST((LENGTH(TRIM(content)) - LENGTH(REPLACE(TRIM(content), ' ', '')) + 200) / 200 AS INTEGER)) AS read_time_minutes
        FROM blog_posts
        WHERE status = 'published'
        ORDER BY published_date DESC
      `;

  // Parallelize blog post query and linked anime query
  const [postsRes, linksRes] = await Promise.allSettled([
    db.query(query),
    db.query(`
      SELECT bpa.post_id, a.id, a.slug, a.title, a.year, a.honesty_status
      FROM blog_post_anime bpa
      JOIN anime a ON bpa.anime_id = a.id
      ORDER BY a.title ASC
    `)
  ]);

  const postRows = postsRes.status === 'fulfilled' ? postsRes.value : [];
  const linkRows = linksRes.status === 'fulfilled' ? linksRes.value : [];

  const linksMap = new Map();
  for (const row of linkRows) {
    if (!linksMap.has(row.post_id)) linksMap.set(row.post_id, []);
    linksMap.get(row.post_id).push({
      id: row.id,
      slug: row.slug,
      title: row.title,
      year: row.year,
      honestyStatus: row.honesty_status
    });
  }

  const formattedPosts = postRows.map((row) => {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      publishedDate: row.published_date,
      lastUpdated: row.last_updated,
      status: row.status,
      readTime: `${Math.max(1, Number(row.read_time_minutes) || 1)} min read`,
      linkedAnime: linksMap.get(row.id) || []
    };
  });

  if (!includeDrafts) {
    blogCache.data = formattedPosts;
    blogCache.timestamp = Date.now();
  }

  return formattedPosts;
}

/**
 * Fetch a single blog post by slug
 * @param {string} slug
 * @param {any} [optionsOrContext]
 * @param {any} [contextOrLocals]
 */
export async function getBlogPostBySlug(slug, optionsOrContext = {}, contextOrLocals = null) {
  if (!slug) return null;

  let includeDrafts = false;
  let ctx = contextOrLocals;
  if (optionsOrContext?.runtime || optionsOrContext?.locals || optionsOrContext?.env || optionsOrContext?.DB || optionsOrContext?.prepare) {
    ctx = optionsOrContext;
  } else if (typeof optionsOrContext?.includeDrafts === 'boolean') {
    includeDrafts = optionsOrContext.includeDrafts;
  }

  const db = await getDatabase(ctx);
  const post = await db.queryOne(
    includeDrafts
      ? `SELECT id, slug, title, excerpt, content, published_date, last_updated, status FROM blog_posts WHERE slug = ? LIMIT 1`
      : `SELECT id, slug, title, excerpt, content, published_date, last_updated, status FROM blog_posts WHERE slug = ? AND status = 'published' LIMIT 1`,
    slug
  );
  if (!post) return null;

  const linkedAnimeRows = await db.query(`
    SELECT a.id, a.slug, a.title, a.year, a.honesty_status
    FROM blog_post_anime bpa
    JOIN anime a ON a.id = bpa.anime_id
    WHERE bpa.post_id = ?
    ORDER BY a.title ASC
  `, post.id);

  const wordCount = post.content ? post.content.trim().split(/\s+/).length : 0;
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    publishedDate: post.published_date,
    lastUpdated: post.last_updated,
    status: post.status,
    readTime: `${Math.max(1, Math.ceil(wordCount / 200))} min read`,
    linkedAnime: linkedAnimeRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      year: row.year,
      honestyStatus: row.honesty_status
    }))
  };
}

/**
 * Fetch all published blog posts linked to a specific anime ID
 * @param {string} animeId
 * @param {any} [contextOrLocals]
 */
export async function getBlogPostsForAnime(animeId, contextOrLocals = null) {
  if (!animeId) return [];
  const db = await getDatabase(contextOrLocals);
  const rows = await db.query(`
    SELECT bp.id, bp.slug, bp.title, bp.excerpt, bp.content, bp.published_date, bp.last_updated, bp.status
    FROM blog_post_anime bpa
    JOIN blog_posts bp ON bp.id = bpa.post_id
    WHERE bpa.anime_id = ? AND bp.status = 'published'
    ORDER BY bp.published_date DESC
    LIMIT 6
  `, animeId);

  return rows.map((row) => {
    const wordCount = row.content ? row.content.trim().split(/\s+/).length : 0;
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      publishedDate: row.published_date,
      lastUpdated: row.last_updated,
      status: row.status,
      readTime: `${Math.max(1, Math.ceil(wordCount / 200))} min read`
    };
  });
}

/**
 * Fetch single anime by slug, ID, or alias
 * @param {string} slugOrId
 * @param {any} [contextOrLocals]
 */
export async function getAnimeBySlugOrId(slugOrId, contextOrLocals = null) {
  if (!slugOrId) return null;
  const list = await getAllAnime(contextOrLocals);
  return list.find(a => a.slug === slugOrId || a.id === slugOrId || (a.aliases && a.aliases.includes(slugOrId))) || null;
}

/**
 * Helper function to determine the preferred default tab.
 * Prefers "My Take" ('review') if available; otherwise falls back to the first available tab.
 * @param {any} [_anime]
 * @param {any} [availableTabs]
 */
export function getDefaultTabKey(_anime, availableTabs) {
  if (!availableTabs || availableTabs.length === 0) return null;
  const reviewTab = availableTabs.find((t) => t.key === 'review');
  if (reviewTab) {
    return 'review';
  }
  return availableTabs[0].key;
}

/**
 * Fetch a site-wide setting value from D1 with in-memory caching (60s TTL)
 * @param {string} key
 * @param {any} [defaultValue]
 * @param {any} [contextOrLocals]
 */
export async function getSiteSetting(key, defaultValue = null, contextOrLocals = null) {
  if (!key) return defaultValue;
  const now = Date.now();
  if (siteSettingsCache.data.has(key) && (now - siteSettingsCache.timestamp < 60000)) {
    return siteSettingsCache.data.get(key);
  }
  try {
    const db = await getDatabase(contextOrLocals);
    const row = await db.queryOne(`SELECT value FROM site_settings WHERE key = ?`, key);
    const val = row?.value ?? defaultValue;
    siteSettingsCache.data.set(key, val);
    siteSettingsCache.timestamp = Date.now();
    return val;
  } catch (err) {
    console.warn(`[getSiteSetting] Failed to fetch setting '${key}':`, err?.message || err);
    return defaultValue;
  }
}

/**
 * Update or insert a site-wide setting in D1
 * @param {string} key
 * @param {any} value
 * @param {any} [contextOrLocals]
 */
export async function setSiteSetting(key, value, contextOrLocals = null) {
  if (!key) throw new Error('Setting key is required');
  const db = await getDatabase(contextOrLocals);
  const cleanVal = String(value ?? '');
  await db.run(`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `, key, cleanVal);
  invalidateSiteSettingsCache();
  return { key, value: cleanVal };
}

/**
 * Fetch all vibes from D1 with in-memory caching (30s TTL).
 * Formatted with camelCase and UI compatibility fields.
 * @param {any} [contextOrLocals]
 */
export async function getAllVibes(contextOrLocals = null) {
  const now = Date.now();
  if (vibesCache.data && (now - vibesCache.timestamp < 30000)) {
    return vibesCache.data;
  }

  const db = await getDatabase(contextOrLocals);
  const rows = await db.query(`SELECT * FROM vibes ORDER BY name ASC`);
  const formatted = rows.map(r => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    title: r.name,
    fullName: `${r.name} Anime`,
    h1: `${r.name} Anime`,
    tagline: r.tagline || '',
    groupLabel: r.group_label || '',
    group_label: r.group_label || '',
    badge: r.group_label || 'CURATED',
    colorTheme: r.color_theme || 'indigo',
    color_theme: r.color_theme || 'indigo',
    seoIntro: r.seo_intro || '',
    intro: r.seo_intro || '',
    metaDescription: r.meta_description || '',
    pageTitle: `${r.name} Anime — Honest Watch Orders & Episode Guides`,
    isActive: Boolean(r.is_active),
    is_active: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));

  vibesCache.data = formatted;
  vibesCache.timestamp = now;
  return formatted;
}

/**
 * Look up a vibe by slug or ID
 * @param {string} slugOrId
 * @param {any} [contextOrLocals]
 */
export async function getVibeBySlug(slugOrId, contextOrLocals = null) {
  if (!slugOrId) return null;
  const db = await getDatabase(contextOrLocals);
  const row = await db.queryOne(`
    SELECT id, slug, name, tagline, group_label, color_theme, seo_intro, meta_description, is_active, created_at, updated_at
    FROM vibes
    WHERE slug = ? OR id = ?
    LIMIT 1
  `, slugOrId, slugOrId);
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    title: row.name,
    fullName: `${row.name} Anime`,
    h1: `${row.name} Anime`,
    tagline: row.tagline || '',
    groupLabel: row.group_label || '',
    group_label: row.group_label || '',
    badge: row.group_label || 'CURATED',
    colorTheme: row.color_theme || 'indigo',
    color_theme: row.color_theme || 'indigo',
    seoIntro: row.seo_intro || '',
    intro: row.seo_intro || '',
    metaDescription: row.meta_description || '',
    pageTitle: `${row.name} Anime — Honest Watch Orders & Episode Guides`,
    isActive: Boolean(row.is_active),
    is_active: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Fetch all vibes with assigned anime count for admin management
 * @param {any} [contextOrLocals]
 */
export async function getAllAdminVibes(contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
  const rows = await db.query(`
    SELECT v.*, COUNT(av.anime_id) as anime_count
    FROM vibes v
    LEFT JOIN anime_vibes av ON v.id = av.vibe_id
    GROUP BY v.id
    ORDER BY v.name ASC
  `);

  return rows.map(r => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    title: r.name,
    tagline: r.tagline || '',
    groupLabel: r.group_label || '',
    group_label: r.group_label || '',
    badge: r.group_label || 'CURATED',
    colorTheme: r.color_theme || 'indigo',
    color_theme: r.color_theme || 'indigo',
    seoIntro: r.seo_intro || '',
    intro: r.seo_intro || '',
    metaDescription: r.meta_description || '',
    pageTitle: `${r.name} Anime — Honest Watch Orders & Episode Guides`,
    isActive: Boolean(r.is_active),
    is_active: r.is_active,
    animeCount: Number(r.anime_count || 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
}
