// src/lib/admin-api-handler.js
// Universal Admin REST API request router and handler for Astro SSR.

import {
  getAnimeById,
  saveAnimeCore,
  saveAnimeReview,
  saveAnimeLessons,
  saveAnimeWatchOrderLink,
  saveAnimeFillerList,
  saveAnimeCharacters,
  saveAnimeSource,
  saveAnimePowerSystem,
  saveAnimeRelatedMedia,
  saveAnimeRecommendations,
  saveAnimeVisibility,
  saveAllAnime,
  deleteAnime,
  getAllFranchises,
  saveFranchise,
  deleteFranchise,
  getAllAdminBlogPosts,
  getAdminBlogPostById,
  saveBlogPost,
  deleteBlogPost
} from './admin-db.js';
import { getDatabase } from './d1.js';
import { vibes } from '../data/vibes.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  });
}

async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function handleAdminApi({ request, locals, url, params }) {
  try {
    const rawRoute = (params?.route || '').replace(/^\/+|\/+$/g, '');
    const pathParts = url.pathname.replace(/^\/api\/admin\/?/, '').split('/').filter(Boolean);
    const route = rawRoute || pathParts.join('/');
    const method = request.method.toUpperCase();

    // -------------------------------------------------------------
    // 1. Metadata Endpoint
    // -------------------------------------------------------------
    if (route === 'meta' && method === 'GET') {
      const db = await getDatabase(locals);
      const genreRows = await db.query('SELECT DISTINCT genre FROM anime_genres ORDER BY genre ASC');
      const animeList = await db.query('SELECT id, title, slug, year, status FROM anime ORDER BY title ASC');
      const franchiseList = await db.query('SELECT id, name FROM franchises ORDER BY name ASC');

      return jsonResponse({
        success: true,
        data: {
          vibes: vibes.map(v => ({ id: v.id, title: v.title })),
          existingGenres: genreRows.map(r => r.genre),
          animeList,
          franchises: franchiseList
        }
      });
    }

    // -------------------------------------------------------------
    // 2. Anime Endpoints
    // -------------------------------------------------------------
    if (route === 'anime') {
      if (method === 'GET') {
        const id = url.searchParams.get('id') || url.searchParams.get('slug');
        if (id) {
          const anime = await getAnimeById(id, locals);
          if (!anime) {
            return jsonResponse({ success: false, error: 'Anime not found' }, 404);
          }
          return jsonResponse({ success: true, data: anime });
        }

        const db = await getDatabase(locals);
        const list = await db.query(`
          SELECT id, slug, title, original_title as originalTitle, year, episodes, 
                 type, runtime, movie_canon_type as movieCanonType,
                 status, honesty_status as honestyStatus, personal_rating as personalRating,
                 last_updated as lastUpdated, trending
          FROM anime
          ORDER BY title ASC
        `);
        return jsonResponse({ success: true, data: list });
      }

      if (method === 'DELETE') {
        const body = await parseJsonBody(request);
        const animeId = body.id || url.searchParams.get('id');
        if (!animeId) {
          return jsonResponse({ success: false, error: 'Anime ID is required for deletion' }, 400);
        }
        await deleteAnime(animeId, locals);
        return jsonResponse({ success: true, message: `Anime "${animeId}" deleted successfully` });
      }
    }

    // Section 1: Core Details
    if (route === 'anime/core' && method === 'POST') {
      const body = await parseJsonBody(request);
      const { id, slug, title, year, episodes } = body;

      if (!id?.trim()) return jsonResponse({ success: false, error: 'ID is required' }, 400);
      if (!slug?.trim()) return jsonResponse({ success: false, error: 'Slug is required' }, 400);
      if (!title?.trim()) return jsonResponse({ success: false, error: 'Title is required' }, 400);

      const cleanId = id.trim().toLowerCase();
      const cleanSlug = slug.trim().toLowerCase();

      const db = await getDatabase(locals);
      const existingSlug = await db.queryOne('SELECT id FROM anime WHERE slug = ? AND id != ?', cleanSlug, cleanId);
      if (existingSlug) {
        return jsonResponse({
          success: false,
          error: `Slug "${cleanSlug}" is already used by anime with ID "${existingSlug.id}"`
        }, 400);
      }

      const isMovie = body.type === 'movie';
      const parsedEpisodes = isMovie ? (parseInt(episodes, 10) || 1) : (parseInt(episodes, 10) || 0);
      const parsedRuntime = (body.runtime !== undefined && body.runtime !== null && body.runtime !== '')
        ? parseInt(body.runtime, 10)
        : null;

      const cleanData = {
        ...body,
        id: cleanId,
        slug: cleanSlug,
        title: title.trim(),
        type: isMovie ? 'movie' : 'series',
        runtime: parsedRuntime,
        movieCanonType: body.movieCanonType || null,
        year: parseInt(year, 10) || 0,
        episodes: parsedEpisodes,
        personalRating: body.personalRating !== '' && body.personalRating !== null && body.personalRating !== undefined
          ? parseFloat(body.personalRating)
          : null,
        lastUpdated: new Date().toISOString().split('T')[0]
      };

      const result = await saveAnimeCore(cleanData, locals);
      return jsonResponse({ success: true, message: 'Core details saved successfully', data: result });
    }

    // Section 2: Review (My Take)
    if (route === 'anime/review' && method === 'POST') {
      const body = await parseJsonBody(request);
      const { animeId, heading, paragraphs } = body;
      if (!animeId) return jsonResponse({ success: false, error: 'Anime ID is required' }, 400);
      await saveAnimeReview(animeId, { heading, paragraphs }, locals);
      return jsonResponse({ success: true, message: 'Review / My Take saved successfully' });
    }

    // Section 3: Lessons (What I Learned)
    if (route === 'anime/lessons' && method === 'POST') {
      const body = await parseJsonBody(request);
      const { animeId, heading, takeaway } = body;
      if (!animeId) return jsonResponse({ success: false, error: 'Anime ID is required' }, 400);
      await saveAnimeLessons(animeId, { heading, takeaway }, locals);
      return jsonResponse({ success: true, message: 'What I Learned section saved successfully' });
    }

    // Section 4: Franchise & Watch Order Link
    if (route === 'anime/watch-order' && method === 'POST') {
      const body = await parseJsonBody(request);
      const { animeId, franchiseId, franchiseStepOrder } = body;
      if (!animeId) return jsonResponse({ success: false, error: 'Anime ID is required' }, 400);
      await saveAnimeWatchOrderLink(animeId, { franchiseId, franchiseStepOrder }, locals);
      return jsonResponse({ success: true, message: 'Watch Order link saved successfully' });
    }

    // Section 5: Filler & Canon Breakdown
    if (route === 'anime/filler-ranges' && method === 'POST') {
      const body = await parseJsonBody(request);
      const { animeId, mangaCanon, animeCanon, mixedCanon, filler } = body;
      if (!animeId) return jsonResponse({ success: false, error: 'Anime ID is required' }, 400);

      try {
        const result = await saveAnimeFillerList(animeId, { mangaCanon, animeCanon, mixedCanon, filler }, locals);
        return jsonResponse({
          success: true,
          message: `Episode breakdown saved. Total: ${result.totalEpisodes} eps. Filler: ${result.fillerPercentage}%`,
          totalEpisodes: result.totalEpisodes,
          canonEpisodes: result.canonEpisodes,
          fillerPercentage: result.fillerPercentage,
          counts: result.counts
        });
      } catch (err) {
        return jsonResponse({ success: false, error: err.message }, 400);
      }
    }

    // Section 6: Key Characters
    if (route === 'anime/characters' && method === 'POST') {
      const body = await parseJsonBody(request);
      const { animeId, characters } = body;
      if (!animeId) return jsonResponse({ success: false, error: 'Anime ID is required' }, 400);
      if (!Array.isArray(characters)) return jsonResponse({ success: false, error: 'Characters must be an array' }, 400);
      await saveAnimeCharacters(animeId, characters, locals);
      return jsonResponse({ success: true, message: 'Key Characters saved successfully' });
    }

    // Section 7: Manga & Light Novel Source
    if (route === 'anime/source' && method === 'POST') {
      const body = await parseJsonBody(request);
      const { animeId, source } = body;
      if (!animeId) return jsonResponse({ success: false, error: 'Anime ID is required' }, 400);
      await saveAnimeSource(animeId, source || {}, locals);
      return jsonResponse({ success: true, message: 'Source guidance saved successfully' });
    }

    // Section 8: Power System
    if (route === 'anime/power-system' && method === 'POST') {
      const body = await parseJsonBody(request);
      const { animeId, name, paragraphs } = body;
      if (!animeId) return jsonResponse({ success: false, error: 'Anime ID is required' }, 400);
      await saveAnimePowerSystem(animeId, { name, paragraphs }, locals);
      return jsonResponse({ success: true, message: 'Power system details saved successfully' });
    }

    // Section 9: Related & Universe Media
    if (route === 'anime/universe' && method === 'POST') {
      const body = await parseJsonBody(request);
      const { animeId, universe } = body;
      if (!animeId) return jsonResponse({ success: false, error: 'Anime ID is required' }, 400);
      if (!Array.isArray(universe)) return jsonResponse({ success: false, error: 'Universe items must be an array' }, 400);
      await saveAnimeRelatedMedia(animeId, universe, locals);
      return jsonResponse({ success: true, message: 'Related & Universe media saved successfully' });
    }

    // Section 10: Shows Like This Recommendations
    if (route === 'anime/recommendations' && method === 'POST') {
      const body = await parseJsonBody(request);
      const { animeId, recommendations } = body;
      if (!animeId) return jsonResponse({ success: false, error: 'Anime ID is required' }, 400);
      if (!Array.isArray(recommendations)) return jsonResponse({ success: false, error: 'Recommendations must be an array' }, 400);
      await saveAnimeRecommendations(animeId, recommendations, locals);
      return jsonResponse({ success: true, message: 'Recommendations saved successfully' });
    }

    // Section Visibility Toggles (Show/Hide on Public Page)
    if (route === 'anime/visibility' && method === 'POST') {
      const body = await parseJsonBody(request);
      const { animeId, section, visible, isVisible, visibility } = body;
      if (!animeId) return jsonResponse({ success: false, error: 'Anime ID is required' }, 400);
      let payload = {};
      const flag = typeof visible === 'boolean' ? visible : (typeof isVisible === 'boolean' ? isVisible : undefined);
      if (section && typeof flag === 'boolean') {
        payload[section] = flag;
      } else if (visibility && typeof visibility === 'object') {
        payload = visibility;
      }
      const result = await saveAnimeVisibility(animeId, payload, locals);
      return jsonResponse({ success: true, message: 'Visibility updated successfully', data: result });
    }

    // Universal Save All (Sections 1-8 + Visibility Toggles)
    if (route === 'anime/save-all' && method === 'POST') {
      const body = await parseJsonBody(request);
      if (!body || (!body.core && !body.animeId)) {
        return jsonResponse({ success: false, error: 'Valid anime payload is required' }, 400);
      }
      try {
        const result = await saveAllAnime(body, locals);
        return jsonResponse({
          success: true,
          message: 'All anime sections and visibility settings saved successfully!',
          data: result
        });
      } catch (err) {
        return jsonResponse({ success: false, error: err.message }, 400);
      }
    }

    // -------------------------------------------------------------
    // 3. Franchise Endpoints
    // -------------------------------------------------------------
    if (route === 'franchises') {
      if (method === 'GET') {
        const list = await getAllFranchises(locals);
        return jsonResponse({ success: true, data: list });
      }

      if (method === 'POST') {
        const body = await parseJsonBody(request);
        const { id, name } = body;
        if (!id?.trim() || !name?.trim()) {
          return jsonResponse({ success: false, error: 'Franchise ID and Name are required' }, 400);
        }
        const result = await saveFranchise(body, locals);
        return jsonResponse({ success: true, message: 'Franchise saved successfully', data: result });
      }

      if (method === 'DELETE') {
        const body = await parseJsonBody(request);
        const fid = body.id || url.searchParams.get('id');
        if (!fid) {
          return jsonResponse({ success: false, error: 'Franchise ID is required' }, 400);
        }
        await deleteFranchise(fid, locals);
        return jsonResponse({ success: true, message: `Franchise "${fid}" deleted successfully` });
      }
    }

    // -------------------------------------------------------------
    // 4. Blog Endpoints
    // -------------------------------------------------------------
    if (route === 'blog') {
      if (method === 'GET') {
        const id = url.searchParams.get('id');
        if (id) {
          const post = await getAdminBlogPostById(id, locals);
          if (!post) {
            return jsonResponse({ success: false, error: 'Post not found' }, 404);
          }
          return jsonResponse({ success: true, data: post });
        }
        const posts = await getAllAdminBlogPosts(locals);
        return jsonResponse({ success: true, data: posts });
      }

      if (method === 'POST') {
        const body = await parseJsonBody(request);
        const { id, slug, title, content } = body;
        if (!id?.trim() || !slug?.trim() || !title?.trim() || !content?.trim()) {
          return jsonResponse({ success: false, error: 'ID, Slug, Title, and Content are required.' }, 400);
        }

        const cleanId = id.trim();
        const cleanSlug = slug.trim().toLowerCase();

        const db = await getDatabase(locals);
        const existingSlug = await db.queryOne('SELECT id FROM blog_posts WHERE slug = ? AND id != ?', cleanSlug, cleanId);
        if (existingSlug) {
          return jsonResponse({
            success: false,
            error: `Slug "${cleanSlug}" is already in use by another blog post (${existingSlug.id})`
          }, 400);
        }

        const result = await saveBlogPost({
          ...body,
          id: cleanId,
          slug: cleanSlug,
          title: title.trim(),
          content: content.trim(),
          lastUpdated: new Date().toISOString().split('T')[0]
        }, locals);
        return jsonResponse({ success: true, message: 'Blog post saved successfully', data: result });
      }

      if (method === 'DELETE') {
        const body = await parseJsonBody(request);
        const pid = body.id || url.searchParams.get('id');
        if (!pid) {
          return jsonResponse({ success: false, error: 'Blog Post ID is required' }, 400);
        }
        await deleteBlogPost(pid, locals);
        return jsonResponse({ success: true, message: `Blog post "${pid}" deleted successfully` });
      }
    }

    return jsonResponse({ success: false, error: `Admin route ${method} /${route} not found` }, 404);
  } catch (err) {
    console.error('[Admin API Error]', err);
    return jsonResponse({ success: false, error: err.message || 'Internal server error' }, 500);
  }
}
