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
    pageTitle = `${title}: Complete Anime Guide & Watch Overview`;
    
    if (anime?.synopsis) {
      const cleanSyn = cleanPlainText(anime.synopsis);
      if (cleanSyn.length >= 100) {
        pageDescription = truncateDescription(cleanSyn, 158);
      } else {
        pageDescription = truncateDescription(
          `${cleanSyn} Explore complete watch orders, filler guides, characters, and reviews for ${title}.`,
          160
        );
      }
    } else {
      pageDescription = `Complete guide for ${title}${year}. Explore curated chronological watch orders, filler episode breakdowns, character profiles, and honest reviews.`;
    }
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}`;

  } else if (cleanTab === 'filler-list' || cleanTab === 'filler') {
    // 2. Filler List & Canon Guide (/anime/[slug]/filler-list)
    pageTitle = `${title} Filler List: Complete Filler Episode Guide`;
    
    const isMovie = anime?.type === 'movie';
    const isZeroFiller = anime?.hasFillerData && anime?.fillerPercentage === 0;

    if (isMovie) {
      pageDescription = `Discover the canon status and chronological timeline placement for ${title}, with official continuity details, storyline context, and viewing guidance.`;
    } else if (isZeroFiller) {
      pageDescription = `Explore the complete ${title} episode guide. With 0% filler content, discover all verified canon episodes to stream the storyline in order.`;
    } else if (anime?.hasFillerData && typeof anime?.fillerPercentage === 'number' && anime.fillerPercentage > 0) {
      pageDescription = `Find ${title} filler episodes in one clear guide, with episode classifications to help you distinguish filler content from the main canon storyline.`;
    } else {
      pageDescription = `Complete filler episode guide and canon breakdown for ${title}. Identify skippable episodes and watch the main storyline in order.`;
    }
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/filler-list`;

  } else if (cleanTab === 'watch-order') {
    // 3. Watch Order (/anime/[slug]/watch-order)
    pageTitle = `${title} Watch Order: Complete Chronological Guide`;
    pageDescription = `Follow the recommended chronological and release watch order for ${title}, covering TV series, movies, and OVAs in proper storyline sequence.`;
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/watch-order`;

  } else if (cleanTab === 'characters') {
    // 4. Characters (/anime/[slug]/characters)
    pageTitle = `${title} Characters: Full Cast & Profiles Guide`;
    
    const charNames = Array.isArray(anime?.characters)
      ? anime.characters.slice(0, 3).map((c: any) => c.name).filter(Boolean)
      : [];

    if (charNames.length > 0) {
      pageDescription = truncateDescription(
        `Meet the main characters and cast of ${title}, including ${charNames.join(', ')}, with detailed character roles, ranks, and background highlights.`,
        160
      );
    } else {
      pageDescription = `Meet the full character cast of ${title}, exploring key character profiles, affiliations, motivations, and narrative highlights.`;
    }
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/characters`;

  } else if (cleanTab === 'review') {
    // 5. Personal Take / Review (/anime/[slug]/review)
    pageTitle = `${title} Review: Honest Rating & In-Depth Breakdown`;
    
    if (anime?.honestyStatus === 'watched' && anime?.personalRating !== undefined && anime.personalRating !== null) {
      pageDescription = `Honest editorial review and ${anime.personalRating}/10 rating for ${title}. In-depth commentary on story pacing, animation quality, and character arcs.`;
    } else {
      pageDescription = `Read an honest editorial review and breakdown of ${title}, examining story quality, thematic depth, and viewer recommendations.`;
    }
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/review`;

  } else if (cleanTab === 'source') {
    // 6. Source Material (/anime/[slug]/source)
    pageTitle = `${title} Manga & Source Guide: Where to Start Reading`;
    pageDescription = `Discover the original source material for ${title}. Find manga chapter adaptation coverage, volume milestones, and where to pick up after the anime.`;
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/source`;

  } else if (cleanTab === 'power-system') {
    // 7. Power System & Combat Lore (/anime/[slug]/power-system)
    pageTitle = `${title} Power System Explained: Combat Lore & Mechanics`;
    pageDescription = `In-depth breakdown of the power system and combat mechanics in ${title}, explaining abilities, limitations, and worldbuilding rules.`;
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/power-system`;

  } else if (cleanTab === 'lessons') {
    // 8. What I Learned / Themes (/anime/[slug]/lessons)
    pageTitle = `${title} Themes & Lessons: Philosophical Reflections`;
    
    const takeaway = anime?.lesson_takeaway || anime?.what_i_learned_paragraphs;
    if (takeaway) {
      const cleanT = cleanPlainText(takeaway);
      pageDescription = truncateDescription(
        `${cleanT} Key themes and philosophical reflections explored in ${title}.`,
        160
      );
    } else {
      pageDescription = `Explore meaningful life lessons, philosophical themes, and emotional takeaways drawn from the story, character journeys, and ending of ${title}.`;
    }
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/lessons`;

  } else if (cleanTab === 'universe') {
    // 9. Franchise Universe & Directory (/anime/[slug]/universe)
    pageTitle = `${title} Universe: Complete Franchise Media Directory`;
    pageDescription = `Explore the full franchise universe for ${title}. Navigate official canon storylines, spin-offs, feature films, and related multimedia entries.`;
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/universe`;

  } else if (cleanTab === 'recommendations') {
    // 10. Recommendations (/anime/[slug]/recommendations)
    pageTitle = `Anime Like ${title}: Curated Recommendations to Watch`;
    pageDescription = `Discover curated anime recommendations similar to ${title}. Hand-picked series sharing comparable themes, storytelling styles, and character dynamics.`;
    canonicalUrl = `${siteOrigin}/anime/${anime.slug}/recommendations`;

  } else {
    // Generic Tab Fallback
    const label = cleanTab.charAt(0).toUpperCase() + cleanTab.slice(1);
    pageTitle = `${title}: ${label} Guide`;
    pageDescription = `Comprehensive ${label.toLowerCase()} guide and details for ${title}. Researched viewer context, honest notes, and essential information.`;
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
