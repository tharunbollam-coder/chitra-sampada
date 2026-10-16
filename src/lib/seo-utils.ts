// src/lib/seo-utils.ts
/**
 * SEO metadata formatting utilities and helpers for Chitra Sampada.
 * Generates human-readable, snippet-optimized titles and descriptions (140-160 chars)
 * without raw data dumps, concatenated arrays, or boilerplate brand suffixes.
 */

/**
 * Strip markdown syntax, HTML tags, and excessive punctuation to produce clean plain text.
 */
export function cleanPlainText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  return text
    // Strip markdown images and links
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Strip HTML tags
    .replace(/<[^>]+>/g, '')
    // Strip headers, blockquotes, code blocks, lists
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[\*\-+]\s+/gm, '')
    // Strip bold/italic formatting
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // Normalize quotation marks
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Collapse whitespace and newlines
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Truncate text cleanly at word boundaries, ensuring it fits within maximum character length.
 */
export function truncateDescription(text: string | null | undefined, maxLen = 160, minLen = 120): string {
  const cleaned = cleanPlainText(text);
  if (!cleaned) return '';
  if (cleaned.length <= maxLen) return cleaned;

  // Find the last word boundary before maxLen
  const truncated = cleaned.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  const safeEnd = lastSpace >= minLen ? lastSpace : maxLen - 3;
  
  const result = cleaned.slice(0, safeEnd).replace(/[,;:\-\s]+$/, '');
  return `${result}...`;
}

/**
 * Strip leading labels from notes (e.g. "100% Canon —", "Canon Status —").
 */
export function cleanNoteLeadingLabels(note: string | null | undefined): string {
  if (!note || typeof note !== 'string') return '';
  return cleanPlainText(note).replace(/^[\w\s%]+[—–-]\s*/, '').trim();
}

/**
 * Accumulate clean full sentences within a maximum character limit.
 */
export function cutAtSentenceBoundary(text: string | null | undefined, maxLen = 155): string {
  const cleaned = cleanPlainText(text);
  if (!cleaned) return '';
  if (cleaned.length <= maxLen) return cleaned;

  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];
  let result = '';
  for (const s of sentences) {
    const candidate = result ? `${result} ${s.trim()}` : s.trim();
    if (candidate.length <= maxLen) {
      result = candidate;
    } else {
      break;
    }
  }

  if (result.length >= 60) return result;
  return truncateDescription(cleaned, maxLen);
}

/**
 * Generate a data-based lead sentence for the Watch Order tab and descriptions.
 * e.g. "Naruto Shippuden is entry 2 of 4 in the Naruto watch order: Naruto, Naruto Shippuden, The Last: Naruto the Movie, and Boruto: Naruto Next Generations."
 */
export function getWatchOrderLeadSentence(
  animeTitle: string,
  franchiseName: string | null | undefined,
  watchOrder: Array<any>,
  currentAnimeIdOrSlug?: string | null
): string {
  if (!Array.isArray(watchOrder) || watchOrder.length === 0) return '';
  const total = watchOrder.length;
  const fName = franchiseName || animeTitle;

  let currentIndex = watchOrder.findIndex((s) => s.isCurrent);
  if (currentIndex === -1 && currentAnimeIdOrSlug) {
    currentIndex = watchOrder.findIndex(
      (s) => s.animeId === currentAnimeIdOrSlug || s.slug === currentAnimeIdOrSlug
    );
  }
  const position = currentIndex >= 0 ? currentIndex + 1 : null;

  let titlesText = '';
  if (total <= 6) {
    if (total === 1) {
      titlesText = watchOrder[0].title;
    } else if (total === 2) {
      titlesText = `${watchOrder[0].title} and ${watchOrder[1].title}`;
    } else {
      const allExceptLast = watchOrder.slice(0, -1).map((s) => s.title).join(', ');
      titlesText = `${allExceptLast}, and ${watchOrder[total - 1].title}`;
    }
  } else {
    const firstFew = watchOrder.slice(0, 4).map((s) => s.title).join(', ');
    const remaining = total - 4;
    titlesText = `${firstFew}, and ${remaining} more entries`;
  }

  if (position !== null) {
    return `${animeTitle} is entry ${position} of ${total} in the ${fName} watch order: ${titlesText}.`;
  }
  return `Follow the ${fName} watch order across ${total} sequential entries: ${titlesText}.`;
}

