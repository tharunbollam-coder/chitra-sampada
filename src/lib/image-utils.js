/**
 * Helper utility for optimizing TMDB and remote poster URLs.
 * Ensures TMDB URLs request appropriate thumbnail dimensions (e.g. w342, w500)
 * rather than original or oversized images.
 */

/**
 * @param {string | null | undefined} url
 * @param {'w185' | 'w342' | 'w500' | 'w780'} [size='w342']
 * @returns {string}
 */
export function optimizeTmdbPoster(url, size = 'w342') {
  if (!url || typeof url !== 'string') return '';
  // Matches both media.themoviedb.org and image.tmdb.org
  // Replaces the path dimension (e.g. /w780/, /original/, /w440_and_h660_face/) with the target size
  return url.replace(/((?:themoviedb|tmdb)\.org\/t\/p\/)[^/]+/i, `$1${size}`);
}
