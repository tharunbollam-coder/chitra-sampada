/**
 * Helper utility for optimizing AniList and remote poster URLs.
 * Handles AniList cover dimensions (large, medium) and fallback remote URLs.
 */

/**
 * @param {string | null | undefined} url
 * @param {'w185' | 'w342' | 'w500' | 'w780' | 'large' | 'medium'} [size='w342']
 * @returns {string}
 */
export function optimizeAniListPoster(url, size = 'w342') {
  if (!url || typeof url !== 'string') return '';

  // AniList cover images (s4.anilist.co/file/anilistcdn/media/anime/cover/{large|medium})
  if (url.includes('anilist.co')) {
    const targetSize = (size === 'w185' || size === 'medium') ? 'medium' : 'large';
    return url.replace(/(\/media\/anime\/cover\/)(?:large|medium|small)/i, `$1${targetSize}`);
  }

  // Graceful fallback for legacy URLs
  if (url.includes('tmdb') || url.includes('themoviedb')) {
    const legacySize = (size === 'large' || size === 'w500') ? 'w500' : (size === 'w185' || size === 'medium') ? 'w185' : 'w342';
    return url.replace(/((?:themoviedb|tmdb)\.org\/t\/p\/)[^/]+/i, `$1${legacySize}`);
  }

  return url;
}

/**
 * @param {string | null | undefined} url
 * @returns {string | undefined}
 */
export function getTmdbPosterSrcSet(url) {
  const poster = typeof url === 'string' && url.match(/^(https?:)?\/\/image\.(?:tmdb|themoviedb)\.org\/t\/p\/(?:original|w\d+)\//i);
  if (!poster) return undefined;
  return [185, 342, 500].map((width) => `${url.replace(/\/t\/p\/[^/]+\//, `/t/p/w${width}/`)} ${width}w`).join(', ');
}

/**
 * @param {string | null | undefined} url
 * @param {string} origin
 * @returns {string | undefined}
 */
export function resolveHttpImageUrl(url, origin) {
  if (typeof url !== 'string' || !url.trim()) return undefined;
  const resolved = URL.parse(url, origin);
  return resolved && (resolved.protocol === 'https:' || resolved.protocol === 'http:') ? resolved.href : undefined;
}
