// src/lib/completeness.ts
// Centralized Anime Completeness Tracker
// Computes live completeness scores and section statuses across the admin catalog and editor.

export interface SectionStatus {
  id: string; // 'core' | 'review' | 'watchOrder' | 'fillerList' | 'characters' | 'source' | 'lessons' | 'powerSystem' | 'universe' | 'recommendations'
  label: string;
  shortLabel: string;
  isCore: boolean;
  sectionNumber: number; // 1 to 10
  editorTargetId: string; // e.g. 'section-core-container'
  status: 'done' | 'missing' | 'not_applicable' | 'optional';
  statusLabel: string; // 'Done' | 'To do' | 'N/A' | 'Added' | 'Optional'
  note?: string; // Optional note text
  reason?: string; // Short explanation for to-do or n/a
  badgeClass: string;
}

export interface AnimeCompleteness {
  coreScore: string; // "5/6"
  coreDone: number;
  coreTotal: number;
  corePercentage: number; // 0 - 100
  isComplete: boolean;
  extrasScore: string; // "1/4"
  extrasDone: number;
  extrasTotal: number; // 4
  statusColor: 'green' | 'amber' | 'red';
  sections: SectionStatus[];
  sectionsMap: Record<string, SectionStatus>;
  missingCoreSections: SectionStatus[];
  missingOptionalSections: SectionStatus[];
  missingCoreLabels: string[];
  missingOptionalLabels: string[];
}

/**
 * Creates an empty completeness object for a new anime record.
 */
export function createEmptyCompleteness(): AnimeCompleteness {
  const sections: SectionStatus[] = [
    {
      id: 'core',
      label: 'Core Information & Taxonomy',
      shortLabel: 'Core Info',
      isCore: true,
      sectionNumber: 1,
      editorTargetId: 'section-core-container',
      status: 'missing',
      statusLabel: 'To do',
      reason: 'Required core fields not yet saved',
      badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-800/60'
    },
    {
      id: 'review',
      label: 'Personal Take / Review',
      shortLabel: 'My Take',
      isCore: true,
      sectionNumber: 2,
      editorTargetId: 'section-review-container',
      status: 'missing',
      statusLabel: 'To do',
      reason: 'No review written yet',
      badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-800/60'
    },
    {
      id: 'watchOrder',
      label: 'Watch Order & Franchise Placement',
      shortLabel: 'Watch Order',
      isCore: true,
      sectionNumber: 4,
      editorTargetId: 'section-watch-order-container',
      status: 'missing',
      statusLabel: 'To do',
      reason: 'No franchise note or anime viewing guidance note',
      badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-800/60'
    },
    {
      id: 'fillerList',
      label: 'Filler & Canon Breakdown',
      shortLabel: 'Filler',
      isCore: true,
      sectionNumber: 5,
      editorTargetId: 'section-filler-container',
      status: 'missing',
      statusLabel: 'To do',
      reason: 'No episode ranges or filler note yet',
      badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-800/60'
    },
    {
      id: 'characters',
      label: 'Key Characters',
      shortLabel: 'Characters',
      isCore: true,
      sectionNumber: 6,
      editorTargetId: 'section-chars-container',
      status: 'missing',
      statusLabel: 'To do',
      reason: 'No characters added yet',
      badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-800/60'
    },
    {
      id: 'source',
      label: 'Source Material Guidance',
      shortLabel: 'Source',
      isCore: true,
      sectionNumber: 7,
      editorTargetId: 'section-source-container',
      status: 'missing',
      statusLabel: 'To do',
      reason: 'No source material details filled yet',
      badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-800/60'
    },
    {
      id: 'lessons',
      label: 'What I Learned (Lessons & Themes)',
      shortLabel: 'Learned',
      isCore: false,
      sectionNumber: 3,
      editorTargetId: 'section-lessons-container',
      status: 'optional',
      statusLabel: 'Optional',
      note: 'Optional: add only if something about this anime genuinely resonated',
      badgeClass: 'bg-slate-800/70 text-slate-400 border-slate-700/60'
    },
    {
      id: 'powerSystem',
      label: 'Power System & Abilities',
      shortLabel: 'Power',
      isCore: false,
      sectionNumber: 8,
      editorTargetId: 'section-power-container',
      status: 'optional',
      statusLabel: 'Optional',
      note: 'Optional: add if this anime has a power or ability system',
      badgeClass: 'bg-slate-800/70 text-slate-400 border-slate-700/60'
    },
    {
      id: 'universe',
      label: 'Related & Universe Media',
      shortLabel: 'Related',
      isCore: false,
      sectionNumber: 9,
      editorTargetId: 'section-universe-container',
      status: 'optional',
      statusLabel: 'Optional',
      note: 'Optional: add if this anime has related films or spin-offs',
      badgeClass: 'bg-slate-800/70 text-slate-400 border-slate-700/60'
    },
    {
      id: 'recommendations',
      label: 'Shows Like This (Recommendations)',
      shortLabel: 'Suggestions',
      isCore: false,
      sectionNumber: 10,
      editorTargetId: 'section-recs-container',
      status: 'optional',
      statusLabel: 'Optional',
      note: 'Optional: add if you have suggestions',
      badgeClass: 'bg-slate-800/70 text-slate-400 border-slate-700/60'
    }
  ];

  const sectionsMap: Record<string, SectionStatus> = {};
  for (const s of sections) sectionsMap[s.id] = s;

  return {
    coreScore: '0/6',
    coreDone: 0,
    coreTotal: 6,
    corePercentage: 0,
    isComplete: false,
    extrasScore: '0/4',
    extrasDone: 0,
    extrasTotal: 4,
    statusColor: 'red',
    sections,
    sectionsMap,
    missingCoreSections: sections.filter(s => s.isCore),
    missingOptionalSections: sections.filter(s => !s.isCore),
    missingCoreLabels: sections.filter(s => s.isCore).map(s => s.shortLabel),
    missingOptionalLabels: sections.filter(s => !s.isCore).map(s => s.shortLabel)
  };
}

