// src/lib/admin-db.js
// Server-side SQLite / D1 data mutations using parameterized queries.

import { getSqliteDb, getDatabase } from './d1.js';
import { validateEpisodeString } from './filler-utils.js';

/**
 * Fetch an anime entry by ID along with all its related normalized records.
 */
export async function getAnimeById(idOrSlug) {
  if (!idOrSlug) return null;
  const db = await getDatabase();

  const animeRow = await db.queryOne(`SELECT * FROM anime WHERE id = ? OR slug = ?`, idOrSlug, idOrSlug);
  if (!animeRow) return null;

  const actualId = animeRow.id;
  const aliases = (await db.query(`SELECT alias FROM anime_aliases WHERE anime_id = ?`, actualId)).map(r => r.alias);
  const genres = (await db.query(`SELECT genre FROM anime_genres WHERE anime_id = ?`, actualId)).map(r => r.genre);
  const vibes = (await db.query(`SELECT vibe_id FROM anime_vibes WHERE anime_id = ?`, actualId)).map(r => r.vibe_id);
  const fillerRows = await db.query(`
    SELECT type, episodes, episode_count as episodeCount 
    FROM anime_filler_ranges 
    WHERE anime_id = ?
  `, actualId);
  const fillerBreakdown = {
    mangaCanon: fillerRows.find(r => r.type === 'Manga Canon')?.episodes || '',
    animeCanon: fillerRows.find(r => r.type === 'Anime Canon')?.episodes || '',
    mixedCanon: fillerRows.find(r => r.type === 'Mixed Canon/Filler')?.episodes || '',
    filler: fillerRows.find(r => r.type === 'Filler')?.episodes || ''
  };

  const countManga = fillerRows.find(r => r.type === 'Manga Canon')?.episodeCount || 0;
  const countAnime = fillerRows.find(r => r.type === 'Anime Canon')?.episodeCount || 0;
  const countMixed = fillerRows.find(r => r.type === 'Mixed Canon/Filler')?.episodeCount || 0;
  const countFiller = fillerRows.find(r => r.type === 'Filler')?.episodeCount || 0;
  const totalBreakdownEpisodes = countManga + countAnime + countMixed + countFiller;
  const canonBreakdownEpisodes = countManga + countAnime;
  const calculatedFillerPercentage = totalBreakdownEpisodes > 0
    ? Math.round((countFiller / totalBreakdownEpisodes) * 100)
    : (animeRow.filler_percentage || 0);
  const effectiveEpisodes = totalBreakdownEpisodes > 0 ? totalBreakdownEpisodes : animeRow.episodes;

  const characters = await db.query(`
    SELECT id, rank, name, category, role, commentary 
    FROM anime_characters 
    WHERE anime_id = ? 
    ORDER BY rank ASC
  `, actualId);

  let reviewParagraphs = [];
  if (animeRow.review_paragraphs) {
    try {
      reviewParagraphs = JSON.parse(animeRow.review_paragraphs);
    } catch {
      reviewParagraphs = [animeRow.review_paragraphs];
    }
  }

  let powerParagraphs = [];
  if (animeRow.power_system_paragraphs) {
    try {
      powerParagraphs = JSON.parse(animeRow.power_system_paragraphs);
    } catch {
      powerParagraphs = [animeRow.power_system_paragraphs];
    }
  }

  return {
    id: animeRow.id,
    slug: animeRow.slug,
    title: animeRow.title,
    originalTitle: animeRow.original_title || '',
    year: animeRow.year,
    episodes: effectiveEpisodes,
    status: animeRow.status,
    personalRating: animeRow.personal_rating !== null ? animeRow.personal_rating : '',
    poster: animeRow.poster || '',
    backdrop: animeRow.backdrop || '',
    addedDate: animeRow.added_date || '',
    lastUpdated: animeRow.last_updated || '',
    honestyStatus: animeRow.honesty_status,
    fillerPercentage: calculatedFillerPercentage,
    trending: Boolean(animeRow.trending),
    synopsis: animeRow.synopsis || '',
    franchiseId: animeRow.franchise_id || '',
    franchiseStepOrder: animeRow.franchise_step_order || '',
    aliases,
    genres,
    vibes,
    review: {
      heading: animeRow.review_heading || '',
      paragraphs: reviewParagraphs
    },
    lessons: {
      heading: animeRow.lesson_heading || '',
      takeaway: animeRow.lesson_takeaway || ''
    },
    source: {
      title: animeRow.source_title || '',
      originalTitle: animeRow.source_original_title || '',
      author: animeRow.source_author || '',
      type: animeRow.source_type || 'Manga',
      volumes: animeRow.source_volumes || '',
      publicationStatus: animeRow.source_publication_status || 'Ongoing',
      adaptationStatus: animeRow.source_adaptation_status || '',
      coverage: animeRow.source_coverage || '',
      notes: animeRow.source_notes || ''
    },
    powerSystem: {
      name: animeRow.power_system_name || '',
      paragraphs: powerParagraphs
    },
    fillerBreakdown: {
      ...fillerBreakdown,
      totalEpisodes: totalBreakdownEpisodes,
      canonEpisodes: canonBreakdownEpisodes,
      fillerPercentage: calculatedFillerPercentage,
      counts: {
        mangaCanon: countManga,
        animeCanon: countAnime,
        mixedCanon: countMixed,
        filler: countFiller
      }
    },
    fillerRows,
    characters
  };
}

