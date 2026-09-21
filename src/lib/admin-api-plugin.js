// src/lib/admin-api-plugin.js
// Vite plugin providing dynamic REST API endpoints for the admin panel in dev mode.

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
  deleteAnime,
  getAllFranchises,
  saveFranchise,
  deleteFranchise,
  getAllAdminBlogPosts,
  getAdminBlogPostById,
  saveBlogPost,
  deleteBlogPost
} from './admin-db.js';
import { getSqliteDb } from './d1.js';
import { vibes } from '../data/vibes.js';

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export function adminApiPlugin() {
  return {
    name: 'admin-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        const pathname = url.pathname;

        if (!pathname.startsWith('/api/admin')) {
          return next();
        }

        try {
          const method = req.method.toUpperCase();

          // -------------------------------------------------------------
          // Metadata Endpoint: Genres, Vibes, Franchises, Anime List
          // -------------------------------------------------------------
          if (pathname === '/api/admin/meta' && method === 'GET') {
            const db = getSqliteDb();
            const genreRows = db.prepare('SELECT DISTINCT genre FROM anime_genres ORDER BY genre ASC').all();
            const animeList = db.prepare('SELECT id, title, slug, year, status FROM anime ORDER BY title ASC').all();
            const franchiseList = db.prepare('SELECT id, name FROM franchises ORDER BY name ASC').all();

            return sendJson(res, 200, {
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
          // Anime Endpoints
          // -------------------------------------------------------------
          if (pathname === '/api/admin/anime') {
            const db = getSqliteDb();
            if (method === 'GET') {
              const id = url.searchParams.get('id') || url.searchParams.get('slug');
              if (id) {
                const anime = getAnimeById(id);
                if (!anime) {
                  return sendJson(res, 404, { success: false, error: 'Anime not found' });
                }
                return sendJson(res, 200, { success: true, data: anime });
              }

              // List all anime with essential summary columns
              const list = db.prepare(`
                SELECT id, slug, title, original_title as originalTitle, year, episodes, 
                       status, honesty_status as honestyStatus, personal_rating as personalRating,
                       last_updated as lastUpdated, trending
                FROM anime
                ORDER BY title ASC
              `).all();
              return sendJson(res, 200, { success: true, data: list });
            }

            if (method === 'DELETE') {
              const body = await parseJsonBody(req);
              const animeId = body.id || url.searchParams.get('id');
              if (!animeId) {
                return sendJson(res, 400, { success: false, error: 'Anime ID is required for deletion' });
              }
              deleteAnime(animeId);
              return sendJson(res, 200, { success: true, message: `Anime "${animeId}" deleted successfully` });
            }
          }

          // Section 1: Core Details
          if (pathname === '/api/admin/anime/core' && method === 'POST') {
            const body = await parseJsonBody(req);
            const { id, slug, title, year, episodes } = body;

            if (!id?.trim()) {
              return sendJson(res, 400, { success: false, error: 'ID is required (e.g. frieren)' });
            }
            if (!slug?.trim()) {
              return sendJson(res, 400, { success: false, error: 'Slug is required (e.g. frieren-beyond-journeys-end)' });
            }
            if (!title?.trim()) {
              return sendJson(res, 400, { success: false, error: 'Title is required' });
            }

            const cleanId = id.trim().toLowerCase();
            const cleanSlug = slug.trim().toLowerCase();

            // Duplicate slug check for different ID
            const db = getSqliteDb();
            const existingSlug = db.prepare('SELECT id FROM anime WHERE slug = ? AND id != ?').get(cleanSlug, cleanId);
            if (existingSlug) {
              return sendJson(res, 400, {
                success: false,
                error: `Slug "${cleanSlug}" is already used by anime with ID "${existingSlug.id}"`
              });
            }

            const cleanData = {
              ...body,
              id: cleanId,
              slug: cleanSlug,
              title: title.trim(),
              year: parseInt(year, 10) || 0,
              episodes: parseInt(episodes, 10) || 0,
              personalRating: body.personalRating !== '' && body.personalRating !== null && body.personalRating !== undefined
                ? parseFloat(body.personalRating)
                : null,
              lastUpdated: new Date().toISOString().split('T')[0]
            };

            const result = saveAnimeCore(cleanData);
            return sendJson(res, 200, { success: true, message: 'Core details saved successfully', data: result });
          }

          // Section 2: Review (My Take)
          if (pathname === '/api/admin/anime/review' && method === 'POST') {
            const body = await parseJsonBody(req);
            const { animeId, heading, paragraphs } = body;
            if (!animeId) {
              return sendJson(res, 400, { success: false, error: 'Anime ID is required' });
            }
            saveAnimeReview(animeId, { heading, paragraphs });
            return sendJson(res, 200, { success: true, message: 'Review / My Take saved successfully' });
          }

          // Section 3: Lessons (What I Learned)
          if (pathname === '/api/admin/anime/lessons' && method === 'POST') {
            const body = await parseJsonBody(req);
            const { animeId, heading, takeaway } = body;
            if (!animeId) {
              return sendJson(res, 400, { success: false, error: 'Anime ID is required' });
            }
            saveAnimeLessons(animeId, { heading, takeaway });
            return sendJson(res, 200, { success: true, message: 'What I Learned section saved successfully' });
          }

          // Section 4: Franchise & Watch Order Link
          if (pathname === '/api/admin/anime/watch-order' && method === 'POST') {
            const body = await parseJsonBody(req);
            const { animeId, franchiseId, franchiseStepOrder } = body;
            if (!animeId) {
              return sendJson(res, 400, { success: false, error: 'Anime ID is required' });
            }
            saveAnimeWatchOrderLink(animeId, { franchiseId, franchiseStepOrder });
            return sendJson(res, 200, { success: true, message: 'Watch Order link saved successfully' });
          }

          // Section 5: Filler & Canon Breakdown
          if (pathname === '/api/admin/anime/filler-ranges' && method === 'POST') {
            const body = await parseJsonBody(req);
            const { animeId, mangaCanon, animeCanon, mixedCanon, filler } = body;
            if (!animeId) {
              return sendJson(res, 400, { success: false, error: 'Anime ID is required' });
            }

            try {
              const result = saveAnimeFillerList(animeId, {
                mangaCanon,
                animeCanon,
                mixedCanon,
                filler
              });
              return sendJson(res, 200, {
                success: true,
                message: `Episode breakdown saved. Recalculated filler: ${result.fillerPercentage}%`,
                fillerPercentage: result.fillerPercentage,
                counts: result.counts
              });
            } catch (err) {
              return sendJson(res, 400, { success: false, error: err.message });
            }
          }

          // Section 6: Key Characters
          if (pathname === '/api/admin/anime/characters' && method === 'POST') {
            const body = await parseJsonBody(req);
            const { animeId, characters } = body;
            if (!animeId) {
              return sendJson(res, 400, { success: false, error: 'Anime ID is required' });
            }
            if (!Array.isArray(characters)) {
              return sendJson(res, 400, { success: false, error: 'Characters must be an array' });
            }
            saveAnimeCharacters(animeId, characters);
            return sendJson(res, 200, { success: true, message: 'Key Characters saved successfully' });
          }

          // Section 7: Manga & Light Novel Source
          if (pathname === '/api/admin/anime/source' && method === 'POST') {
            const body = await parseJsonBody(req);
            const { animeId, source } = body;
            if (!animeId) {
              return sendJson(res, 400, { success: false, error: 'Anime ID is required' });
            }
            saveAnimeSource(animeId, source || {});
            return sendJson(res, 200, { success: true, message: 'Source guidance saved successfully' });
          }

          // Section 8: Power System
          if (pathname === '/api/admin/anime/power-system' && method === 'POST') {
            const body = await parseJsonBody(req);
            const { animeId, name, paragraphs } = body;
            if (!animeId) {
              return sendJson(res, 400, { success: false, error: 'Anime ID is required' });
            }
            saveAnimePowerSystem(animeId, { name, paragraphs });
            return sendJson(res, 200, { success: true, message: 'Power system details saved successfully' });
          }

          // -------------------------------------------------------------
          // Franchise Endpoints
          // -------------------------------------------------------------
          if (pathname === '/api/admin/franchises') {
            if (method === 'GET') {
              const list = getAllFranchises();
              return sendJson(res, 200, { success: true, data: list });
            }

            if (method === 'POST') {
              const body = await parseJsonBody(req);
              const { id, name } = body;
              if (!id?.trim() || !name?.trim()) {
                return sendJson(res, 400, { success: false, error: 'Franchise ID and Name are required' });
              }
              const result = saveFranchise(body);
              return sendJson(res, 200, { success: true, message: 'Franchise saved successfully', data: result });
            }

            if (method === 'DELETE') {
              const body = await parseJsonBody(req);
              const fid = body.id || url.searchParams.get('id');
              if (!fid) {
                return sendJson(res, 400, { success: false, error: 'Franchise ID is required' });
              }
              deleteFranchise(fid);
              return sendJson(res, 200, { success: true, message: `Franchise "${fid}" deleted successfully` });
            }
          }

          // -------------------------------------------------------------
          // Blog Endpoints
          // -------------------------------------------------------------
          if (pathname === '/api/admin/blog') {
            if (method === 'GET') {
              const id = url.searchParams.get('id');
              if (id) {
                const post = getAdminBlogPostById(id);
                if (!post) {
                  return sendJson(res, 404, { success: false, error: 'Post not found' });
                }
                return sendJson(res, 200, { success: true, data: post });
              }
              const posts = getAllAdminBlogPosts();
              return sendJson(res, 200, { success: true, data: posts });
            }

            if (method === 'POST') {
              const body = await parseJsonBody(req);
              const { id, slug, title, content } = body;
              if (!id?.trim() || !slug?.trim() || !title?.trim() || !content?.trim()) {
                return sendJson(res, 400, { success: false, error: 'ID, Slug, Title, and Content are required.' });
              }

              const cleanId = id.trim();
              const cleanSlug = slug.trim().toLowerCase();

              const db = getSqliteDb();
              const existingSlug = db.prepare('SELECT id FROM blog_posts WHERE slug = ? AND id != ?').get(cleanSlug, cleanId);
              if (existingSlug) {
                return sendJson(res, 400, {
                  success: false,
                  error: `Slug "${cleanSlug}" is already in use by another blog post (${existingSlug.id})`
                });
              }

              const result = saveBlogPost({
                ...body,
                id: cleanId,
                slug: cleanSlug,
                title: title.trim(),
                content: content.trim(),
                lastUpdated: new Date().toISOString().split('T')[0]
              });
              return sendJson(res, 200, { success: true, message: 'Blog post saved successfully', data: result });
            }

            if (method === 'DELETE') {
              const body = await parseJsonBody(req);
              const pid = body.id || url.searchParams.get('id');
              if (!pid) {
                return sendJson(res, 400, { success: false, error: 'Blog Post ID is required' });
              }
              deleteBlogPost(pid);
              return sendJson(res, 200, { success: true, message: `Blog post "${pid}" deleted successfully` });
            }
          }

          // Unrecognized admin API route
          return sendJson(res, 404, { success: false, error: `Admin route ${method} ${pathname} not found` });
        } catch (err) {
          console.error('[Admin API Error]', err);
          return sendJson(res, 500, { success: false, error: err.message || 'Internal server error' });
        }
      });
    }
  };
}
