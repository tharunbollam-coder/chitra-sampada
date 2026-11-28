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
  const truncated = cleaned.slice(0, maxLen - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  const safeEnd = lastSpace >= minLen ? lastSpace : maxLen - 3;
  
  const result = cleaned.slice(0, safeEnd).replace(/[,;:\-\s]+$/, '');
  return `${result}...`;
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
  return truncateDescription(cleaned, maxLen - 3);
}

/**
 * Generate a clean, natural lead sentence for the Watch Order tab and descriptions.
 * Never dumps comma-separated titles or "...and X more titles".
 */
export function getWatchOrderLeadSentence(
  animeTitle: string,
  franchiseName?: string | null,
  watchOrderNoteOrAnimeList?: string | null | Array<any>
): string {
  const cleanTitle = (animeTitle || '').trim();
  const rawFranchise = typeof franchiseName === 'string' ? franchiseName.trim() : '';

  // 1. When part of a franchise (franchiseName exists and is not empty)
  if (rawFranchise.length > 0) {
    const cleanFranchiseName = rawFranchise.replace(/\s+franchise$/i, '').trim() || rawFranchise;
    const isSameName = cleanFranchiseName.toLowerCase() === cleanTitle.toLowerCase();

    if (isSameName) {
      return `Complete chronological watch order for the ${cleanFranchiseName} franchise, covering where every series, season, and movie fits into the storyline.`;
    } else {
      return `How to watch ${cleanTitle} and the complete ${cleanFranchiseName} franchise in chronological order, including where every series and movie fits into the timeline.`;
    }
  }

  // 2. When standalone (no franchise note, only anime's own watch order note)
  const noteText = typeof watchOrderNoteOrAnimeList === 'string' ? watchOrderNoteOrAnimeList.trim() : '';
  if (noteText.length > 0) {
    const cleaned = cleanPlainText(noteText);
    const match = cleaned.match(/^([^.!?]+[.!?])/);
    const firstSentence = match ? match[1].trim() : '';
    if (firstSentence.length >= 15 && firstSentence.length <= 160) {
      return firstSentence;
    }
  }

  // Fallback for standalone
  return `Complete chronological watch order and viewing guide for ${cleanTitle}.`;
}

/**
 * Build metadata for the consolidated anime detail page.
 */
export function buildAnimeMetadata(
  anime: { title: string; slug: string; year?: number | string | null; synopsis?: string | null },
  tabs: ReadonlyArray<{ key: string; label: string }>,
  siteOrigin: string
): { pageTitle: string; pageDescription: string; canonicalUrl: string } {
  const { title, slug } = anime;
  const guideKeys = ['watch-order', 'filler-list'];
  const guideLabels = guideKeys.flatMap((key) => tabs.find((tab) => tab.key === key)?.label ?? []);
  const otherLabels = tabs.filter((tab) => !guideKeys.includes(tab.key)).map((tab) => tab.label);

  const primaryTopic = guideLabels[0] ?? otherLabels[0] ?? 'Anime Guide';
  const combinedTopic = guideLabels.length > 1 ? guideLabels.join(' & ') : primaryTopic;
  const pageTitle = [`${title} | ${combinedTopic}`, `${title} | ${primaryTopic}`, title]
    .find((candidate) => candidate.length <= 60) ?? truncateDescription(title, 57, 40);

  const synopsis = cleanPlainText(anime.synopsis);
  const topics = [...guideLabels, ...otherLabels].slice(0, 3).map((label) => label.toLowerCase());
  const summary = topics.length
    ? `Explore ${new Intl.ListFormat('en').format(topics)} for ${title}.`
    : '';
  const fallback = `Anime guide for ${title}${anime.year ? ` (${anime.year})` : ''}.`;
  const pageDescription = cutAtSentenceBoundary([summary, synopsis].filter(Boolean).join(' ') || fallback);

  return { pageTitle, pageDescription, canonicalUrl: `${siteOrigin}/anime/${slug}` };
}

/**
 * Build SEO metadata for curated Vibe/Tag pages.
 */
export function buildVibeMetadata(vibe: any): { pageTitle: string; pageDescription: string } {
  const name = (vibe?.name || '').trim();
  const topic = !name || /\banime$/i.test(name) ? (name || 'Anime') : `${name} Anime`;
  const pageTitle = `${topic} | Chitra Sampada`;
  
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
    pageDescription = `Browse the ${topic} collection for curated watch guides, filler lists, and editorial reviews where available.`;
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