/**
 * Save core anime fields + aliases, genres, vibes (Transaction).
 */
export function saveAnimeCore(data) {
  const db = getSqliteDb();
  const {
    id,
    slug,
    title,
    originalTitle = '',
    year,
    episodes,
    status = 'Finished',
    honestyStatus = 'watched',
    personalRating = null,
    poster = '',
    backdrop = '',
    addedDate = '',
    lastUpdated = '',
    trending = 0,
    fillerPercentage = 0,
    synopsis = '',
    aliases = [],
    genres = [],
    vibes = []
  } = data;

  if (!id || !slug || !title) {
    throw new Error('ID, Slug, and Title are required.');
  }

  const existing = db.prepare(`SELECT * FROM anime WHERE id = ?`).get(id);

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const parsedRating = personalRating !== '' && personalRating !== null && personalRating !== undefined
      ? Number(personalRating)
      : (existing?.personal_rating ?? null);
    const parsedYear = Number(year) || (existing?.year ?? 0);
    const parsedEpisodes = (episodes !== undefined && episodes !== null && episodes !== '')
      ? Number(episodes)
      : (Number(existing?.episodes) || 0);
    const parsedTrending = trending ? 1 : (existing?.trending ? 1 : 0);
    const parsedFiller = (fillerPercentage !== undefined && fillerPercentage !== null && fillerPercentage !== '')
      ? (Number(fillerPercentage) || 0)
      : (Number(existing?.filler_percentage) || 0);

    const finalOriginalTitle = originalTitle !== undefined ? String(originalTitle) : (existing?.original_title ?? '');
    const finalStatus = status || existing?.status || 'Finished';
    const finalPoster = poster !== undefined ? String(poster) : (existing?.poster ?? '');
    const finalBackdrop = backdrop !== undefined ? String(backdrop) : (existing?.backdrop ?? '');
    const finalAddedDate = addedDate || existing?.added_date || new Date().toISOString().split('T')[0];
    const finalLastUpdated = lastUpdated || new Date().toISOString().split('T')[0];
    const finalHonestyStatus = honestyStatus || existing?.honesty_status || 'watched';
    const finalSynopsis = synopsis !== undefined ? String(synopsis) : (existing?.synopsis ?? '');

    if (existing) {
      db.prepare(`
        UPDATE anime SET
          slug = ?, title = ?, original_title = ?, year = ?, episodes = ?,
          status = ?, personal_rating = ?, poster = ?, backdrop = ?,
          added_date = ?, last_updated = ?, honesty_status = ?,
          filler_percentage = ?, trending = ?, synopsis = ?
        WHERE id = ?
      `).run(
        slug, title, finalOriginalTitle, parsedYear, parsedEpisodes,
        finalStatus, parsedRating, finalPoster, finalBackdrop,
        finalAddedDate, finalLastUpdated, finalHonestyStatus,
        parsedFiller, parsedTrending, finalSynopsis,
        id
      );
    } else {
      db.prepare(`
        INSERT INTO anime (
          id, slug, title, original_title, year, episodes,
          status, personal_rating, poster, backdrop,
          added_date, last_updated, honesty_status,
          filler_percentage, trending, synopsis
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, slug, title, finalOriginalTitle, parsedYear, parsedEpisodes,
        finalStatus, parsedRating, finalPoster, finalBackdrop,
        finalAddedDate, finalLastUpdated, finalHonestyStatus,
        parsedFiller, parsedTrending, finalSynopsis
      );
    }

    // Sync aliases
    db.prepare(`DELETE FROM anime_aliases WHERE anime_id = ?`).run(id);
    const insertAlias = db.prepare(`INSERT INTO anime_aliases (anime_id, alias) VALUES (?, ?)`);
    for (const a of aliases) {
      const trimmed = String(a).trim();
      if (trimmed) insertAlias.run(id, trimmed);
    }

    // Sync genres
    db.prepare(`DELETE FROM anime_genres WHERE anime_id = ?`).run(id);
    const insertGenre = db.prepare(`INSERT INTO anime_genres (anime_id, genre) VALUES (?, ?)`);
    for (const g of genres) {
      const trimmed = String(g).trim();
      if (trimmed) insertGenre.run(id, trimmed);
    }

    // Sync vibes
    db.prepare(`DELETE FROM anime_vibes WHERE anime_id = ?`).run(id);
    const insertVibe = db.prepare(`INSERT INTO anime_vibes (anime_id, vibe_id) VALUES (?, ?)`);
    for (const v of vibes) {
      const trimmed = String(v).trim();
      if (trimmed) insertVibe.run(id, trimmed);
    }

    db.exec('COMMIT;');
    return { success: true, id };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

/**
 * Save My Take / Review section.
 */
export function saveAnimeReview(animeId, { heading = '', paragraphs = [] } = {}) {
  const db = getSqliteDb();
  const cleanParagraphs = Array.isArray(paragraphs) ? paragraphs.map(p => String(p).trim()).filter(Boolean) : [];
  const jsonParagraphs = cleanParagraphs.length > 0 ? JSON.stringify(cleanParagraphs) : null;

  db.prepare(`
    UPDATE anime 
    SET review_heading = ?, review_paragraphs = ?, last_updated = date('now') 
    WHERE id = ?
  `).run(heading.trim() || null, jsonParagraphs, animeId);

  return { success: true };
}

/**
 * Save What I Learned / Reflection section.
 */
export function saveAnimeLessons(animeId, { heading = '', takeaway = '' } = {}) {
  const db = getSqliteDb();
  db.prepare(`
    UPDATE anime 
    SET lesson_heading = ?, lesson_takeaway = ?, last_updated = date('now') 
    WHERE id = ?
  `).run(heading.trim() || null, takeaway.trim() || null, animeId);

  return { success: true };
}

/**
 * Save Watch Order & Franchise Placement for anime.
 */
export function saveAnimeWatchOrderLink(animeId, { franchiseId = null, franchiseStepOrder = null } = {}) {
  const db = getSqliteDb();
  const cleanFranchiseId = franchiseId ? String(franchiseId).trim() : null;
  const cleanStep = franchiseStepOrder ? Number(franchiseStepOrder) : null;

  db.prepare(`
    UPDATE anime 
    SET franchise_id = ?, franchise_step_order = ?, last_updated = date('now') 
    WHERE id = ?
  `).run(cleanFranchiseId, cleanStep, animeId);

  return { success: true };
}

/**
 * Save Filler & Canon Breakdown and recalculate filler_percentage.
 * Accepts { mangaCanon, animeCanon, mixedCanon, filler }.
 */
export function saveAnimeFillerList(animeId, breakdown = {}) {
  const db = getSqliteDb();
  const anime = db.prepare(`SELECT episodes FROM anime WHERE id = ?`).get(animeId);
  if (!anime) throw new Error('Anime not found.');

  const {
    mangaCanon = '',
    animeCanon = '',
    mixedCanon = '',
    filler = ''
  } = breakdown;

  const valManga = validateEpisodeString(mangaCanon);
  if (!valManga.valid) throw new Error(`[Manga Canon] ${valManga.error}`);

  const valAnime = validateEpisodeString(animeCanon);
  if (!valAnime.valid) throw new Error(`[Anime Canon] ${valAnime.error}`);

  const valMixed = validateEpisodeString(mixedCanon);
  if (!valMixed.valid) throw new Error(`[Mixed Canon/Filler] ${valMixed.error}`);

  const valFiller = validateEpisodeString(filler);
  if (!valFiller.valid) throw new Error(`[Filler] ${valFiller.error}`);

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    db.prepare(`DELETE FROM anime_filler_ranges WHERE anime_id = ?`).run(animeId);

    const insertType = db.prepare(`
      INSERT INTO anime_filler_ranges (anime_id, type, episodes, episode_count) 
      VALUES (?, ?, ?, ?)
    `);

    if (valManga.normalized) {
      insertType.run(animeId, 'Manga Canon', valManga.normalized, valManga.count);
    }
    if (valAnime.normalized) {
      insertType.run(animeId, 'Anime Canon', valAnime.normalized, valAnime.count);
    }
    if (valMixed.normalized) {
      insertType.run(animeId, 'Mixed Canon/Filler', valMixed.normalized, valMixed.count);
    }
    if (valFiller.normalized) {
      insertType.run(animeId, 'Filler', valFiller.normalized, valFiller.count);
    }

    // Auto-calculate filler percentage from sum of all 4 categories
    const totalEpisodes = valManga.count + valAnime.count + valMixed.count + valFiller.count;
    const canonEpisodes = valManga.count + valAnime.count;
    let calculatedPercentage = 0;
    if (totalEpisodes > 0 && valFiller.count > 0) {
      calculatedPercentage = Math.min(100, Math.round((valFiller.count / totalEpisodes) * 100));
    }

    if (totalEpisodes > 0) {
      db.prepare(`
        UPDATE anime 
        SET filler_percentage = ?, episodes = ?, last_updated = date('now') 
        WHERE id = ?
      `).run(calculatedPercentage, totalEpisodes, animeId);
    } else {
      db.prepare(`
        UPDATE anime 
        SET filler_percentage = ?, last_updated = date('now') 
        WHERE id = ?
      `).run(calculatedPercentage, animeId);
    }

    db.exec('COMMIT;');
    return {
      success: true,
      totalEpisodes,
      canonEpisodes,
      fillerPercentage: calculatedPercentage,
      counts: {
        mangaCanon: valManga.count,
        animeCanon: valAnime.count,
        mixedCanon: valMixed.count,
        filler: valFiller.count
      }
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

/**
 * Save Key Characters.
 */
export function saveAnimeCharacters(animeId, characters = []) {
  const db = getSqliteDb();

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    db.prepare(`DELETE FROM anime_characters WHERE anime_id = ?`).run(animeId);

    const insertChar = db.prepare(`
      INSERT INTO anime_characters (anime_id, rank, name, category, role, commentary) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    characters.forEach((char, index) => {
      const rank = Number(char.rank || index + 1);
      const name = String(char.name || '').trim();
      const category = String(char.category || 'Supporting').trim();
      const role = char.role ? String(char.role).trim() : null;
      const commentary = char.commentary ? String(char.commentary).trim() : null;

      if (name) {
        insertChar.run(animeId, rank, name, category, role, commentary);
      }
    });

    db.prepare(`UPDATE anime SET last_updated = date('now') WHERE id = ?`).run(animeId);
    db.exec('COMMIT;');
    return { success: true };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

/**
 * Save Manga & Light Novel Source Guidance.
 */
export function saveAnimeSource(animeId, source = {}) {
  const db = getSqliteDb();
  db.prepare(`
    UPDATE anime SET
      source_title = ?,
      source_original_title = ?,
      source_author = ?,
      source_type = ?,
      source_volumes = ?,
      source_publication_status = ?,
      source_adaptation_status = ?,
      source_coverage = ?,
      source_notes = ?,
      last_updated = date('now')
    WHERE id = ?
  `).run(
    source.title?.trim() || null,
    source.originalTitle?.trim() || null,
    source.author?.trim() || null,
    source.type?.trim() || 'Manga',
    source.volumes?.trim() || null,
    source.publicationStatus?.trim() || 'Ongoing',
    source.adaptationStatus?.trim() || null,
    source.coverage?.trim() || null,
    source.notes?.trim() || null,
    animeId
  );

  return { success: true };
}

/**
 * Save Power System.
 */
export function saveAnimePowerSystem(animeId, { name = '', paragraphs = [] } = {}) {
  const db = getSqliteDb();
  const cleanParagraphs = Array.isArray(paragraphs) ? paragraphs.map(p => String(p).trim()).filter(Boolean) : [];
  const jsonParagraphs = cleanParagraphs.length > 0 ? JSON.stringify(cleanParagraphs) : null;

  db.prepare(`
    UPDATE anime 
    SET power_system_name = ?, power_system_paragraphs = ?, last_updated = date('now') 
    WHERE id = ?
  `).run(name.trim() || null, jsonParagraphs, animeId);

  return { success: true };
}

/**
 * Delete an anime and all cascading related records.
 */
export function deleteAnime(animeId) {
  const db = getSqliteDb();
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    db.prepare(`DELETE FROM anime WHERE id = ?`).run(animeId);
    db.exec('COMMIT;');
    return { success: true };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// -------------------------------------------------------------
// Franchise & Watch Order Operations
// -------------------------------------------------------------

export async function getAllFranchises() {
  const db = await getDatabase();
  const franchises = await db.query(`SELECT * FROM franchises ORDER BY name ASC`);
  const allSteps = await db.query(`SELECT * FROM franchise_watch_order ORDER BY step_order ASC`);

  const stepsMap = new Map();
  for (const step of allSteps) {
    if (!stepsMap.has(step.franchise_id)) stepsMap.set(step.franchise_id, []);
    stepsMap.get(step.franchise_id).push({
      id: step.id,
      stepOrder: step.step_order,
      title: step.title,
      type: step.type,
      episodes: step.episodes,
      animeId: step.anime_id,
      note: step.note
    });
  }

  return franchises.map(f => ({
    id: f.id,
    name: f.name,
    description: f.description || '',
    steps: stepsMap.get(f.id) || []
  }));
}

export function saveFranchise({ id, name, description = '', steps = [] }) {
  const db = getSqliteDb();
  if (!id || !name) throw new Error('Franchise ID and Name are required.');

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    db.prepare(`
      INSERT INTO franchises (id, name, description) VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description
    `).run(id.trim(), name.trim(), description.trim());

    if (Array.isArray(steps)) {
      db.prepare(`DELETE FROM franchise_watch_order WHERE franchise_id = ?`).run(id);
      const insertStep = db.prepare(`
        INSERT INTO franchise_watch_order (franchise_id, step_order, title, type, episodes, anime_id, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      steps.forEach((step, idx) => {
        insertStep.run(
          id,
          idx + 1,
          String(step.title || '').trim(),
          String(step.type || 'TV Series').trim(),
          String(step.episodes || '').trim(),
          step.animeId?.trim() || null,
          step.note?.trim() || null
        );
      });
    }

    db.exec('COMMIT;');
    return { success: true, id };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function deleteFranchise(franchiseId) {
  const db = getSqliteDb();
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    db.prepare(`DELETE FROM franchises WHERE id = ?`).run(franchiseId);
    db.exec('COMMIT;');
    return { success: true };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// -------------------------------------------------------------
// Blog Management Operations
// -------------------------------------------------------------

export async function getAllAdminBlogPosts() {
  const db = await getDatabase();
  const posts = await db.query(`SELECT * FROM blog_posts ORDER BY published_date DESC`);
  const links = await db.query(`
    SELECT bpa.post_id, a.id, a.title, a.slug, a.year 
    FROM blog_post_anime bpa 
    JOIN anime a ON bpa.anime_id = a.id
  `);

  const linksMap = new Map();
  for (const row of links) {
    if (!linksMap.has(row.post_id)) linksMap.set(row.post_id, []);
    linksMap.get(row.post_id).push(row);
  }

  return posts.map(p => {
    const wordCount = p.content ? p.content.trim().split(/\s+/).length : 0;
    const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
      publishedDate: p.published_date,
      lastUpdated: p.last_updated,
      status: p.status,
      readTime: `${readTimeMinutes} min read`,
      linkedAnime: linksMap.get(p.id) || []
    };
  });
}

export async function getAdminBlogPostById(id) {
  const posts = await getAllAdminBlogPosts();
  return posts.find(p => p.id === id || p.slug === id) || null;
}

export function saveBlogPost({ id, slug, title, excerpt, content, publishedDate, lastUpdated = '', status = 'published', linkedAnimeIds = [] }) {
  const db = getSqliteDb();
  if (!id || !slug || !title || !content) {
    throw new Error('ID, Slug, Title, and Content are required.');
  }

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    db.prepare(`
      INSERT INTO blog_posts (id, slug, title, excerpt, content, published_date, last_updated, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        slug = excluded.slug,
        title = excluded.title,
        excerpt = excluded.excerpt,
        content = excluded.content,
        published_date = excluded.published_date,
        last_updated = excluded.last_updated,
        status = excluded.status
    `).run(
      id.trim(),
      slug.trim(),
      title.trim(),
      excerpt ? excerpt.trim() : '',
      content.trim(),
      publishedDate || new Date().toISOString().split('T')[0],
      lastUpdated || new Date().toISOString().split('T')[0],
      status
    );

    // Sync linked anime
    db.prepare(`DELETE FROM blog_post_anime WHERE post_id = ?`).run(id);
    const insertLink = db.prepare(`INSERT INTO blog_post_anime (post_id, anime_id) VALUES (?, ?)`);
    for (const animeId of linkedAnimeIds) {
      if (animeId && animeId.trim()) {
        insertLink.run(id, animeId.trim());
      }
    }

    db.exec('COMMIT;');
    return { success: true, id };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function deleteBlogPost(id) {
  const db = getSqliteDb();
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    db.prepare(`DELETE FROM blog_posts WHERE id = ?`).run(id);
    db.exec('COMMIT;');
    return { success: true };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}
