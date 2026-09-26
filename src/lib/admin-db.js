// src/lib/admin-db.js
// Server-side SQLite / D1 data mutations using parameterized queries.

import { getDatabase, invalidateAnimeCache, invalidateBlogCache } from './d1.js';
import { validateEpisodeString } from './filler-utils.js';

/**
 * Fetch an anime entry by ID along with all its related normalized records.
 */
export async function getAnimeById(idOrSlug, contextOrLocals = null) {
  if (!idOrSlug) return null;
  const db = await getDatabase(contextOrLocals);

  const animeRow = await db.queryOne(`SELECT * FROM anime WHERE id = ? OR slug = ?`, idOrSlug, idOrSlug);
  if (!animeRow) return null;

  const actualId = animeRow.id;
  const aliases = (await db.query(`SELECT alias FROM anime_aliases WHERE anime_id = ?`, actualId)).map(r => r.alias);
  const genres = (await db.query(`SELECT genre FROM anime_genres WHERE anime_id = ?`, actualId)).map(r => r.genre);
  const vibes = (await db.query(`SELECT vibe_id FROM anime_vibes WHERE anime_id = ?`, actualId)).map(r => r.vibe_id);
  
  let fillerRows = [];
  try {
    fillerRows = await db.query(`
      SELECT * 
      FROM anime_filler_ranges 
      WHERE anime_id = ?
    `, actualId);
  } catch (err) {
    console.warn("Failed to query anime_filler_ranges in getAnimeById:", err?.message || err);
  }

  const getEp = (t) => {
    const row = fillerRows.find(r => r.type === t);
    return row?.episodes || row?.range || '';
  };
  const getCount = (t) => {
    const row = fillerRows.find(r => r.type === t);
    if (!row) return 0;
    if (typeof row.episode_count === 'number') return row.episode_count;
    if (typeof row.episodeCount === 'number') return row.episodeCount;
    const epStr = row.episodes || row.range || '';
    return epStr ? epStr.split(',').length : 0;
  };

  const fillerBreakdown = {
    mangaCanon: getEp('Manga Canon'),
    animeCanon: getEp('Anime Canon'),
    mixedCanon: getEp('Mixed Canon/Filler'),
    filler: getEp('Filler')
  };

  const countManga = getCount('Manga Canon');
  const countAnime = getCount('Anime Canon');
  const countMixed = getCount('Mixed Canon/Filler');
  const countFiller = getCount('Filler');
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

  let relatedMedia = [];
  try {
    relatedMedia = await db.query(`
      SELECT id, section, title, badge, link_slug as linkSlug, editorial_note as editorialNote, item_order as itemOrder
      FROM anime_related_media
      WHERE anime_id = ?
      ORDER BY item_order ASC, id ASC
    `, actualId);
  } catch (err) {
    console.warn("Failed to query anime_related_media in getAnimeById:", err?.message || err);
  }

  let recommendations = [];
  try {
    recommendations = await db.query(`
      SELECT id, target_anime_id as targetAnimeId, category_badge as categoryBadge, editorial_note as editorialNote, item_order as itemOrder
      FROM anime_recommendations
      WHERE anime_id = ?
      ORDER BY item_order ASC, id ASC
    `, actualId);
  } catch (err) {
    console.warn("Failed to query anime_recommendations in getAnimeById:", err?.message || err);
  }

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

  let sectionVisibility = {
    review: true,
    lessons: true,
    watchOrder: true,
    fillerList: true,
    characters: true,
    source: true,
    powerSystem: true,
    universe: true,
    recommendations: true
  };
  if (animeRow.section_visibility) {
    try {
      sectionVisibility = { ...sectionVisibility, ...JSON.parse(animeRow.section_visibility) };
    } catch {}
  }

  return {
    id: animeRow.id,
    slug: animeRow.slug,
    title: animeRow.title,
    originalTitle: animeRow.original_title || '',
    year: animeRow.year,
    type: animeRow.type || 'series',
    runtime: (animeRow.runtime !== null && animeRow.runtime !== undefined && animeRow.runtime !== '') ? Number(animeRow.runtime) : null,
    movieCanonType: animeRow.movie_canon_type || null,
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
    sectionVisibility,
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
    characters,
    universe: relatedMedia,
    recommendations
  };
}

/**
 * Save core anime fields + aliases, genres, vibes.
 */