/**
 * Single shared helper that evaluates the completeness of every section
 * (core and optional) for any anime record.
 * Mirrors the exact public site display criteria while ignoring public show/hide toggles.
 */
export function getAnimeCompleteness(anime: any): AnimeCompleteness {
  if (!anime || (!anime.id && !anime.title && !anime.slug)) {
    return createEmptyCompleteness();
  }

  // =========================================================================
  // CORE SECTION 1: Core Information
  // Required: title, slug, year, format, total episodes, synopsis, poster, at least one genre, age rating, air status set
  // =========================================================================
  const hasTitle = Boolean(anime.title && String(anime.title).trim().length > 0);
  const hasSlug = Boolean(anime.slug && String(anime.slug).trim().length > 0);
  const hasYear = Boolean(anime.year !== null && anime.year !== undefined && anime.year !== '' && !isNaN(Number(anime.year)) && Number(anime.year) > 0);
  const hasFormat = Boolean(anime.type && String(anime.type).trim().length > 0);
  const hasEpisodes = Boolean(anime.episodes !== null && anime.episodes !== undefined && anime.episodes !== '' && !isNaN(Number(anime.episodes)) && Number(anime.episodes) > 0);
  const hasSynopsis = Boolean(anime.synopsis && String(anime.synopsis).trim().length > 0);
  const hasPoster = Boolean(anime.poster && String(anime.poster).trim().length > 0);
  const hasGenre = Boolean(
    Array.isArray(anime.genres)
      ? anime.genres.length > 0
      : (typeof anime.genres === 'string' && anime.genres.trim().length > 0)
  );
  const hasAgeRating = Boolean(
    anime.ageRating !== null &&
    anime.ageRating !== undefined &&
    anime.ageRating !== '' &&
    !isNaN(Number(anime.ageRating))
  );
  const rawStatus = (anime.status || '').trim();
  const hasAirStatus = Boolean(rawStatus.length > 0 && rawStatus !== 'Not Specified');

  const coreMissingFields: string[] = [];
  if (!hasTitle) coreMissingFields.push('Title');
  if (!hasSlug) coreMissingFields.push('Slug');
  if (!hasYear) coreMissingFields.push('Year');
  if (!hasFormat) coreMissingFields.push('Format');
  if (!hasEpisodes) coreMissingFields.push('Episodes');
  if (!hasSynopsis) coreMissingFields.push('Synopsis');
  if (!hasPoster) coreMissingFields.push('Poster');
  if (!hasGenre) coreMissingFields.push('Genre');
  if (!hasAgeRating) coreMissingFields.push('Age rating');
  if (!hasAirStatus) coreMissingFields.push('Air status');

  const isCoreDone = coreMissingFields.length === 0;
  const coreStatus: SectionStatus = {
    id: 'core',
    label: 'Core Information & Taxonomy',
    shortLabel: 'Core Info',
    isCore: true,
    sectionNumber: 1,
    editorTargetId: 'section-core-container',
    status: isCoreDone ? 'done' : 'missing',
    statusLabel: isCoreDone ? 'Done' : 'To do',
    reason: isCoreDone ? undefined : `Missing: ${coreMissingFields.join(', ')}`,
    badgeClass: isCoreDone
      ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60'
      : 'bg-amber-950/70 text-amber-300 border-amber-800/60'
  };

  // =========================================================================
  // CORE SECTION 2: Personal Take (My Take)
  // Applies ONLY when honesty status is 'watched'. Not applicable otherwise.
  // Done when review paragraphs or text is written.
  // =========================================================================
  const honesty = (anime.honestyStatus || anime.honesty_status || '').trim().toLowerCase();
  const isWatched = honesty === 'watched';
  let reviewStatus: SectionStatus;

  if (!isWatched) {
    reviewStatus = {
      id: 'review',
      label: 'Personal Take / Review',
      shortLabel: 'My Take',
      isCore: true,
      sectionNumber: 2,
      editorTargetId: 'section-review-container',
      status: 'not_applicable',
      statusLabel: 'N/A',
      reason: `Only applies to Watched anime (currently "${honesty || 'unwatched'}")`,
      badgeClass: 'bg-slate-800/70 text-slate-400 border-slate-700/60'
    };
  } else {
    const reviewText = (
      anime.review?.paragraphs ||
      anime.review_paragraphs ||
      anime.review?.text ||
      anime.review?.heading ||
      ''
    ).trim();
    const isReviewDone = reviewText.length > 0;
    reviewStatus = {
      id: 'review',
      label: 'Personal Take / Review',
      shortLabel: 'My Take',
      isCore: true,
      sectionNumber: 2,
      editorTargetId: 'section-review-container',
      status: isReviewDone ? 'done' : 'missing',
      statusLabel: isReviewDone ? 'Done' : 'To do',
      reason: isReviewDone ? undefined : 'No review text written yet',
      badgeClass: isReviewDone
        ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60'
        : 'bg-amber-950/70 text-amber-300 border-amber-800/60'
    };
  }

  // =========================================================================
  // CORE SECTION 3: Watch Order
  // Done when the anime has a franchise Watch Order Note or its own Watch Order Note.
  // =========================================================================
  const franchiseNote = (anime.franchiseWatchOrderNote || '').trim();
  const animeNote = (anime.watchOrderNote || '').trim();
  const hasWatchOrderContent = franchiseNote.length > 0 || animeNote.length > 0;
  const watchOrderStatus: SectionStatus = {
    id: 'watchOrder',
    label: 'Watch Order & Franchise Placement',
    shortLabel: 'Watch Order',
    isCore: true,
    sectionNumber: 4,
    editorTargetId: 'section-watch-order-container',
    status: hasWatchOrderContent ? 'done' : 'missing',
    statusLabel: hasWatchOrderContent ? 'Done' : 'To do',
    reason: hasWatchOrderContent ? undefined : 'No franchise note or anime viewing guidance note',
    badgeClass: hasWatchOrderContent
      ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60'
      : 'bg-amber-950/70 text-amber-300 border-amber-800/60'
  };

  // =========================================================================
  // CORE SECTION 4: Filler & Canon
  // Not applicable for movies. For series: done when episode ranges or filler note exist.
  // =========================================================================
  const isMovie = (anime.type || '').trim().toLowerCase() === 'movie';
  let fillerStatus: SectionStatus;

  if (isMovie) {
    fillerStatus = {
      id: 'fillerList',
      label: 'Filler & Canon Breakdown',
      shortLabel: 'Filler',
      isCore: true,
      sectionNumber: 5,
      editorTargetId: 'section-filler-container',
      status: 'not_applicable',
      statusLabel: 'N/A',
      reason: 'Not applicable for movies',
      badgeClass: 'bg-slate-800/70 text-slate-400 border-slate-700/60'
    };
  } else {
    const hasRanges = Boolean(
      (anime.fillerList?.types && anime.fillerList.types.some((t: any) => t.episodes && String(t.episodes).trim().length > 0)) ||
      (Array.isArray(anime.fillerRows) && anime.fillerRows.some((r: any) => (r.episodes || r.range || '').trim().length > 0)) ||
      (anime.fillerBreakdown && Object.values(anime.fillerBreakdown).some((v: any) => typeof v === 'string' && v.trim().length > 0))
    );
    const hasFillerNote = Boolean(anime.fillerNote && String(anime.fillerNote).trim().length > 0);
    const isFillerDone = hasRanges || hasFillerNote;
    fillerStatus = {
      id: 'fillerList',
      label: 'Filler & Canon Breakdown',
      shortLabel: 'Filler',
      isCore: true,
      sectionNumber: 5,
      editorTargetId: 'section-filler-container',
      status: isFillerDone ? 'done' : 'missing',
      statusLabel: isFillerDone ? 'Done' : 'To do',
      reason: isFillerDone ? undefined : 'No episode ranges or filler note yet',
      badgeClass: isFillerDone
        ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60'
        : 'bg-amber-950/70 text-amber-300 border-amber-800/60'
    };
  }

  // =========================================================================
  // CORE SECTION 5: Key Characters
  // Done when at least one character exists.
  // =========================================================================
  const charCount = Array.isArray(anime.characters) ? anime.characters.length : 0;
  const isCharsDone = charCount > 0;
  const charsStatus: SectionStatus = {
    id: 'characters',
    label: 'Key Characters',
    shortLabel: 'Characters',
    isCore: true,
    sectionNumber: 6,
    editorTargetId: 'section-chars-container',
    status: isCharsDone ? 'done' : 'missing',
    statusLabel: isCharsDone ? 'Done' : 'To do',
    reason: isCharsDone ? undefined : 'No characters added yet',
    badgeClass: isCharsDone
      ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60'
      : 'bg-amber-950/70 text-amber-300 border-amber-800/60'
  };

  // =========================================================================
  // CORE SECTION 6: Source Material
  // Not applicable when source type is 'Original' or 'Anime Original'.
  // Done when source details (title, coverage, volumes, notes, or author) are filled.
  // =========================================================================
  const rawSourceType = (anime.source?.type || anime.source_type || '').trim().toLowerCase();
  const isOriginal = rawSourceType === 'original' || rawSourceType === 'anime original';
  let sourceStatus: SectionStatus;

  if (isOriginal) {
    sourceStatus = {
      id: 'source',
      label: 'Source Material Guidance',
      shortLabel: 'Source',
      isCore: true,
      sectionNumber: 7,
      editorTargetId: 'section-source-container',
      status: 'not_applicable',
      statusLabel: 'N/A',
      reason: 'Anime original (no source material adaptation)',
      badgeClass: 'bg-slate-800/70 text-slate-400 border-slate-700/60'
    };
  } else {
    const srcTitle = (anime.source?.title || anime.source_title || '').trim();
    const srcCoverage = (anime.source?.coverage || anime.source_coverage || '').trim();
    const srcVolumes = (anime.source?.volumes || anime.source_volumes || '').trim();
    const srcNotes = (anime.source?.notes || anime.source_notes || '').trim();
    const srcAuthor = (anime.source?.author || anime.source_author || '').trim();
    const hasSourceDetails = Boolean(srcTitle || srcCoverage || srcVolumes || srcNotes || srcAuthor);
    sourceStatus = {
      id: 'source',
      label: 'Source Material Guidance',
      shortLabel: 'Source',
      isCore: true,
      sectionNumber: 7,
      editorTargetId: 'section-source-container',
      status: hasSourceDetails ? 'done' : 'missing',
      statusLabel: hasSourceDetails ? 'Done' : 'To do',
      reason: hasSourceDetails ? undefined : 'No source material details filled yet',
      badgeClass: hasSourceDetails
        ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60'
        : 'bg-amber-950/70 text-amber-300 border-amber-800/60'
    };
  }

  // =========================================================================
  // OPTIONAL SECTION 7: What I Learned
  // =========================================================================
  const rawLesson = (
    typeof anime.lessons === 'string'
      ? anime.lessons
      : (anime.lessons?.takeaway || anime.lessons?.paragraphs || anime.lesson_takeaway || anime.what_i_learned_paragraphs || '')
  ).trim();
  const hasLessonsContent = isWatched && rawLesson.length > 0;
  const lessonsStatus: SectionStatus = {
    id: 'lessons',
    label: 'What I Learned (Lessons & Themes)',
    shortLabel: 'Learned',
    isCore: false,
    sectionNumber: 3,
    editorTargetId: 'section-lessons-container',
    status: hasLessonsContent ? 'done' : 'optional',
    statusLabel: hasLessonsContent ? 'Added' : 'Optional',
    note: 'Optional: add only if something about this anime genuinely resonated',
    badgeClass: hasLessonsContent
      ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60'
      : 'bg-slate-800/70 text-slate-400 border-slate-700/60'
  };

  // =========================================================================
  // OPTIONAL SECTION 8: Power System
  // =========================================================================
  const powerName = (anime.powerSystem?.name || anime.power_system_name || '').trim();
  const powerText = (
    typeof anime.powerSystem?.paragraphs === 'string'
      ? anime.powerSystem.paragraphs
      : (typeof anime.power_system_paragraphs === 'string'
          ? anime.power_system_paragraphs
          : (anime.powerSystem?.text || ''))
  ).trim();
  const hasPowerContent = powerName.length > 0 || powerText.length > 0;
  const powerStatus: SectionStatus = {
    id: 'powerSystem',
    label: 'Power System & Abilities',
    shortLabel: 'Power',
    isCore: false,
    sectionNumber: 8,
    editorTargetId: 'section-power-container',
    status: hasPowerContent ? 'done' : 'optional',
    statusLabel: hasPowerContent ? 'Added' : 'Optional',
    note: 'Optional: add if this anime has a power or ability system',
    badgeClass: hasPowerContent
      ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60'
      : 'bg-slate-800/70 text-slate-400 border-slate-700/60'
  };

  // =========================================================================
  // OPTIONAL SECTION 9: Related & Universe Media
  // =========================================================================
  const universeCount = Array.isArray(anime.universe)
    ? anime.universe.length
    : (Array.isArray(anime.relatedMedia) ? anime.relatedMedia.length : 0);
  const hasUniverse = universeCount > 0;
  const universeStatus: SectionStatus = {
    id: 'universe',
    label: 'Related & Universe Media',
    shortLabel: 'Related',
    isCore: false,
    sectionNumber: 9,
    editorTargetId: 'section-universe-container',
    status: hasUniverse ? 'done' : 'optional',
    statusLabel: hasUniverse ? 'Added' : 'Optional',
    note: 'Optional: add if this anime has related films or spin-offs',
    badgeClass: hasUniverse
      ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60'
      : 'bg-slate-800/70 text-slate-400 border-slate-700/60'
  };

  // =========================================================================
  // OPTIONAL SECTION 10: Shows Like This (Recommendations)
  // =========================================================================
  const recsCount = Array.isArray(anime.recommendations) ? anime.recommendations.length : 0;
  const hasRecs = recsCount > 0;
  const recsStatus: SectionStatus = {
    id: 'recommendations',
    label: 'Shows Like This (Recommendations)',
    shortLabel: 'Suggestions',
    isCore: false,
    sectionNumber: 10,
    editorTargetId: 'section-recs-container',
    status: hasRecs ? 'done' : 'optional',
    statusLabel: hasRecs ? 'Added' : 'Optional',
    note: 'Optional: add if you have suggestions',
    badgeClass: hasRecs
      ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60'
      : 'bg-slate-800/70 text-slate-400 border-slate-700/60'
  };

  const sections: SectionStatus[] = [
    coreStatus,
    reviewStatus,
    watchOrderStatus,
    fillerStatus,
    charsStatus,
    sourceStatus,
    lessonsStatus,
    powerStatus,
    universeStatus,
    recsStatus
  ];

  const sectionsMap: Record<string, SectionStatus> = {};
  for (const s of sections) {
    sectionsMap[s.id] = s;
  }

  const applicableCore = sections.filter(s => s.isCore && s.status !== 'not_applicable');
  const coreDone = applicableCore.filter(s => s.status === 'done').length;
  const coreTotal = applicableCore.length;
  const corePercentage = coreTotal > 0 ? Math.round((coreDone / coreTotal) * 100) : 100;
  const isComplete = coreDone === coreTotal;

  const optionalList = sections.filter(s => !s.isCore);
  const extrasDone = optionalList.filter(s => s.status === 'done').length;
  const extrasTotal = optionalList.length;

  const missingCoreSections = applicableCore.filter(s => s.status === 'missing');
  const missingOptionalSections = optionalList.filter(s => s.status === 'optional');

  const statusColor: 'green' | 'amber' | 'red' = isComplete
    ? 'green'
    : (corePercentage >= 50 ? 'amber' : 'red');

  return {
    coreScore: `${coreDone}/${coreTotal}`,
    coreDone,
    coreTotal,
    corePercentage,
    isComplete,
    extrasScore: `${extrasDone}/${extrasTotal}`,
    extrasDone,
    extrasTotal,
    statusColor,
    sections,
    sectionsMap,
    missingCoreSections,
    missingOptionalSections,
    missingCoreLabels: missingCoreSections.map(s => s.shortLabel),
    missingOptionalLabels: missingOptionalSections.map(s => s.shortLabel)
  };
}
