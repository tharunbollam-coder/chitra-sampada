// src/lib/filler-utils.js

export const FILLER_CATEGORY = /** @type {const} */ ({
  mangaCanon: 'Manga Canon',
  animeCanon: 'Anime Canon',
  mixedCanon: 'Mixed Canon/Filler',
  filler: 'Filler'
});

/** @typedef {{ type: string, episodes: string, count: number }} FillerEntry */
/** @typedef {{ hasFillerData?: boolean, fillerPercentage?: number | null, fillerList?: {totalEpisodes: number} | null, sectionVisibility?: {fillerList?: boolean} }} AnimeFillerData */

/** @param {string} type */
export function getFillerCategoryRank(type) {
  const label = String(type || '').trim().toLowerCase();
  if (label.includes('manga')) return 1;
  if (label.includes('anime')) return 2;
  if (label.includes('mixed')) return 3;
  if (label.includes('filler')) return 4;
  return 99;
}

/**
 * Keep the stored-count fallback for older records. The caller determines
 * whether zero or negative stored counts are considered usable.
 * @param {string} episodes
 * @param {unknown} storedCount
 * @param {'any' | 'positive' | 'nonnegative'} [policy]
 */
export function getStoredEpisodeCount(episodes, storedCount, policy = 'any') {
  if (typeof storedCount === 'number' && (
    policy === 'any' || (policy === 'positive' ? storedCount > 0 : storedCount >= 0)
  )) {
    return storedCount;
  }
  return episodes ? episodes.split(',').length : 0;
}

/**
 * @param {number} fillerEpisodes
 * @param {number} totalEpisodes
 * @param {{fallback?: number, capAt100?: boolean}} [options]
 */
export function calculateFillerPercentage(fillerEpisodes, totalEpisodes, { fallback = 0, capAt100 = false } = {}) {
  if (!(totalEpisodes > 0)) return fallback;
  const percentage = Math.round((fillerEpisodes / totalEpisodes) * 100);
  return capAt100 ? Math.min(100, percentage) : percentage;
}

/**
 * @param {number} mangaCanonEpisodes
 * @param {number} animeCanonEpisodes
 * @param {number} mixedEpisodes
 * @param {number} fillerEpisodes
 */
export function summarizeFillerCounts(mangaCanonEpisodes, animeCanonEpisodes, mixedEpisodes, fillerEpisodes) {
  const canonEpisodes = mangaCanonEpisodes + animeCanonEpisodes;
  return {
    totalEpisodes: canonEpisodes + mixedEpisodes + fillerEpisodes,
    fillerEpisodes,
    canonEpisodes,
    mangaCanonEpisodes,
    animeCanonEpisodes,
    mixedEpisodes
  };
}

/**
 * The bulk reader historically uses the last duplicate entry. The detail
 * page and its tab use the first matching entry.
 * @param {FillerEntry[]} entries
 * @param {'first' | 'last'} [duplicate]
 */
export function summarizeFillerEntries(entries, duplicate = 'first') {
  const count = (/** @type {string} */ type) => {
    if (duplicate === 'last') {
      return entries.findLast((entry) => entry.type === type)?.count ?? 0;
    }
    return entries.find((entry) => entry.type === type)?.count || 0;
  };
  return summarizeFillerCounts(
    count(FILLER_CATEGORY.mangaCanon),
    count(FILLER_CATEGORY.animeCanon),
    count(FILLER_CATEGORY.mixedCanon),
    count(FILLER_CATEGORY.filler)
  );
}

/** @param {AnimeFillerData} anime */
export function getAnimeFillerBadge(anime) {
  const hasFillerData = Boolean(anime.hasFillerData ?? (
    anime.fillerList && anime.fillerList.totalEpisodes > 0 && anime.sectionVisibility?.fillerList !== false
  ));
  return { hasFillerData, isZeroFiller: hasFillerData && anime.fillerPercentage === 0 };
}

/** @param {AnimeFillerData} anime */
export function isZeroFiller(anime) {
  return Boolean(anime.hasFillerData && anime.fillerPercentage === 0);
}

/**
 * Validate an episode range string (e.g. "1-44, 48-49, 52-53, 62-67, 100, 103-130").
 * Performs light validation:
 * - Allows single episode numbers (e.g. "100")
 * - Allows hyphenated ranges (e.g. "1-44", "1–44")
 * - Separated by commas
 * - Flags errors for non-numeric characters or where start > end
 * 
 * @param {string} str 
 * @returns {{ valid: boolean, error?: string, count: number, normalized: string }}
 */
export function validateEpisodeString(str) {
  if (!str || typeof str !== 'string' || !str.trim()) {
    return { valid: true, count: 0, normalized: '' };
  }

  const parts = str.split(',').map(p => p.trim()).filter(Boolean);
  let totalCount = 0;
  const normalizedParts = [];

  for (const part of parts) {
    // Match range with standard hyphen, en-dash, or em-dash
    const rangeMatch = part.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (start > end) {
        return {
          valid: false,
          error: `Invalid range "${part}": start episode (${start}) cannot be greater than end episode (${end}).`,
          count: 0,
          normalized: ''
        };
      }
      totalCount += (end - start + 1);
      normalizedParts.push(`${start}-${end}`);
      continue;
    }

    // Match single episode number
    const singleMatch = part.match(/^(\d+)$/);
    if (singleMatch) {
      const num = parseInt(singleMatch[1], 10);
      totalCount += 1;
      normalizedParts.push(String(num));
      continue;
    }

    // Malformed token
    return {
      valid: false,
      error: `Invalid episode entry "${part}". Expected numbers or ranges (e.g. "1-24, 50") separated by commas.`,
      count: 0,
      normalized: ''
    };
  }

  return {
    valid: true,
    count: totalCount,
    normalized: normalizedParts.join(', ')
  };
}
