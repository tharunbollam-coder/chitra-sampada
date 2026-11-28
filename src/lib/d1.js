import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseAnimeSectionVisibility } from './anime-tabs.js';
import { calculateFillerPercentage, FILLER_CATEGORY, getFillerCategoryRank, getStoredEpisodeCount, summarizeFillerEntries } from './filler-utils.js';

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
    d1TotalDuration: 0,
    d1Queries: 0
  });
  metrics.d1TotalDuration += performance.now() - startedAt;
  metrics.d1Queries += 1;
}

function wrapD1(cfDb, contextOrLocals = null, strictReads = false) {
  const sanitize = (params) => params.map((p) => (p === undefined ? null : p));

  return {
    isD1: true,
    async query(sql, ...params) {
      const startedAt = performance.now();
      try {
        let stmt = cfDb.prepare(sql);
        const safeParams = sanitize(params);
        if (safeParams.length > 0) stmt = stmt.bind(...safeParams);
        const res = await stmt.all();
        return res?.results || [];
      } catch (err) {
        if (strictReads) throw err;
        const context = getDiagnosticsContext(contextOrLocals);
        if (context) context.__chitraD1ReadFailed = true;
        console.error('D1 query error:', err, 'SQL:', sql);
        return [];
      } finally {
        recordD1Timing(contextOrLocals, startedAt);
      }
    },
    async queryOne(sql, ...params) {
      const startedAt = performance.now();
      try {
        let stmt = cfDb.prepare(sql);
        const safeParams = sanitize(params);
        if (safeParams.length > 0) stmt = stmt.bind(...safeParams);
        return (await stmt.first()) || null;
      } catch (err) {
        if (strictReads) throw err;
        const context = getDiagnosticsContext(contextOrLocals);
        if (context) context.__chitraD1ReadFailed = true;
        console.error('D1 queryOne error:', err, 'SQL:', sql);
        return null;
      } finally {
        recordD1Timing(contextOrLocals, startedAt);
      }
    },
    async run(sql, ...params) {
      const startedAt = performance.now();
      try {
        let stmt = cfDb.prepare(sql);
        const safeParams = sanitize(params);
        if (safeParams.length > 0) stmt = stmt.bind(...safeParams);
        return await stmt.run();
      } catch (err) {
        console.error('D1 run error:', err, 'SQL:', sql);
        throw err;
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
 * @param {{strictReads?: boolean}} [options]
 */
export async function getDatabase(contextOrLocals = null, { strictReads = false } = {}) {
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
    return wrapD1(cfDb, contextOrLocals, strictReads);
  }

  // 4. Check if running in Cloudflare Workers runtime where Node SQLite is completely unavailable
  const isCloudflare = 
    (typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers') ||
    (typeof WebSocketPair !== 'undefined') ||
    (typeof process === 'undefined') ||
    (!process.versions?.node);

  if (isCloudflare) {
    throw new Error("Cloudflare D1 database binding 'DB' was not found in cloudflare:workers.");
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

function getRequestCache(contextOrLocals) {
  if (!contextOrLocals || typeof contextOrLocals !== 'object') return null;
  const target = contextOrLocals.locals || contextOrLocals;
  if (!target.__chitraRequestCache) {
    target.__chitraRequestCache = new Map();
  }
  return target.__chitraRequestCache;
}

function parseSiblingVisibility(value) {
  try {
    return (typeof value === 'string' ? JSON.parse(value) : value) || {};
  } catch {
    return {};
  }
}

export function invalidateAnimeCache(contextOrLocals = null) {
  const reqCache = getRequestCache(contextOrLocals);
  if (reqCache) {
    reqCache.delete('anime');
    reqCache.delete('compactAnime');
    reqCache.delete('compactAnimeStrict');
    reqCache.delete('searchAnimeStrict');
  }
}

/**
 * Fetch lightweight compact anime list for card grids, catalog listings, and vibe pages.
 * Queries ONLY essential card columns (omits heavy reviews, lore, character lists,
 * watch orders, related universe media, blog linkages, and streaming platform records).
 * Uses request-scoped deduplication so components in the same request share data without redundant D1 queries.
 * @param {any} [contextOrLocals]
 */
export async function getCompactAnimeList(contextOrLocals = null, { strictReads = false, forSearch = false } = {}) {
  const reqCache = getRequestCache(contextOrLocals);
  const cacheKey = forSearch ? 'searchAnimeStrict' : strictReads ? 'compactAnimeStrict' : 'compactAnime';
  if (reqCache?.has(cacheKey)) {
    return reqCache.get(cacheKey);
  }

  const db = await getDatabase(contextOrLocals, { strictReads: strictReads || forSearch });

  const [animeRes, genresRes, vibesRes, fillerRes] = await Promise.allSettled([
    db.query(forSearch
      ? `SELECT id, slug, title, year, type, runtime, episodes, poster, section_visibility, added_date FROM anime ORDER BY year DESC, title ASC`
      : `SELECT rowid, id, slug, title, year, type, runtime, episodes, status, poster, honesty_status, filler_percentage, section_visibility, trending, community_suggested, personal_rating, added_date FROM anime ORDER BY year DESC, title ASC`),
    db.query(`SELECT anime_id, genre FROM anime_genres`),
    forSearch ? [] : db.query(`SELECT anime_id, vibe_id FROM anime_vibes`),
    db.query(`SELECT anime_id, type, episodes, episode_count FROM anime_filler_ranges`)
  ]);

  if (strictReads || forSearch) {
    const failure = [animeRes, genresRes, vibesRes, fillerRes].find((result) => result.status === 'rejected');
    if (failure) throw failure.reason;
  }

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
    if (!row.genre.startsWith('__blog__:')) {
      genresMap.get(row.anime_id).push(row.genre);
    }
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
    const epCount = getStoredEpisodeCount(epVal, row.episode_count, 'positive');
    if (epVal && epVal.trim().length > 0) {
      stat.totalCount += epCount;
      if (row.type === FILLER_CATEGORY.filler) {
        stat.fillerCount += epCount;
      }
    }
  }

  const formatted = animeRows.map((row) => {
    const fillerInfo = fillerMap.get(row.id);
    let fillerPercentage = row.filler_percentage;
    let episodes = row.episodes || 0;

    if (fillerInfo && fillerInfo.totalCount > 0) {
      fillerPercentage = calculateFillerPercentage(fillerInfo.fillerCount, fillerInfo.totalCount);
      episodes = episodes || fillerInfo.totalCount;
    }

    let isFillerSectionVisible = true;
    if (row.section_visibility) {
      try {
        const vis = JSON.parse(row.section_visibility);
        if (vis && vis.fillerList === false) isFillerSectionVisible = false;
      } catch {}
    }

    const hasFillerData = Boolean(fillerInfo && fillerInfo.totalCount > 0 && isFillerSectionVisible);

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
      hasFillerData,
      fillerPercentage: hasFillerData ? fillerPercentage : null,
      genres: genresMap.get(row.id) || [],
      vibes: vibesMap.get(row.id) || [],
      trending: Boolean(row.trending),
      communitySuggested: Boolean(row.community_suggested),
      rowid: row.rowid,
      addedDate: row.added_date || '',
      added_date: row.added_date || '',
      createdAt: row.added_date || '',
      created_at: row.added_date || '',
      updatedAt: row.last_updated || '',
      updated_at: row.last_updated || ''
    };
  });

  if (reqCache) {
    reqCache.set(cacheKey, formatted);
  }
  return formatted;
}

export function invalidateBlogCache(contextOrLocals = null) {
  const reqCache = getRequestCache(contextOrLocals);
  if (reqCache) {
    reqCache.delete('blog_published');
    reqCache.delete('blog_published_strict');
    reqCache.delete('blog_all');
    reqCache.delete('blog_all_strict');
  }
}

export function invalidateSiteSettingsCache(contextOrLocals = null) {
  const reqCache = getRequestCache(contextOrLocals);
  if (reqCache) {
    for (const key of reqCache.keys()) {
      if (key.startsWith('setting:')) reqCache.delete(key);
    }
  }
}

export function invalidateVibesCache(contextOrLocals = null) {
  const reqCache = getRequestCache(contextOrLocals);
  if (reqCache) {
    reqCache.delete('vibes');
    reqCache.delete('vibesStrict');
  }
}

export function invalidateAllCaches(contextOrLocals = null) {
  const reqCache = getRequestCache(contextOrLocals);
  if (reqCache) {
    reqCache.clear();
  }
}

/**
 * Fetch all anime from D1 (or local D1 SQLite during build/prerender)
 * Formatted with camelCase properties matching the UI expectations.
 * Uses request-scoped deduplication so components in the same request share data without redundant D1 queries.
 * @param {any} [contextOrLocals]
 */
export async function getAllAnime(contextOrLocals = null) {
  const reqCache = getRequestCache(contextOrLocals);
  if (reqCache?.has('anime')) {
    return reqCache.get('anime');
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
    franchisesRes,
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
    db.query(`SELECT id, name, watch_order_note FROM franchises ORDER BY name ASC`),
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
  const franchiseRows = franchisesRes.status === 'fulfilled' ? franchisesRes.value : [];
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
    if (!row.genre.startsWith('__blog__:')) {
      genresMap.get(row.anime_id).push(row.genre);
    }
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
    const epCount = getStoredEpisodeCount(epVal, row.episode_count);
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

  const franchiseMap = new Map();
  for (const row of franchiseRows) {
    franchiseMap.set(row.id, row);
  }

  const franchiseAnimeMap = new Map();
  for (const a of animeRows) {
    if (a.franchise_id) {
      if (!franchiseAnimeMap.has(a.franchise_id)) franchiseAnimeMap.set(a.franchise_id, []);
      franchiseAnimeMap.get(a.franchise_id).push(a);
    }
  }
  for (const list of franchiseAnimeMap.values()) {
    list.sort((a, b) => (Number(a.franchise_step_order) || 999) - (Number(b.franchise_step_order) || 999));
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

    const franchise = row.franchise_id ? franchiseMap.get(row.franchise_id) : null;
    const franchiseName = franchise?.name || null;
    const franchiseWatchOrderNote = franchise?.watch_order_note || null;
    const siblingRows = row.franchise_id ? (franchiseAnimeMap.get(row.franchise_id) || []) : [];
    const franchiseAnime = siblingRows.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      type: s.type,
      episodes: s.episodes,
      runtime: s.runtime,
      franchiseStepOrder: s.franchise_step_order,
      sectionVisibility: parseSiblingVisibility(s.section_visibility),
      isCurrent: s.id === row.id
    }));

    // Reconstruct fillerList
    const rawFillerEntries = fillerMap.get(row.id) || [];
    let fillerList = null;
    const activeFillerTypes = rawFillerEntries.filter(e => e.episodes && e.episodes.trim().length > 0);

    if (activeFillerTypes.length > 0) {
      const counts = summarizeFillerEntries(activeFillerTypes, 'last');
      fillerList = {
        ...counts,
        fillerPercentage: calculateFillerPercentage(counts.fillerEpisodes, counts.totalEpisodes),
        types: activeFillerTypes
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

    const sectionVisibility = parseAnimeSectionVisibility(row.section_visibility);

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

    const hasFillerData = Boolean(fillerList && fillerList.totalEpisodes > 0 && sectionVisibility.fillerList !== false);

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
      hasFillerData,
      fillerPercentage: hasFillerData ? fillerList.fillerPercentage : null,
      genres: genresMap.get(row.id) || [],
      vibes: vibesMap.get(row.id) || [],
      trending: Boolean(row.trending),
      communitySuggested: Boolean(row.community_suggested),
      synopsis: row.synopsis,
      review,
      franchiseId: row.franchise_id || null,
      franchiseName,
      franchiseStepOrder: row.franchise_step_order || null,
      franchiseWatchOrderNote,
      franchiseAnime,
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

  if (reqCache) {
    reqCache.set('anime', formattedAnime);
  }
  return formattedAnime;
}

/**
 * Fetch exactly one anime detail record and its displayed relations.
 * This is intentionally read-only and avoids loading the full catalogue for a detail page.
 * @param {string} slugOrId
 * @param {any} [contextOrLocals]
 */
export async function getAnimeDetailBySlugOrId(slugOrId, contextOrLocals = null, { strictReads = false } = {}) {
  if (!slugOrId) return null;

  try {
    const primaryDb = await getDatabase(contextOrLocals, { strictReads });
    const lookupKey = String(slugOrId).trim();
    if (!lookupKey) return null;

    const anime = await primaryDb.queryOne(`
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
    `, lookupKey, lookupKey, lookupKey);

    if (!anime || !anime.id) return null;

    const db = strictReads ? await getDatabase(contextOrLocals) : primaryDb;
    const animeId = anime.id;
    const franchiseId = anime.franchise_id || null;
    const charPostSlug = anime.character_related_post_slug || null;

    const [
      aliases,
      genres,
      vibes,
      fillerRows,
      characters,
      franchiseAnimeRows,
      universe,
      recommendations,
      streamingPlatforms,
      relatedPost,
      franchiseRow
    ] = await Promise.all([
      db.query(`SELECT alias FROM anime_aliases WHERE anime_id = ?`, animeId),
      db.query(`SELECT genre FROM anime_genres WHERE anime_id = ?`, animeId),
      db.query(`SELECT vibe_id FROM anime_vibes WHERE anime_id = ?`, animeId),
      db.query(`
        SELECT type, episodes, episode_count
        FROM anime_filler_ranges
        WHERE anime_id = ?
      `, animeId),
      db.query(`
        SELECT rank, name, category, role, commentary
        FROM anime_characters
        WHERE anime_id = ?
        ORDER BY rank ASC
      `, animeId),
      franchiseId
        ? db.query(`
            SELECT id, slug, title, type, episodes, runtime, franchise_step_order, section_visibility, watch_order_note
            FROM anime
            WHERE franchise_id = ?
            ORDER BY franchise_step_order ASC, year ASC
          `, franchiseId)
        : Promise.resolve([]),
      db.query(`
        SELECT id, section, title, badge, link_slug, editorial_note, item_order
        FROM anime_related_media
        WHERE anime_id = ?
        ORDER BY item_order ASC, id ASC
      `, animeId),
      db.query(`
        SELECT
          r.id, r.target_anime_id, r.category_badge, r.editorial_note, r.item_order,
          target.title AS target_title, target.slug AS target_slug, target.poster AS target_poster,
          target.year AS target_year, target.status AS target_status,
          target.personal_rating AS target_rating, target.added_date AS target_added_date
        FROM anime_recommendations r
        JOIN anime target ON target.id = r.target_anime_id
        WHERE r.anime_id = ?
        ORDER BY r.item_order ASC, r.id ASC
      `, animeId),
      db.query(`
        SELECT id, platform_name, stream_url, logo_url, note, display_order, is_active
        FROM anime_streaming_platforms
        WHERE anime_id = ?
        ORDER BY display_order ASC, id ASC
      `, animeId),
      charPostSlug
        ? db.queryOne(`
            SELECT id, slug, title
            FROM blog_posts
            WHERE slug = ? AND status = 'published'
            LIMIT 1
          `, charPostSlug)
        : Promise.resolve(null),
      franchiseId
        ? db.queryOne(`SELECT id, name, watch_order_note FROM franchises WHERE id = ?`, franchiseId)
        : Promise.resolve(null)
    ]);

    const safeAliases = Array.isArray(aliases) ? aliases : [];
    const safeGenres = Array.isArray(genres) ? genres : [];
    const safeVibes = Array.isArray(vibes) ? vibes : [];
    const safeFillerRows = Array.isArray(fillerRows) ? fillerRows : [];
    const safeCharacters = Array.isArray(characters) ? characters : [];
    const safeSiblingAnime = Array.isArray(franchiseAnimeRows) ? franchiseAnimeRows : [];
    const safeUniverse = Array.isArray(universe) ? universe : [];
    const safeRecommendations = Array.isArray(recommendations) ? recommendations : [];
    const safeStreamingPlatforms = Array.isArray(streamingPlatforms) ? streamingPlatforms : [];

    const fillerEntries = safeFillerRows.map((row) => {
      const episodes = row.episodes || '';
      return {
        type: row.type,
        episodes,
        count: getStoredEpisodeCount(episodes, row.episode_count, 'nonnegative')
      };
    }).filter((row) => row.episodes.trim().length > 0);

    fillerEntries.sort((a, b) => getFillerCategoryRank(a.type) - getFillerCategoryRank(b.type));
    const counts = summarizeFillerEntries(fillerEntries);
    const fillerList = fillerEntries.length > 0 ? {
      ...counts,
      fillerPercentage: calculateFillerPercentage(counts.fillerEpisodes, counts.totalEpisodes),
      types: fillerEntries
    } : null;

    const sectionVisibility = parseAnimeSectionVisibility(anime.section_visibility);

    const reviewText = anime.review_paragraphs || '';
    const powerText = anime.power_system_paragraphs || '';
    const lessonTakeaway = anime.lesson_takeaway || '';

    const hasFillerData = Boolean(fillerList && fillerList.totalEpisodes > 0 && sectionVisibility.fillerList !== false);

    return {
      id: anime.id,
      slug: anime.slug,
      aliases: safeAliases.length > 0 ? safeAliases.map((row) => row.alias) : [anime.id, anime.slug],
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
      createdAt: anime.added_date,
      created_at: anime.added_date,
      updatedAt: anime.last_updated,
      updated_at: anime.last_updated,
      honestyStatus: anime.honesty_status,
      hasFillerData,
      fillerPercentage: hasFillerData ? fillerList.fillerPercentage : null,
      genres: safeGenres.map((row) => row.genre).filter((g) => !g.startsWith('__blog__:')),
      relatedBlogSlugs: safeGenres.filter((row) => row.genre.startsWith('__blog__:')).map((row) => row.genre.replace('__blog__:', '')),
      vibes: safeVibes.map((row) => row.vibe_id),
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
      franchiseId,
      franchiseName: franchiseRow?.name || null,
      franchiseWatchOrderNote: franchiseRow?.watch_order_note || null,
      franchiseStepOrder: anime.franchise_step_order || null,
      franchiseAnime: safeSiblingAnime.map((s) => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        type: s.type,
        episodes: s.episodes,
        runtime: s.runtime,
        franchiseStepOrder: s.franchise_step_order,
        sectionVisibility: parseSiblingVisibility(s.section_visibility),
        isCurrent: s.id === anime.id
      })),
      watchOrderNote: anime.watch_order_note || null,
      fillerList,
      fillerNote: anime.filler_note || null,
      characters: safeCharacters,
      characterRelatedPostSlug: anime.character_related_post_slug || null,
      characterRelatedPost: relatedPost,
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
      universe: safeUniverse.map((row) => ({
        id: row.id,
        section: row.section,
        title: row.title,
        badge: row.badge,
        linkSlug: row.link_slug,
        editorialNote: row.editorial_note,
        itemOrder: row.item_order
      })),
      recommendations: safeRecommendations.map((row) => ({
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
      streamingPlatforms: safeStreamingPlatforms.map((row) => ({
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
  } catch (error) {
    if (strictReads) throw error;
    console.error('getAnimeDetailBySlugOrId error:', error);
    return null;
  }
}

/**
 * Fetch all blog posts from D1 SQLite (optionally including drafts)
 * @param {any} [optionsOrContext]
 * @param {any} [contextOrLocals]
 */
export async function getAllBlogPosts(optionsOrContext = {}, contextOrLocals = null) {
  let includeDrafts = false;
  let strictReads = false;
  let ctx = contextOrLocals;

  if (optionsOrContext) {
    if (optionsOrContext.locals || optionsOrContext.env || optionsOrContext.DB || optionsOrContext.prepare) {
      ctx = optionsOrContext;
    } else {
      strictReads = optionsOrContext.strictReads === true;
      if (typeof optionsOrContext.includeDrafts === 'boolean') {
        includeDrafts = optionsOrContext.includeDrafts;
      }
      if (optionsOrContext.contextOrLocals || optionsOrContext.locals) {
        ctx = optionsOrContext.contextOrLocals || optionsOrContext.locals;
      }
    }
  }

  const reqCache = getRequestCache(ctx);
  const cacheKey = (includeDrafts ? 'blog_all' : 'blog_published') + (strictReads ? '_strict' : '');
  if (reqCache?.has(cacheKey)) {
    return reqCache.get(cacheKey);
  }

  const db = await getDatabase(ctx, { strictReads });
  const query = includeDrafts
    ? `
        SELECT id, slug, title, excerpt, cover_image, published_date, last_updated, status,
               MAX(1, CAST((LENGTH(TRIM(content)) - LENGTH(REPLACE(TRIM(content), ' ', '')) + 200) / 200 AS INTEGER)) AS read_time_minutes
        FROM blog_posts
        ORDER BY published_date DESC
      `
    : `
        SELECT id, slug, title, excerpt, cover_image, published_date, last_updated, status,
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

  if (strictReads) {
    if (postsRes.status === 'rejected') throw postsRes.reason;
    if (linksRes.status === 'rejected') throw linksRes.reason;
  }

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
      coverImage: row.cover_image || null,
      readTime: `${Math.max(1, Number(row.read_time_minutes) || 1)} min read`,
      linkedAnime: linksMap.get(row.id) || []
    };
  });

  if (reqCache) {
    reqCache.set(cacheKey, formattedPosts);
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
  if (optionsOrContext?.locals || optionsOrContext?.env || optionsOrContext?.DB || optionsOrContext?.prepare) {
    ctx = optionsOrContext;
  } else if (typeof optionsOrContext?.includeDrafts === 'boolean') {
    includeDrafts = optionsOrContext.includeDrafts;
  }

  const strictReads = optionsOrContext?.strictReads === true;
  const primaryDb = await getDatabase(ctx, { strictReads });
  const post = await primaryDb.queryOne(
    includeDrafts
      ? `SELECT id, slug, title, excerpt, content, cover_image, published_date, last_updated, status FROM blog_posts WHERE slug = ? LIMIT 1`
      : `SELECT id, slug, title, excerpt, content, cover_image, published_date, last_updated, status FROM blog_posts WHERE slug = ? AND status = 'published' LIMIT 1`,
    slug
  );
  if (!post) return null;

  const db = strictReads ? await getDatabase(ctx) : primaryDb;
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
    coverImage: post.cover_image || null,
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
 * Fetch published blog posts by specific slugs or IDs
 * @param {string[]} slugsOrIds
 * @param {any} [contextOrLocals]
 */
export async function getBlogPostsBySlugs(slugsOrIds, contextOrLocals = null) {
  if (!Array.isArray(slugsOrIds) || slugsOrIds.length === 0) return [];
  const db = await getDatabase(contextOrLocals);
  const placeholders = slugsOrIds.map(() => '?').join(',');
  const rows = await db.query(`
    SELECT id, slug, title, excerpt, content, cover_image, published_date, last_updated, status
    FROM blog_posts
    WHERE (slug IN (${placeholders}) OR id IN (${placeholders})) AND status = 'published'
    ORDER BY published_date DESC
  `, ...slugsOrIds, ...slugsOrIds);

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
      coverImage: row.cover_image || null,
      readTime: `${Math.max(1, Math.ceil(wordCount / 200))} min read`
    };
  });
}

/**
 * Fetch a site-wide setting value from D1 with request-scoped caching.
 * @param {string} key
 * @param {any} [defaultValue]
 * @param {any} [contextOrLocals]
 */
export async function getSiteSetting(key, defaultValue = null, contextOrLocals = null) {
  if (!key) return defaultValue;
  const reqCache = getRequestCache(contextOrLocals);
  const cacheKey = `setting:${key}`;
  if (reqCache?.has(cacheKey)) {
    return reqCache.get(cacheKey);
  }
  try {
    const db = await getDatabase(contextOrLocals);
    const row = await db.queryOne(`SELECT value FROM site_settings WHERE key = ?`, key);
    const val = row?.value ?? defaultValue;
    if (reqCache) {
      reqCache.set(cacheKey, val);
    }
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
  invalidateSiteSettingsCache(contextOrLocals);
  return { key, value: cleanVal };
}

/**
 * Retrieve the active single homepage announcement note from site_settings.
 * @param {any} [contextOrLocals]
 */
export async function getHomepageAnnouncement(contextOrLocals = null) {
  const raw = await getSiteSetting('homepage_announcement', null, contextOrLocals);
  if (!raw) {
    return {
      enabled: false,
      title: '',
      message: '',
      linkUrl: '',
      linkText: ''
    };
  }
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      enabled: Boolean(data?.enabled),
      title: data?.title || '',
      message: data?.message || '',
      linkUrl: data?.linkUrl || '',
      linkText: data?.linkText || ''
    };
  } catch {
    return {
      enabled: false,
      title: '',
      message: '',
      linkUrl: '',
      linkText: ''
    };
  }
}

/**
 * Save or update the single homepage announcement note in D1.
 * @param {any} data
 * @param {any} [contextOrLocals]
 */
export async function setHomepageAnnouncement(data, contextOrLocals = null) {
  const payload = JSON.stringify({
    enabled: Boolean(data?.enabled),
    title: String(data?.title || '').trim(),
    message: String(data?.message || '').trim(),
    linkUrl: String(data?.linkUrl || '').trim(),
    linkText: String(data?.linkText || '').trim(),
    updatedAt: new Date().toISOString()
  });
  return await setSiteSetting('homepage_announcement', payload, contextOrLocals);
}

/**
 * Fetch all vibes from D1 with in-memory caching (30s TTL).
 * Formatted with camelCase and UI compatibility fields.
 * @param {any} [contextOrLocals]
 */
export async function getAllVibes(contextOrLocals = null, { strictReads = false } = {}) {
  const reqCache = getRequestCache(contextOrLocals);
  const cacheKey = strictReads ? 'vibesStrict' : 'vibes';
  if (reqCache?.has(cacheKey)) {
    return reqCache.get(cacheKey);
  }

  const db = await getDatabase(contextOrLocals, { strictReads });
  const rows = await db.query(`
    SELECT v.*, COUNT(DISTINCT a.id) as anime_count
    FROM vibes v
    LEFT JOIN anime_vibes av ON v.id = av.vibe_id
    LEFT JOIN anime a ON av.anime_id = a.id
    GROUP BY v.id
    ORDER BY v.name ASC
  `);
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
    animeCount: Number(r.anime_count || 0),
    anime_count: Number(r.anime_count || 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));

  if (reqCache) {
    reqCache.set(cacheKey, formatted);
  }
  return formatted;
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
