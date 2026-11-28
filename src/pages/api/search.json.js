// src/pages/api/search.json.js
import { getCompactAnimeList, getAllBlogPosts, getDatabase } from '../../lib/d1.js';
import { SEARCH_INDEX_TTL_SECONDS } from '../../lib/search-cache.js';

export const prerender = false;

export async function GET({ locals }) {
  try {
    const db = await getDatabase(locals, { strictReads: true });
    const [animeList, blogPosts, aliasesRows] = await Promise.all([
      getCompactAnimeList(locals, { forSearch: true }),
      getAllBlogPosts({ strictReads: true }, locals),
      db.query('SELECT anime_id, alias FROM anime_aliases')
    ]);

    const aliasesMap = new Map();
    for (const row of (aliasesRows || [])) {
      if (!aliasesMap.has(row.anime_id)) aliasesMap.set(row.anime_id, []);
      aliasesMap.get(row.anime_id).push(row.alias);
    }

    const compactAnime = (animeList || []).map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      year: a.year,
      type: a.type || 'series',
      episodes: a.episodes,
      runtime: a.runtime,
      poster: a.poster || null,
      hasFiller: Boolean(a.hasFillerData),
      genres: a.genres || [],
      aliases: aliasesMap.get(a.id) || [],
      createdAt: a.createdAt || a.created_at || a.addedDate || a.added_date || null
    }));

    const compactBlogs = (blogPosts || []).map((b) => ({
      id: b.id,
      title: b.title,
      slug: b.slug,
      excerpt: b.excerpt,
      coverImage: b.coverImage || null,
      publishedDate: b.publishedDate,
      readTime: b.readTime || null,
      linkedAnime: (b.linkedAnime || []).map((la) => la.title)
    }));

    return new Response(
      JSON.stringify({
        anime: compactAnime,
        blogs: compactBlogs
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=0, must-revalidate, s-maxage=' + SEARCH_INDEX_TTL_SECONDS
        }
      }
    );
  } catch (err) {
    console.error('Failed to build search index:', err);
    return new Response(
      JSON.stringify({ error: 'Search temporarily unavailable' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      }
    );
  }
}
