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

function wrapD1(cfDb) {
  return {
    isD1: true,
    async query(sql, ...params) {
      let stmt = cfDb.prepare(sql);
      if (params.length > 0) stmt = stmt.bind(...params);
      const res = await stmt.all();
      return res.results || [];
    },
    async queryOne(sql, ...params) {
      let stmt = cfDb.prepare(sql);
      if (params.length > 0) stmt = stmt.bind(...params);
      const res = await stmt.all();
      return res.results?.[0] || null;
    },
    async run(sql, ...params) {
      let stmt = cfDb.prepare(sql);
      if (params.length > 0) stmt = stmt.bind(...params);
      return await stmt.run();
    }
  };
}

/**
 * Universal Database Accessor
 * Uses Cloudflare D1 binding (DB or chitra_sampada_db) when running in Cloudflare Workers / workerd,
 * and falls back to Node.js DatabaseSync when running in Node.js build or CLI tools.
 */
let schemaEnsuredPromise = null;

/**
 * Non-destructive schema compatibility check:
 * Ensures missing columns (such as 'episodes' / 'episode_count' on anime_filler_ranges
 * or 'section_visibility' on anime) are safely created if earlier migrations were not run
 * on remote D1. Preserves 100% of all existing table data without dropping or clearing.
 */
async function ensureSchemaCompatibility(db) {
  if (!schemaEnsuredPromise) {
    schemaEnsuredPromise = (async () => {
      try {
        const fillerInfo = await db.query(`PRAGMA table_info(anime_filler_ranges)`);
        const fillerCols = new Set(fillerInfo.map(c => c.name));
        if (fillerCols.size > 0) {
          if (!fillerCols.has('episodes')) {
            await db.run(`ALTER TABLE anime_filler_ranges ADD COLUMN episodes TEXT`);
          }
          if (!fillerCols.has('episode_count')) {
            await db.run(`ALTER TABLE anime_filler_ranges ADD COLUMN episode_count INTEGER DEFAULT 0`);
          }
          if (fillerCols.has('range')) {
            await db.run(`UPDATE anime_filler_ranges SET episodes = range WHERE (episodes IS NULL OR episodes = '') AND range IS NOT NULL`);
          }
        }
      } catch (err) {
        console.warn('[Schema Compatibility] anime_filler_ranges note:', err?.message || err);
      }

      try {
        const animeInfo = await db.query(`PRAGMA table_info(anime)`);
        const animeCols = new Set(animeInfo.map(c => c.name));
        if (animeCols.size > 0 && !animeCols.has('section_visibility')) {
          await db.run(`ALTER TABLE anime ADD COLUMN section_visibility TEXT`);
        }
      } catch (err) {
        console.warn('[Schema Compatibility] anime section_visibility note:', err?.message || err);
      }
    })();
  }
  await schemaEnsuredPromise;
}

export async function getDatabase(contextOrLocals) {
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
    const wrapped = wrapD1(cfDb);
    await ensureSchemaCompatibility(wrapped);
    return wrapped;
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
      return sqlite.prepare(sql).all(...params);
    },
    async queryOne(sql, ...params) {
      return sqlite.prepare(sql).get(...params) || null;
    },
    async run(sql, ...params) {
      return sqlite.prepare(sql).run(...params);
    }
  };
  await ensureSchemaCompatibility(wrapped);
  return wrapped;
}

let animeCache = {
  data: null,
  timestamp: 0
};

let blogCache = {
  data: null,
  timestamp: 0
};

export function invalidateAnimeCache() {
  animeCache.data = null;
  animeCache.timestamp = 0;
}

export function invalidateBlogCache() {
  blogCache.data = null;
  blogCache.timestamp = 0;
}

/**
 * Fetch all anime from D1 (or local D1 SQLite during build/prerender)
 * Formatted with camelCase properties matching the UI expectations.
 */
