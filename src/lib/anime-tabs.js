export const ANIME_TABS = /** @type {const} */ ({
  review: { label: 'My Take', visibility: 'review' },
  lessons: { label: 'What I Learned', visibility: 'lessons' },
  'watch-order': { label: 'Watch Order', visibility: 'watchOrder' },
  'filler-list': { label: 'Filler List', visibility: 'fillerList' },
  characters: { label: 'Characters', visibility: 'characters' },
  source: { label: 'Manga & Light Novel', visibility: 'source' },
  'power-system': { label: 'Power System', visibility: 'powerSystem' },
  universe: { label: 'Related & Universe', visibility: 'universe' },
  recommendations: { label: 'Shows Like This', visibility: 'recommendations' }
});

/** @typedef {keyof typeof ANIME_TABS} AnimeTabKey */

export const DEFAULT_ANIME_TAB_VISIBILITY = Object.freeze(
  Object.fromEntries(Object.values(ANIME_TABS).map(({ visibility }) => [visibility, true]))
);

/** @param {string | null | undefined} stored */
export function parseAnimeSectionVisibility(stored) {
  const defaults = { ...DEFAULT_ANIME_TAB_VISIBILITY, streaming: true };
  if (!stored) return defaults;
  try {
    return { ...defaults, ...JSON.parse(stored) };
  } catch {
    return defaults;
  }
}

/**
 * @typedef {{ key: AnimeTabKey, label: string, count?: number }} AnimeTab
 */

/**
 * Helper function to retrieve all available section tabs for an anime object.
 * Returns only tabs that have actual data AND have their Admin visibility toggle set to "Show".
 * "My Take" ('review') is placed in the FIRST position when present.
 */
export function getAvailableTabs(anime) {
  if (!anime) return [];
  /** @type {AnimeTab[]} */
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

  if (hasReviewContent && vis[ANIME_TABS['review'].visibility] !== false) {
    const reviewTabLabel = anime.review?.type === 'quick' ? 'Quick Take' : ANIME_TABS.review.label;
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
  if (hasLessonsContent && vis[ANIME_TABS['lessons'].visibility] !== false) {
    tabs.push({ key: 'lessons', label: ANIME_TABS.lessons.label });
  }

  // 3. Watch Order
  const hasFranchiseNote = Boolean(anime.franchiseWatchOrderNote && anime.franchiseWatchOrderNote.trim().length > 0);
  const hasAnimeNote = Boolean(anime.watchOrderNote && anime.watchOrderNote.trim().length > 0);
  const franchiseAnimeCount = Array.isArray(anime.franchiseAnime) ? anime.franchiseAnime.length : 0;
  if ((hasFranchiseNote || hasAnimeNote) && vis[ANIME_TABS['watch-order'].visibility] !== false) {
    tabs.push({
      key: 'watch-order',
      label: ANIME_TABS['watch-order'].label,
      ...(hasFranchiseNote && franchiseAnimeCount > 0 ? { count: franchiseAnimeCount } : {})
    });
  }

  // 4. Filler List (Movies can show Filler tab if fillerNote exists)
  const hasFillerData = anime.type !== 'movie' && anime.fillerList && anime.fillerList.types && anime.fillerList.types.length > 0;
  const hasFillerNote = Boolean(anime.fillerNote && anime.fillerNote.trim().length > 0);
  if ((hasFillerData || hasFillerNote) && vis[ANIME_TABS['filler-list'].visibility] !== false) {
    tabs.push({ key: 'filler-list', label: ANIME_TABS['filler-list'].label });
  }

  // 4. Characters
  if (anime.characters && anime.characters.length > 0 && vis[ANIME_TABS['characters'].visibility] !== false) {
    tabs.push({ key: 'characters', label: ANIME_TABS.characters.label, count: anime.characters.length });
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
  if (hasSourceContent && vis[ANIME_TABS['source'].visibility] !== false) {
    tabs.push({ key: 'source', label: ANIME_TABS.source.label });
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
  if (hasPowerContent && vis[ANIME_TABS['power-system'].visibility] !== false) {
    tabs.push({ key: 'power-system', label: ANIME_TABS['power-system'].label });
  }

  // 7. Related & Universe Media
  if (anime.universe && anime.universe.length > 0 && vis[ANIME_TABS['universe'].visibility] !== false) {
    tabs.push({ key: 'universe', label: ANIME_TABS.universe.label, count: anime.universe.length });
  }

  // 8. Shows Like This (Recommendations)
  if (anime.recommendations && anime.recommendations.length > 0 && vis[ANIME_TABS['recommendations'].visibility] !== false) {
    tabs.push({ key: 'recommendations', label: ANIME_TABS.recommendations.label, count: anime.recommendations.length });
  }

  return tabs;
}