export async function saveAnimeCore(data, contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
  const {
    id,
    slug,
    title,
    originalTitle = '',
    year,
    episodes,
    type = 'series',
    runtime = null,
    movieCanonType = null,
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

  const existing = await db.queryOne(`SELECT * FROM anime WHERE id = ?`, id);

  const finalType = type === 'movie' ? 'movie' : (existing?.type === 'movie' && type === undefined ? 'movie' : 'series');
  const finalRuntime = finalType === 'movie'
    ? ((runtime !== undefined && runtime !== null && runtime !== '') ? Number(runtime) : (existing?.runtime ?? null))
    : null;
  const finalMovieCanonType = finalType === 'movie'
    ? (movieCanonType !== undefined && movieCanonType !== null ? String(movieCanonType).trim() : (existing?.movie_canon_type ?? null))
    : null;

  const parsedRating = personalRating !== '' && personalRating !== null && personalRating !== undefined
    ? Number(personalRating)
    : (existing?.personal_rating ?? null);
  const parsedYear = Number(year) || (existing?.year ?? 0);
  let parsedEpisodes = (episodes !== undefined && episodes !== null && episodes !== '')
    ? Number(episodes)
    : (Number(existing?.episodes) || 0);
  if (finalType === 'movie' && (!parsedEpisodes || parsedEpisodes < 1)) {
    parsedEpisodes = 1;
  }
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
    await db.run(`
      UPDATE anime SET
        slug = ?, title = ?, original_title = ?, year = ?, episodes = ?,
        type = ?, runtime = ?, movie_canon_type = ?,
        status = ?, personal_rating = ?, poster = ?, backdrop = ?,
        added_date = ?, last_updated = ?, honesty_status = ?,
        filler_percentage = ?, trending = ?, synopsis = ?
      WHERE id = ?
    `,
      slug, title, finalOriginalTitle, parsedYear, parsedEpisodes,
      finalType, finalRuntime, finalMovieCanonType,
      finalStatus, parsedRating, finalPoster, finalBackdrop,
      finalAddedDate, finalLastUpdated, finalHonestyStatus,
      parsedFiller, parsedTrending, finalSynopsis,
      id
    );
  } else {
    await db.run(`
      INSERT INTO anime (
        id, slug, title, original_title, year, episodes,
        type, runtime, movie_canon_type,
        status, personal_rating, poster, backdrop,
        added_date, last_updated, honesty_status,
        filler_percentage, trending, synopsis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      id, slug, title, finalOriginalTitle, parsedYear, parsedEpisodes,
      finalType, finalRuntime, finalMovieCanonType,
      finalStatus, parsedRating, finalPoster, finalBackdrop,
      finalAddedDate, finalLastUpdated, finalHonestyStatus,
      parsedFiller, parsedTrending, finalSynopsis
    );
  }

  // Sync aliases
  await db.run(`DELETE FROM anime_aliases WHERE anime_id = ?`, id);
  for (const a of aliases) {
    const trimmed = String(a).trim();
    if (trimmed) await db.run(`INSERT INTO anime_aliases (anime_id, alias) VALUES (?, ?)`, id, trimmed);
  }

  // Sync genres
  await db.run(`DELETE FROM anime_genres WHERE anime_id = ?`, id);
  for (const g of genres) {
    const trimmed = String(g).trim();
    if (trimmed) await db.run(`INSERT INTO anime_genres (anime_id, genre) VALUES (?, ?)`, id, trimmed);
  }

  // Sync vibes
  await db.run(`DELETE FROM anime_vibes WHERE anime_id = ?`, id);
  for (const v of vibes) {
    const trimmed = String(v).trim();
    if (trimmed) await db.run(`INSERT INTO anime_vibes (anime_id, vibe_id) VALUES (?, ?)`, id, trimmed);
  }

  invalidateAnimeCache();
  return { success: true, id };
}

/**
 * Save section visibility flags (Show/Hide on public page).
 */
export async function saveAnimeVisibility(animeId, visibility = {}, contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
  const existing = await db.queryOne('SELECT section_visibility FROM anime WHERE id = ?', animeId);
  if (!existing) throw new Error('Anime not found');

  let currentVis = {
    review: true,
    lessons: true,
    watchOrder: true,
    fillerList: true,
    characters: true,
    source: true,
    powerSystem: true
  };

  if (existing.section_visibility) {
    try {
      currentVis = { ...currentVis, ...JSON.parse(existing.section_visibility) };
    } catch {}
  }

  const merged = { ...currentVis, ...visibility };
  await db.run(`
    UPDATE anime 
    SET section_visibility = ?, last_updated = date('now') 
    WHERE id = ?
  `, JSON.stringify(merged), animeId);

  invalidateAnimeCache();
  return { success: true, visibility: merged };
}

/**
 * Universal save: Persist all anime sections and visibility settings simultaneously.
 */
export async function saveAllAnime(payload, contextOrLocals = null) {
  let animeId = payload.core?.id || payload.animeId;
  if (!animeId) {
    throw new Error('Anime ID is required');
  }

  // 1. Core Information
  if (payload.core) {
    const res = await saveAnimeCore(payload.core, contextOrLocals);
    if (res?.id) animeId = res.id;
  }

  // 2. Personal Take / Review
  if (payload.review) {
    await saveAnimeReview(animeId, payload.review, contextOrLocals);
  }

  // 3. What I Learned / Reflection
  if (payload.lessons) {
    await saveAnimeLessons(animeId, payload.lessons, contextOrLocals);
  }

  // 4. Watch Order Placement
  if (payload.watchOrder) {
    await saveAnimeWatchOrderLink(animeId, {
      franchiseId: payload.watchOrder.franchiseId,
      franchiseStepOrder: payload.watchOrder.franchiseStepOrder
    }, contextOrLocals);
  }

  // 5. Filler & Canon Episode Breakdown
  let fillerResult = null;
  if (payload.filler) {
    fillerResult = await saveAnimeFillerList(animeId, payload.filler, contextOrLocals);
  }

  // 6. Key Characters
  if (payload.characters) {
    await saveAnimeCharacters(animeId, payload.characters, contextOrLocals);
  }

  // 7. Source Material Guidance
  if (payload.source) {
    await saveAnimeSource(animeId, payload.source, contextOrLocals);
  }

  // 8. Power System / Lore Mechanics
  if (payload.powerSystem) {
    await saveAnimePowerSystem(animeId, payload.powerSystem, contextOrLocals);
  }

  // 9. Related & Universe Media
  if (payload.universe) {
    await saveAnimeRelatedMedia(animeId, payload.universe, contextOrLocals);
  }

  // 10. Shows Like This Recommendations
  if (payload.recommendations) {
    await saveAnimeRecommendations(animeId, payload.recommendations, contextOrLocals);
  }

  // 11. Visibility Toggles
  if (payload.visibility) {
    const finalVis = { ...payload.visibility };
    if (payload.core?.type === 'movie') {
      finalVis.fillerList = false;
    }
    await saveAnimeVisibility(animeId, finalVis, contextOrLocals);
  }

  invalidateAnimeCache();
  return {
    success: true,
    animeId,
    fillerResult
  };
}

/**
 * Save My Take / Review section.
 */
export async function saveAnimeReview(animeId, { heading = '', paragraphs = [] } = {}, contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
  const cleanParagraphs = Array.isArray(paragraphs) ? paragraphs.map(p => String(p).trim()).filter(Boolean) : [];
  const jsonParagraphs = cleanParagraphs.length > 0 ? JSON.stringify(cleanParagraphs) : null;

  await db.run(`
    UPDATE anime 
    SET review_heading = ?, review_paragraphs = ?, last_updated = date('now') 
    WHERE id = ?
  `, heading.trim() || null, jsonParagraphs, animeId);

  invalidateAnimeCache();
  return { success: true };
}

/**
 * Save What I Learned / Reflection section.
 */
export async function saveAnimeLessons(animeId, { heading = '', takeaway = '' } = {}, contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
  await db.run(`
    UPDATE anime 
    SET lesson_heading = ?, lesson_takeaway = ?, last_updated = date('now') 
    WHERE id = ?
  `, heading.trim() || null, takeaway.trim() || null, animeId);

  invalidateAnimeCache();
  return { success: true };
}

/**
 * Save Watch Order & Franchise Placement for anime.
 */
export async function saveAnimeWatchOrderLink(animeId, { franchiseId = null, franchiseStepOrder = null } = {}, contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
  const cleanFranchiseId = franchiseId ? String(franchiseId).trim() : null;
  const cleanStep = franchiseStepOrder ? Number(franchiseStepOrder) : null;

  await db.run(`
    UPDATE anime 
    SET franchise_id = ?, franchise_step_order = ?, last_updated = date('now') 
    WHERE id = ?
  `, cleanFranchiseId, cleanStep, animeId);

  invalidateAnimeCache();
  return { success: true };
}

/**
 * Save Filler & Canon Breakdown and recalculate filler_percentage.
 * Accepts { mangaCanon, animeCanon, mixedCanon, filler }.
 */
export async function saveAnimeFillerList(animeId, breakdown = {}, contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
  const anime = await db.queryOne(`SELECT episodes FROM anime WHERE id = ?`, animeId);
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

  await db.run(`DELETE FROM anime_filler_ranges WHERE anime_id = ?`, animeId);

  if (valManga.normalized) {
    await db.run(`
      INSERT INTO anime_filler_ranges (anime_id, type, episodes, episode_count) 
      VALUES (?, ?, ?, ?)
    `, animeId, 'Manga Canon', valManga.normalized, valManga.count);
  }
  if (valAnime.normalized) {
    await db.run(`
      INSERT INTO anime_filler_ranges (anime_id, type, episodes, episode_count) 
      VALUES (?, ?, ?, ?)
    `, animeId, 'Anime Canon', valAnime.normalized, valAnime.count);
  }
  if (valMixed.normalized) {
    await db.run(`
      INSERT INTO anime_filler_ranges (anime_id, type, episodes, episode_count) 
      VALUES (?, ?, ?, ?)
    `, animeId, 'Mixed Canon/Filler', valMixed.normalized, valMixed.count);
  }
  if (valFiller.normalized) {
    await db.run(`
      INSERT INTO anime_filler_ranges (anime_id, type, episodes, episode_count) 
      VALUES (?, ?, ?, ?)
    `, animeId, 'Filler', valFiller.normalized, valFiller.count);
  }

  // Auto-calculate filler percentage from sum of all 4 categories
  const totalEpisodes = valManga.count + valAnime.count + valMixed.count + valFiller.count;
  const canonEpisodes = valManga.count + valAnime.count;
  let calculatedPercentage = 0;
  if (totalEpisodes > 0 && valFiller.count > 0) {
    calculatedPercentage = Math.min(100, Math.round((valFiller.count / totalEpisodes) * 100));
  }

  if (!anime.episodes && totalEpisodes > 0) {
    await db.run(`
      UPDATE anime 
      SET filler_percentage = ?, episodes = ?, last_updated = date('now') 
      WHERE id = ?
    `, calculatedPercentage, totalEpisodes, animeId);
  } else {
    await db.run(`
      UPDATE anime 
      SET filler_percentage = ?, last_updated = date('now') 
      WHERE id = ?
    `, calculatedPercentage, animeId);
  }

  invalidateAnimeCache();
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
}

/**
 * Save Key Characters.
 */
export async function saveAnimeCharacters(animeId, characters = [], contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
  await db.run(`DELETE FROM anime_characters WHERE anime_id = ?`, animeId);

  for (let index = 0; index < characters.length; index++) {
    const char = characters[index];
    const rank = Number(char.rank || index + 1);
    const name = String(char.name || '').trim();
    const category = String(char.category || 'Supporting').trim();
    const role = char.role ? String(char.role).trim() : null;
    const commentary = char.commentary ? String(char.commentary).trim() : null;

    if (name) {
      await db.run(`
        INSERT INTO anime_characters (anime_id, rank, name, category, role, commentary) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, animeId, rank, name, category, role, commentary);
    }
  }

  await db.run(`UPDATE anime SET last_updated = date('now') WHERE id = ?`, animeId);
  invalidateAnimeCache();
  return { success: true };
}