export async function getAllAnime(contextOrLocals) {
  const now = Date.now();
  if (animeCache.data && (now - animeCache.timestamp < 30000)) {
    return animeCache.data;
  }

  const db = await getDatabase(contextOrLocals);

  // Parallelize all 7 sub-queries concurrently via Promise.allSettled to eliminate query waterfalls
  const [
    animeRes,
    aliasesRes,
    genresRes,
    vibesRes,
    fillerRes,
    charRes,
    watchRes
  ] = await Promise.allSettled([
    db.query(`SELECT * FROM anime ORDER BY year DESC, title ASC`),
    db.query(`SELECT anime_id, alias FROM anime_aliases`),
    db.query(`SELECT anime_id, genre FROM anime_genres`),
    db.query(`SELECT anime_id, vibe_id FROM anime_vibes`),
    db.query(`SELECT * FROM anime_filler_ranges`),
    db.query(`SELECT anime_id, rank, name, category, role, commentary FROM anime_characters ORDER BY rank ASC`),
    db.query(`SELECT franchise_id, step_order, title, type, episodes, anime_id, note FROM franchise_watch_order ORDER BY step_order ASC`)
  ]);

  const animeRows = animeRes.status === 'fulfilled' ? animeRes.value : [];
  const aliasesRows = aliasesRes.status === 'fulfilled' ? aliasesRes.value : [];
  const genresRows = genresRes.status === 'fulfilled' ? genresRes.value : [];
  const vibesRows = vibesRes.status === 'fulfilled' ? vibesRes.value : [];
  const fillerRows = fillerRes.status === 'fulfilled' ? fillerRes.value : [];
  const characterRows = charRes.status === 'fulfilled' ? charRes.value : [];
  const watchOrderRows = watchRes.status === 'fulfilled' ? watchRes.value : [];

  if (animeRes.status === 'rejected') {
    console.error("Failed to query anime table:", animeRes.reason);
    return [];
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

  const animeSlugMap = new Map();
  const animeTitleMap = new Map();
  for (const a of animeRows) {
    animeSlugMap.set(a.id, a.slug);
    if (a.title) animeTitleMap.set(a.title.trim().toLowerCase(), a.slug);
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

    // Reconstruct sectionVisibility
    let sectionVisibility = {
      review: true,
      lessons: true,
      watchOrder: true,
      fillerList: true,
      characters: true,
      source: true,
      powerSystem: true
    };
    if (row.section_visibility) {
      try {
        sectionVisibility = { ...sectionVisibility, ...JSON.parse(row.section_visibility) };
      } catch {}
    }

    return {
      id: row.id,
      slug: row.slug,
      aliases: aliasesMap.get(row.id) || [row.id, row.slug],
      title: row.title,
      originalTitle: row.original_title,
      year: row.year,
      episodes: row.episodes || fillerList?.totalEpisodes || 0,
      status: row.status,
      personalRating: row.personal_rating !== null ? row.personal_rating : undefined,
      poster: row.poster,
      backdrop: row.backdrop,
      addedDate: row.added_date,
      lastUpdated: row.last_updated,
      honestyStatus: row.honesty_status,
      fillerPercentage: (fillerList && fillerList.totalEpisodes > 0) ? fillerList.fillerPercentage : row.filler_percentage,
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
      lessons,
      sectionVisibility
    };
  });

  animeCache.data = formattedAnime;
  animeCache.timestamp = Date.now();
  return formattedAnime;
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

  // 1. My Take (FIRST position when present or when watched with a personal rating; NEVER for reference guides or un-watched)
  const isWatched = anime.honestyStatus === 'watched';
  const hasReviewContent = isWatched && anime.review && (
    anime.review.heading ||
    (Array.isArray(anime.review.paragraphs) && anime.review.paragraphs.length > 0)
  );
  const isWatchedWithRating = isWatched && (anime.personalRating !== undefined && anime.personalRating !== null);

  if ((hasReviewContent || isWatchedWithRating) && vis.review !== false) {
    tabs.push({ key: 'review', label: 'My Take' });
  }

  // 2. What I Learned (Personal reflections / philosophical takeaways)
  const hasLessonsContent = isWatched && Boolean(
    anime.lessons && (
      (typeof anime.lessons === 'string' && anime.lessons.trim().length > 0) ||
      (anime.lessons.takeaway && anime.lessons.takeaway.trim().length > 0) ||
      (anime.lessons.heading && anime.lessons.heading.trim().length > 0) ||
      (Array.isArray(anime.lessons.paragraphs) && anime.lessons.paragraphs.length > 0)
    )
  );
  if (hasLessonsContent && vis.lessons !== false) {
    tabs.push({ key: 'lessons', label: 'What I Learned' });
  }

  // 3. Watch Order
  if (anime.watchOrder && anime.watchOrder.length > 0 && vis.watchOrder !== false) {
    tabs.push({ key: 'watch-order', label: 'Watch Order', count: anime.watchOrder.length });
  }

  // 3. Filler List
  if (anime.fillerList && anime.fillerList.types && anime.fillerList.types.length > 0 && vis.fillerList !== false) {
    tabs.push({ key: 'filler-list', label: 'Filler List' });
  }

  // 4. Characters
  if (anime.characters && anime.characters.length > 0 && vis.characters !== false) {
    tabs.push({ key: 'characters', label: 'Characters', count: anime.characters.length });
  }

  // 5. Manga & Light Novel
  if (anime.source && (anime.source.title || anime.source.type) && vis.source !== false) {
    tabs.push({ key: 'source', label: 'Manga & Light Novel' });
  }

  // 6. Power System
  if (anime.powerSystem && (anime.powerSystem.paragraphs?.length > 0 || anime.powerSystem.name) && vis.powerSystem !== false) {
    tabs.push({ key: 'power-system', label: 'Power System' });
  }

  return tabs;
}

