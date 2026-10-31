// src/pages/api/search.json.js
import { getCompactAnimeList, getAllBlogPosts, getDatabase } from '../../lib/d1.js';

export const prerender = false;

export async function GET({ locals }) {
  try {
    const db = await getDatabase(locals);
    const [animeList, blogPosts, aliasesRows] = await Promise.all([
      getCompactAnimeList(locals),
      getAllBlogPosts(locals),
      db.query('SELECT anime_id, alias FROM anime_aliases').catch(() => [])
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
      aliases: aliasesMap.get(a.id) || []
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
          'Cache-Control': 'public, max-age=60, s-maxage=300'
        }
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to build search index', details: err?.message || String(err) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