/**
 * Build page-specific SEO metadata for anime detail pages and their sub-tabs.
 */
export function buildAnimeTabMetadata(
  anime: any,
  tab: string | undefined,
  siteOrigin: string
): { pageTitle: string; pageDescription: string; canonicalUrl: string } {
  const title = anime?.title || 'Anime';
  const cleanTab = (tab || '').trim().toLowerCase();
  const year = anime?.year ? ` (${anime.year})` : '';

  let pageTitle: string;
  let pageDescription: string;
  let canonicalUrl: string;

  if (!cleanTab) {
    // 1. Main Anime Overview (/anime/[slug])
    pageTitle = `${title}: Anime Guide & Watch Overview`;
    
    if (anime?.synopsis) {
      const cleanSyn = cleanPlainText(anime.synopsis);
      if (cleanSyn.length >= 100) {
        pageDescription = truncateDescription(cleanSyn, 155);
      } else {
        pageDescription = truncateDescription(
          `${cleanSyn} Explore watch orders, filler guides, characters, and reviews for ${title}.`,
          155
        );
      }
    } else {
      pageDescription = `Guide for ${title}${year}. Explore curated chronological watch orders, filler episode breakdowns, character profiles, and honest reviews.`;
    }
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}`;

  } else if (cleanTab === 'filler-list' || cleanTab === 'filler') {
    // 2. Filler List & Canon Guide (/anime/[slug]/filler-list)
    pageTitle = `${title} Filler List and Canon Episode Guide`;
    
    const isMovie = anime?.type === 'movie';
    const isZeroFiller = anime?.hasFillerData && anime?.fillerPercentage === 0;

    if (isMovie) {
      const candidate = `Discover the canon status and timeline placement for ${title}, with official continuity details and storyline viewing guidance.`;
      pageDescription = candidate.length <= 155 ? candidate : truncateDescription(candidate, 155);
    } else if (anime?.hasFillerData && typeof anime?.fillerPercentage === 'number' && anime.fillerPercentage > 0) {
      const fl = anime.fillerList;
      const fillerCount = fl?.fillerEpisodes ?? Math.round(((anime.fillerPercentage || 0) / 100) * (anime.episodes || 0));
      const fillerPct = anime.fillerPercentage;
      const mixedCount = fl?.mixedEpisodes || 0;
      const mangaCanonCount = fl?.mangaCanonEpisodes || 0;

      if (mixedCount > 0 && mangaCanonCount > 0) {
        const candidate = `${title} filler list and canon guide. Track ${mangaCanonCount} manga canon, ${mixedCount} mixed, and ${fillerCount} filler episodes (${fillerPct}% filler) in story order.`;
        if (candidate.length <= 155) {
          pageDescription = candidate;
        } else {
          const fallback = `${title} filler list and canon guide. Track canon, ${mixedCount} mixed, and ${fillerCount} filler episodes (${fillerPct}% filler) in story order.`;
          pageDescription = fallback.length <= 155 ? fallback : truncateDescription(candidate, 155);
        }
      } else {
        const candidate = `${title} filler list and canon guide. Skip ${fillerCount} filler episode${fillerCount === 1 ? '' : 's'} (${fillerPct}% of the series) and stream the main storyline in order.`;
        pageDescription = candidate.length <= 155 ? candidate : truncateDescription(candidate, 155);
      }
    } else if (anime?.fillerNote) {
      const cleaned = cleanNoteLeadingLabels(anime.fillerNote);
      const candidate = `${title} canon and filler guide. ${cleaned}`;
      pageDescription = cutAtSentenceBoundary(candidate, 155);
    } else if (isZeroFiller) {
      const candidate = `${title} episode guide. With 0% filler content, stream every verified canon episode in chronological order.`;
      pageDescription = candidate.length <= 155 ? candidate : truncateDescription(candidate, 155);
    } else {
      pageDescription = `Filler episode guide and canon breakdown for ${title}. Identify skippable episodes and watch the main storyline in order.`;
    }
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/filler-list`;

  } else if (cleanTab === 'watch-order') {
    // 3. Watch Order (/anime/[slug]/watch-order)
    pageTitle = `${title} Watch Order: How to Watch in Order`;

    const watchOrder = Array.isArray(anime?.watchOrder) ? anime.watchOrder : [];
    const watchOrderNote = anime?.watchOrderNote || null;
    const fName = anime?.franchiseName || title;

    if (watchOrder.length > 0) {
      const total = watchOrder.length;
      let currentIndex = watchOrder.findIndex((s: any) => s.isCurrent);
      if (currentIndex === -1 && anime?.franchiseStepOrder) {
        currentIndex = watchOrder.findIndex((s: any) => s.order === anime.franchiseStepOrder);
      }
      const position = currentIndex >= 0 ? currentIndex + 1 : 1;

      const candidate = `${title} is entry ${position} of ${total} in the ${fName} watch order. Follow the recommended sequence to watch the storyline in chronological order.`;
      pageDescription = candidate.length <= 155 ? candidate : truncateDescription(candidate, 155);
    } else if (watchOrderNote) {
      const cleaned = cleanPlainText(watchOrderNote);
      const match = cleaned.match(/^([^.!?]+[.!?])/);
      const firstSentence = match ? match[1].trim() : cleaned;

      if (firstSentence.toLowerCase().includes(title.toLowerCase())) {
        pageDescription = cutAtSentenceBoundary(firstSentence, 155);
      } else {
        const candidate = `${title} watch order guide. ${firstSentence}`;
        pageDescription = candidate.length <= 155 ? candidate : cutAtSentenceBoundary(candidate, 155);
      }
    } else {
      pageDescription = `Watch order and viewing sequence guide for ${title}. Follow the storyline in recommended chronological order.`;
    }
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/watch-order`;

  } else if (cleanTab === 'characters') {
    // 4. Characters (/anime/[slug]/characters)
    pageTitle = `${title} Characters: Cast & Profiles Guide`;
    
    const charNames = Array.isArray(anime?.characters)
      ? anime.characters.slice(0, 3).map((c: any) => c.name).filter(Boolean)
      : [];

    if (charNames.length > 0) {
      pageDescription = truncateDescription(
        `Meet the main characters and cast of ${title}, including ${charNames.join(', ')}, with detailed character roles, ranks, and background highlights.`,
        155
      );
    } else {
      pageDescription = `Meet the character cast of ${title}, exploring key character profiles, affiliations, motivations, and narrative highlights.`;
    }
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/characters`;

  } else if (cleanTab === 'review') {
    // 5. Personal Take / Review (/anime/[slug]/review)
    pageTitle = `${title} Review: Honest Rating & In-Depth Breakdown`;
    
    if (anime?.honestyStatus === 'watched' && anime?.personalRating !== undefined && anime.personalRating !== null) {
      pageDescription = truncateDescription(
        `Honest editorial review and ${anime.personalRating}/10 rating for ${title}. In-depth commentary on story pacing, animation quality, and character arcs.`,
        155
      );
    } else {
      pageDescription = truncateDescription(
        `Read an honest editorial review and breakdown of ${title}, examining story quality, thematic depth, and viewer recommendations.`,
        155
      );
    }
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/review`;

  } else if (cleanTab === 'source') {
    // 6. Source Material (/anime/[slug]/source)
    pageTitle = `${title} Manga & Source Guide: Where to Start Reading`;
    pageDescription = truncateDescription(
      `Discover the original source material for ${title}. Find manga chapter adaptation coverage, volume milestones, and where to pick up after the anime.`,
      155
    );
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/source`;

  } else if (cleanTab === 'power-system') {
    // 7. Power System & Combat Lore (/anime/[slug]/power-system)
    pageTitle = `${title} Power System Explained: Combat Lore & Mechanics`;
    pageDescription = truncateDescription(
      `In-depth breakdown of the power system and combat mechanics in ${title}, explaining abilities, limitations, and worldbuilding rules.`,
      155
    );
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/power-system`;

  } else if (cleanTab === 'lessons') {
    // 8. What I Learned / Themes (/anime/[slug]/lessons)
    pageTitle = `${title} Themes & Lessons: Philosophical Reflections`;
    
    const takeaway = anime?.lesson_takeaway || anime?.what_i_learned_paragraphs;
    if (takeaway) {
      const cleanT = cleanPlainText(takeaway);
      pageDescription = truncateDescription(
        `${cleanT} Key themes and philosophical reflections explored in ${title}.`,
        155
      );
    } else {
      pageDescription = truncateDescription(
        `Explore meaningful life lessons, philosophical themes, and emotional takeaways drawn from the story, character journeys, and ending of ${title}.`,
        155
      );
    }
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/lessons`;

  } else if (cleanTab === 'universe') {
    // 9. Franchise Universe & Directory (/anime/[slug]/universe)
    pageTitle = `${title} Franchise Universe & Media Directory`;
    pageDescription = truncateDescription(
      `Explore the franchise universe for ${title}. Navigate official canon storylines, spin-offs, feature films, and related multimedia entries.`,
      155
    );
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/universe`;

  } else if (cleanTab === 'recommendations') {
    // 10. Recommendations (/anime/[slug]/recommendations)
    pageTitle = `Anime Like ${title}: Curated Recommendations to Watch`;
    pageDescription = truncateDescription(
      `Discover curated anime recommendations similar to ${title}. Hand-picked series sharing comparable themes, storytelling styles, and character dynamics.`,
      155
    );
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/recommendations`;

  } else {
    // Generic Tab Fallback
    const label = cleanTab.charAt(0).toUpperCase() + cleanTab.slice(1);
    pageTitle = `${title}: ${label} Guide`;
    pageDescription = truncateDescription(
      `Viewer guide and reference details for ${title}. Researched episode context, honest notes, and essential information.`,
      155
    );
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/${cleanTab}`;
  }

  return { pageTitle, pageDescription, canonicalUrl };
}

/**
 * Build SEO metadata for curated Vibe/Tag pages.
 */
export function buildVibeMetadata(vibe: any): { pageTitle: string; pageDescription: string } {
  const name = vibe?.name || 'Anime';
  const pageTitle = `${name} Anime: Curated Watch Guides & Recommendations`;
  
  let pageDescription: string;
  if (vibe?.metaDescription && cleanPlainText(vibe.metaDescription).length >= 50) {
    pageDescription = truncateDescription(vibe.metaDescription, 160);
  } else if (vibe?.seoIntro && cleanPlainText(vibe.seoIntro).length >= 50) {
    pageDescription = truncateDescription(vibe.seoIntro, 160);
  } else if (vibe?.tagline && cleanPlainText(vibe.tagline).length >= 15) {
    pageDescription = truncateDescription(
      `${cleanPlainText(vibe.tagline)} Browse curated watch orders, filler lists, and honest recommendations for ${name.toLowerCase()} anime.`,
      160
    );
  } else {
    pageDescription = `Discover top-rated ${name.toLowerCase()} anime with curated chronological watch orders, canon episode guides, and honest recommendations on what to watch next.`;
  }

  return { pageTitle, pageDescription };
}

/**
 * Build clean SEO metadata for Blog Posts.
 */
export function buildBlogPostMetadata(post: any): { pageTitle: string; pageDescription: string } {
  const title = post?.title || 'Article';
  const pageTitle = title;

  let pageDescription: string;
  if (post?.excerpt && cleanPlainText(post.excerpt).length >= 40) {
    pageDescription = truncateDescription(post.excerpt, 160);
  } else if (post?.content) {
    pageDescription = truncateDescription(post.content, 160);
  } else {
    pageDescription = truncateDescription(
      `Read ${title} on Chitra Sampada. In-depth anime commentary, chronological watch order guides, and transparent viewer insights.`,
      160
    );
  }

  return { pageTitle, pageDescription };
}