/**
 * Save Manga & Light Novel Source Guidance.
 */
export async function saveAnimeSource(animeId, source = {}, contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
  await db.run(`
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
  `,
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

  invalidateAnimeCache();
  return { success: true };
}

/**
 * Save Power System.
 */
export async function saveAnimePowerSystem(animeId, { name = '', paragraphs = [] } = {}, contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
  const cleanParagraphs = Array.isArray(paragraphs) ? paragraphs.map(p => String(p).trim()).filter(Boolean) : [];
  const jsonParagraphs = cleanParagraphs.length > 0 ? JSON.stringify(cleanParagraphs) : null;

  await db.run(`
    UPDATE anime 
    SET power_system_name = ?, power_system_paragraphs = ?, last_updated = date('now') 
    WHERE id = ?
  `, name.trim() || null, jsonParagraphs, animeId);

  invalidateAnimeCache();
  return { success: true };
}

/**
 * Save Related & Universe Media.
 */
export async function saveAnimeRelatedMedia(animeId, items = [], contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
  await db.run(`DELETE FROM anime_related_media WHERE anime_id = ?`, animeId);

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const section = item.section === 'non_canon' ? 'non_canon' : 'canon';
    const title = String(item.title || '').trim();
    const badge = String(item.badge || '').trim();
    const linkSlug = item.linkSlug ? String(item.linkSlug).trim() : null;
    const editorialNote = item.editorialNote ? String(item.editorialNote).trim() : null;
    const itemOrder = Number(item.itemOrder || index + 1);

    if (title && badge) {
      await db.run(`
        INSERT INTO anime_related_media (anime_id, section, title, badge, link_slug, editorial_note, item_order) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, animeId, section, title, badge, linkSlug, editorialNote, itemOrder);
    }
  }

  await db.run(`UPDATE anime SET last_updated = date('now') WHERE id = ?`, animeId);
  invalidateAnimeCache();
  return { success: true };
}

/**
 * Save Shows Like This Recommendations.
 */
export async function saveAnimeRecommendations(animeId, items = [], contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
  await db.run(`DELETE FROM anime_recommendations WHERE anime_id = ?`, animeId);

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const targetAnimeId = String(item.targetAnimeId || '').trim();
    const categoryBadge = String(item.categoryBadge || '').trim();
    const editorialNote = item.editorialNote ? String(item.editorialNote).trim() : null;
    const itemOrder = Number(item.itemOrder || index + 1);

    if (targetAnimeId && categoryBadge) {
      await db.run(`
        INSERT INTO anime_recommendations (anime_id, target_anime_id, category_badge, editorial_note, item_order) 
        VALUES (?, ?, ?, ?, ?)
      `, animeId, targetAnimeId, categoryBadge, editorialNote, itemOrder);
    }
  }

  await db.run(`UPDATE anime SET last_updated = date('now') WHERE id = ?`, animeId);
  invalidateAnimeCache();
  return { success: true };
}

/**
 * Delete an anime and all cascading related records.
 */
export async function deleteAnime(animeId, contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
  await db.run(`DELETE FROM anime WHERE id = ?`, animeId);
  invalidateAnimeCache();
  return { success: true };
}

// -------------------------------------------------------------
// Franchise & Watch Order Operations
// -------------------------------------------------------------

export async function getAllFranchises(contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
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

export async function saveFranchise({ id, name, description = '', steps = [] }, contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
  if (!id || !name) throw new Error('Franchise ID and Name are required.');

  await db.run(`
    INSERT INTO franchises (id, name, description) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description
  `, id.trim(), name.trim(), description.trim());

  if (Array.isArray(steps)) {
    await db.run(`DELETE FROM franchise_watch_order WHERE franchise_id = ?`, id);
    for (let idx = 0; idx < steps.length; idx++) {
      const step = steps[idx];
      await db.run(`
        INSERT INTO franchise_watch_order (franchise_id, step_order, title, type, episodes, anime_id, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        id,
        idx + 1,
        String(step.title || '').trim(),
        String(step.type || 'TV Series').trim(),
        String(step.episodes || '').trim(),
        step.animeId?.trim() || null,
        step.note?.trim() || null
      );
    }
  }

  invalidateAnimeCache();
  return { success: true, id };
}

export async function deleteFranchise(franchiseId, contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
  await db.run(`DELETE FROM franchises WHERE id = ?`, franchiseId);
  invalidateAnimeCache();
  return { success: true };
}

// -------------------------------------------------------------
// Blog Management Operations
// -------------------------------------------------------------

export async function getAllAdminBlogPosts(contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
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

export async function getAdminBlogPostById(id, contextOrLocals = null) {
  const posts = await getAllAdminBlogPosts(contextOrLocals);
  return posts.find(p => p.id === id || p.slug === id) || null;
}

export async function saveBlogPost({ id, slug, title, excerpt, content, publishedDate, lastUpdated = '', status = 'published', linkedAnimeIds = [] }, contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
  if (!id || !slug || !title || !content) {
    throw new Error('ID, Slug, Title, and Content are required.');
  }

  await db.run(`
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
  `,
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
  await db.run(`DELETE FROM blog_post_anime WHERE post_id = ?`, id);
  for (const animeId of linkedAnimeIds) {
    if (animeId && animeId.trim()) {
      await db.run(`INSERT INTO blog_post_anime (post_id, anime_id) VALUES (?, ?)`, id, animeId.trim());
    }
  }

  invalidateBlogCache();
  return { success: true, id };
}

export async function deleteBlogPost(id, contextOrLocals = null) {
  const db = await getDatabase(contextOrLocals);
  await db.run(`DELETE FROM blog_posts WHERE id = ?`, id);
  invalidateBlogCache();
  return { success: true };
}