/**
 * Fetch all blog posts from D1 SQLite (optionally including drafts)
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
    ? `SELECT * FROM blog_posts ORDER BY published_date DESC`
    : `SELECT * FROM blog_posts WHERE status = 'published' ORDER BY published_date DESC`;

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
    const wordCount = row.content ? row.content.trim().split(/\s+/).length : 0;
    const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      content: row.content,
      publishedDate: row.published_date,
      lastUpdated: row.last_updated,
      status: row.status,
      readTime: `${readTimeMinutes} min read`,
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
 */
export async function getBlogPostBySlug(slug, optionsOrContext = {}, contextOrLocals = null) {
  const posts = await getAllBlogPosts(optionsOrContext, contextOrLocals);
  return posts.find((p) => p.slug === slug) || null;
}

/**
 * Fetch all published blog posts linked to a specific anime ID
 */
export async function getBlogPostsForAnime(animeId, contextOrLocals = null) {
  if (!animeId) return [];
  const db = await getDatabase(contextOrLocals);
  const rows = await db.query(`
    SELECT bp.*
    FROM blog_posts bp
    JOIN blog_post_anime bpa ON bp.id = bpa.post_id
    WHERE bpa.anime_id = ? AND bp.status = 'published'
    ORDER BY bp.published_date DESC
  `, animeId);

  return rows.map((row) => {
    const wordCount = row.content ? row.content.trim().split(/\s+/).length : 0;
    const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      content: row.content,
      publishedDate: row.published_date,
      lastUpdated: row.last_updated,
      status: row.status,
      readTime: `${readTimeMinutes} min read`
    };
  });
}

/**
 * Fetch single anime by slug, ID, or alias
 */
export async function getAnimeBySlugOrId(slugOrId, contextOrLocals = null) {
  if (!slugOrId) return null;
  const list = await getAllAnime(contextOrLocals);
  return list.find(a => a.slug === slugOrId || a.id === slugOrId || (a.aliases && a.aliases.includes(slugOrId))) || null;
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