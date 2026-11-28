export const CATALOG_FILTERS = ['watched', 'watchlist', 'reference', 'zero', 'community'];
export const CATALOG_FORMATS = ['series', 'movie'];
export const CATALOG_SORTS = ['default', 'rating-desc', 'rating-asc', 'episodes-desc', 'episodes-asc'];
export const CATALOG_QUERY_PARAMETERS = ['filter', 'format', 'vibe', 'sort', 'q', 'page'];

export function hasCatalogFilters(params) {
  const sort = params.get('sort');
  return Boolean(
    CATALOG_FILTERS.includes(params.get('filter')) ||
    CATALOG_FORMATS.includes(params.get('format')) ||
    (sort !== 'default' && CATALOG_SORTS.includes(sort)) ||
    params.get('vibe') ||
    params.get('q')?.trim() ||
    parseInt(params.get('page') || '', 10) > 1
  );
}
