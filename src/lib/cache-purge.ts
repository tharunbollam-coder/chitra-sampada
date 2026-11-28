// src/lib/cache-purge.ts
// Centralized Cloudflare Edge Cache Purge Utility

import { siteConfig } from '../config/site.js';
import { SEARCH_INDEX_PATH } from './search-cache.js';
import { getDatabase } from './d1.js';

export interface CloudflareConfig {
  zoneId?: string;
  apiToken?: string;
  siteUrl: string;
}

export interface PurgeCacheOptions {
  paths?: string[];
  purgeEverything?: boolean;
  contextOrLocals?: any;
}

export interface PurgeCacheResult {
  success: boolean;
  purged?: string[] | 'everything';
  skipped?: boolean;
  reason?: string;
  error?: string;
}

const DEFAULT_ZONE_ID = 'cc8324c00d976c043a712bbeeaead711';
const DEFAULT_SITE_URL = 'https://chitrasampada.com';

/**
 * Safely resolves environment variables and Cloudflare bindings.
 * Dynamically imports 'cloudflare:workers' env with fallback to process.env and import.meta.env.
 * Never accesses Astro.locals.runtime or context.runtime (removed in Astro v6).
 */
export async function resolveEnv(contextOrLocals?: any): Promise<Record<string, any>> {
  let cfEnv: Record<string, any> = {};
  try {
    const cf = await import('cloudflare:workers');
    if (cf?.env && typeof cf.env === 'object') {
      cfEnv = cf.env;
    }
  } catch {}

  const procEnv: Record<string, any> = (typeof process !== 'undefined' && process.env) ? process.env : {};
  const metaEnv: Record<string, any> = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};
  const globalEnv: Record<string, any> = (typeof globalThis !== 'undefined' && (globalThis as any).env) ? (globalThis as any).env : {};
  const localsEnv: Record<string, any> = (contextOrLocals && typeof contextOrLocals === 'object' && contextOrLocals.env) ? contextOrLocals.env : {};

  return {
    ...globalEnv,
    ...metaEnv,
    ...procEnv,
    ...localsEnv,
    ...cfEnv
  };
}

/**
 * Extract Cloudflare credentials and public site URL from Cloudflare Workers env and fallbacks.
 */
export async function getCloudflareConfig(contextOrLocals?: any): Promise<CloudflareConfig> {
  const envMap = await resolveEnv(contextOrLocals);

  const zoneId = (
    envMap.CLOUDFLARE_ZONE_ID ||
    DEFAULT_ZONE_ID
  ).toString().trim();

  const apiToken = (
    envMap.CLOUDFLARE_API_TOKEN ||
    ''
  ).toString().trim() || undefined;

  let siteUrl = (
    envMap.PUBLIC_SITE_URL ||
    siteConfig.siteUrl ||
    DEFAULT_SITE_URL
  ).toString().trim().replace(/\/+$/, '');

  return { zoneId, apiToken, siteUrl };
}

/**
 * Normalizes relative paths to full canonical URLs using the configured public site URL.
 * Automatically purges both trailing-slash and non-trailing-slash variants for Cloudflare edge cache key matching.
 */
export function canonicalizePaths(paths: (string | null | undefined)[], siteUrl: string): string[] {
  const cleanBase = siteUrl.replace(/\/+$/, '');
  const urlSet = new Set<string>();

  for (const rawPath of paths) {
    if (!rawPath || typeof rawPath !== 'string') continue;
    const trimmed = rawPath.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      urlSet.add(trimmed);
      if (trimmed.startsWith(cleanBase)) {
        const pathPart = trimmed.slice(cleanBase.length);
        const isFile = /\.[a-z0-9]+$/i.test(pathPart);
        if (!isFile) {
          if (trimmed.endsWith('/')) {
            urlSet.add(trimmed.replace(/\/+$/, ''));
          } else {
            urlSet.add(`${trimmed}/`);
          }
        }
      }
      continue;
    }

    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    if (path === '/') {
      urlSet.add(`${cleanBase}/`);
      urlSet.add(cleanBase);
    } else {
      const cleanPath = path.replace(/\/+$/, '');
      const isFile = /\.[a-z0-9]+$/i.test(cleanPath);
      urlSet.add(`${cleanBase}${cleanPath}`);
      if (!isFile) {
        urlSet.add(`${cleanBase}${cleanPath}/`);
      }
    }
  }

  return Array.from(urlSet);
}

/**
 * Central Cloudflare Edge Cache Purge function.
 * Sends POST request to Cloudflare Client API v4 purge_cache endpoint.
 * Gracefully handles missing credentials and network issues without failing caller execution.
 */
export async function purgeCloudflareCache(
  pathsOrOptions: string[] | PurgeCacheOptions,
  contextOrLocals?: any
): Promise<PurgeCacheResult> {
  try {
    let paths: string[] = [];
    let purgeEverything = false;
    let locals = contextOrLocals;

    if (Array.isArray(pathsOrOptions)) {
      paths = pathsOrOptions;
    } else if (pathsOrOptions && typeof pathsOrOptions === 'object') {
      paths = pathsOrOptions.paths || [];
      purgeEverything = Boolean(pathsOrOptions.purgeEverything);
      locals = pathsOrOptions.contextOrLocals || contextOrLocals;
    }

    if (purgeEverything) {
      try {
        const cf = await import('cloudflare:workers');
        if (typeof (cf as any).cache?.purge === 'function') {
          await (cf as any).cache.purge({ purgeEverything: true });
        }
      } catch (error) {
        console.warn('[Cache Purge] Workers runtime cache purge failed:', error);
      }
    }

    const { zoneId, apiToken, siteUrl } = await getCloudflareConfig(locals);

    if (!zoneId || !apiToken) {
      console.warn(
        '[Cache Purge] Cloudflare CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN is not defined. Skipping edge cache purge.'
      );
      return {
        success: false,
        skipped: true,
        error: 'Cloudflare credentials not configured in environment'
      };
    }

    const endpoint = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;
    const headers = {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    };

    if (purgeEverything) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ purge_everything: true })
      });

      const data: any = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        console.log('[Cache Purge] Successfully purged entire site edge cache on Cloudflare.');
        return { success: true, purged: 'everything' };
      }

      const errMsg = data?.errors?.map((e: any) => e.message).join(', ') || `HTTP ${res.status}`;
      console.warn('[Cache Purge Warning] Cloudflare full purge failed:', errMsg);
      return { success: false, error: errMsg };
    }

    const files = canonicalizePaths(paths, siteUrl);
    if (files.length === 0) {
      return { success: true, skipped: true, reason: 'No valid paths provided for cache purge' };
    }

    // Cloudflare limits files purge to 30 URLs per batch
    const BATCH_SIZE = 30;
    const allPurged: string[] = [];

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ files: batch })
      });

      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        const errMsg = data?.errors?.map((e: any) => e.message).join(', ') || `HTTP ${res.status}`;
        console.warn(`[Cache Purge Warning] Cloudflare file purge batch failed (${batch.length} files):`, errMsg);
        return { success: false, error: errMsg, purged: allPurged };
      }

      allPurged.push(...batch);
    }

    console.log(`[Cache Purge] Successfully purged ${allPurged.length} edge cache URLs on Cloudflare:`, allPurged);
    return { success: true, purged: allPurged };
  } catch (err: any) {
    console.warn('[Cache Purge Error] Network or execution error while contacting Cloudflare API:', err?.message || err);
    return { success: false, error: err?.message || 'Unknown network error' };
  }
}

/**
 * Purge Homepage Cache
 */
export async function purgeHomepageCache(contextOrLocals?: any): Promise<PurgeCacheResult> {
  return purgeCloudflareCache(['/', '/anime', '/sitemap.xml'], contextOrLocals);
}

const animeListingPaths = ['/', '/anime', '/anime/catalog', '/sitemap.xml', SEARCH_INDEX_PATH];
const blogListingPaths = ['/', '/blog', '/sitemap.xml', SEARCH_INDEX_PATH];

function addSlugPaths(paths: Set<string>, prefix: string, rows: { slug?: string }[]) {
  for (const { slug } of rows) {
    if (slug) paths.add(prefix + encodeURIComponent(slug));
  }
}

/** Snapshot public URLs that use an anime and its relationships. */
export async function getAnimePurgePaths(
  idOrSlug: string,
  contextOrLocals?: any,
  { includeReferences = false, fallbackSlug }: { includeReferences?: boolean; fallbackSlug?: string } = {}
): Promise<string[]> {
  const paths = new Set(animeListingPaths);
  const key = String(idOrSlug || '').trim();
  if (!key) return [...paths];

  let slug = fallbackSlug;
  try {
    const db = await getDatabase(contextOrLocals);
    const anime = await db.queryOne('SELECT id, slug, franchise_id FROM anime WHERE id = ? OR slug = ? LIMIT 1', key, key);
    if (anime) {
      slug = anime.slug;
      const [vibes, siblings, recommendations, articles] = await Promise.all([
        db.query(`
          SELECT v.slug FROM anime_vibes av JOIN vibes v ON v.id = av.vibe_id WHERE av.anime_id = ?
        `, anime.id),
        anime.franchise_id ? db.query(`
          SELECT slug FROM anime WHERE franchise_id = ? AND id != ?
        `, anime.franchise_id, anime.id) : [],
        includeReferences ? db.query(`
          SELECT DISTINCT a.slug FROM anime_recommendations r JOIN anime a ON a.id = r.anime_id
          WHERE r.target_anime_id = ?
        `, anime.id) : [],
        includeReferences ? db.query(`
          SELECT p.slug FROM blog_post_anime bpa JOIN blog_posts p ON p.id = bpa.post_id
          WHERE bpa.anime_id = ? AND p.status = 'published'
        `, anime.id) : []
      ]);
      addSlugPaths(paths, '/anime/tag/', vibes);
      addSlugPaths(paths, '/anime/', siblings);
      addSlugPaths(paths, '/anime/', recommendations);
      addSlugPaths(paths, '/blog/', articles);
      if (articles.length) paths.add('/blog');
    }
  } catch (error) {
    console.warn('[Cache Purge] Could not resolve anime dependencies:', error);
  }

  if (slug) addSlugPaths(paths, '/anime/', [{ slug }]);
  return [...paths];
}

export async function purgeAnimeCacheByIdOrSlug(
  idOrSlug: string,
  contextOrLocals?: any,
  before: string[] = [],
  { includeReferences = false, fallbackSlug = idOrSlug }: { includeReferences?: boolean; fallbackSlug?: string } = {}
): Promise<PurgeCacheResult> {
  const after = await getAnimePurgePaths(idOrSlug, contextOrLocals, { includeReferences, fallbackSlug });
  return purgeCloudflareCache([...before, ...after], contextOrLocals);
}

/** Include both franchise members and the former siblings of anime being assigned. */
export async function getFranchisePurgePaths(
  franchiseIds: (string | null | undefined)[] | null,
  contextOrLocals?: any,
  pickedAnimeIds: unknown[] = []
): Promise<string[]> {
  const paths = new Set(animeListingPaths.filter((path) => path !== SEARCH_INDEX_PATH));
  const ids = (franchiseIds || []).filter(Boolean);
  const pickedIds = Array.isArray(pickedAnimeIds) ? pickedAnimeIds.map((id) => String(id).trim()) : [];
  if (franchiseIds !== null && !ids.length && !pickedIds.length) return [...paths];

  try {
    const db = await getDatabase(contextOrLocals, { strictReads: true });
    const rows = franchiseIds === null
      ? await db.query(`
        SELECT slug FROM anime WHERE franchise_id IS NOT NULL OR NULLIF(TRIM(watch_order_note), '') IS NOT NULL
      `)
      : await db.query(`
        SELECT slug FROM anime
        WHERE franchise_id IN (SELECT value FROM json_each(?))
          OR id IN (SELECT value FROM json_each(?))
          OR franchise_id IN (
            SELECT former.franchise_id FROM anime former WHERE former.id IN (SELECT value FROM json_each(?))
          )
      `, JSON.stringify(ids), JSON.stringify(pickedIds), JSON.stringify(pickedIds));
    addSlugPaths(paths, '/anime/', rows);
  } catch (error) {
    if (franchiseIds === null) throw error;
    console.warn('[Cache Purge] Could not resolve franchise dependencies:', error);
  }
  return [...paths];
}

export async function purgeWatchOrdersCache(contextOrLocals?: any): Promise<PurgeCacheResult> {
  try {
    return await purgeCloudflareCache(await getFranchisePurgePaths(null, contextOrLocals), contextOrLocals);
  } catch (error) {
    console.warn('[Cache Purge] Could not resolve watch-order pages:', error);
    return { success: false, error: 'Could not resolve watch-order pages' };
  }
}

/** Read editorial links, character article links, and blog-to-anime associations. */
export async function getBlogPurgePaths(
  idOrSlug: string,
  contextOrLocals?: any,
  fallbackSlug?: string
): Promise<string[]> {
  const paths = new Set(blogListingPaths);
  let slug = fallbackSlug;
  try {
    const db = await getDatabase(contextOrLocals);
    const post = await db.queryOne('SELECT id, slug FROM blog_posts WHERE id = ? OR slug = ? LIMIT 1', idOrSlug, idOrSlug);
    if (post) {
      slug = post.slug;
      const rows = await db.query(`
        SELECT a.slug FROM blog_post_anime bpa JOIN anime a ON a.id = bpa.anime_id
        WHERE bpa.post_id = ?
        UNION
        SELECT a.slug FROM anime_genres g JOIN anime a ON a.id = g.anime_id
        WHERE g.genre IN (?, ?)
        UNION
        SELECT slug FROM anime WHERE character_related_post_slug = ?
      `, post.id, '__blog__:' + post.slug, '__blog__:' + post.id, post.slug);
      addSlugPaths(paths, '/anime/', rows);
    }
  } catch (error) {
    console.warn('[Cache Purge] Could not resolve blog dependencies:', error);
  }

  if (slug) addSlugPaths(paths, '/blog/', [{ slug }]);
  return [...paths];
}

export async function getVibePurgePaths(idOrSlug: string, contextOrLocals?: any, fallbackSlug?: string): Promise<string[]> {
  const paths = new Set(['/', '/anime', '/anime/catalog', '/sitemap.xml']);
  try {
    const db = await getDatabase(contextOrLocals, { strictReads: true });
    // Every nonempty vibe page can surface another active vibe in its browse links.
    const rows = await db.query(`
      SELECT v.slug FROM vibes v WHERE v.id = ? OR v.slug = ? OR EXISTS (
        SELECT 1 FROM anime_vibes av JOIN anime a ON a.id = av.anime_id WHERE av.vibe_id = v.id
      )
    `, idOrSlug, idOrSlug);
    addSlugPaths(paths, '/anime/tag/', rows);
  } catch (error) {
    console.warn('[Cache Purge] Could not resolve vibe dependencies:', error);
  }
  if (fallbackSlug) addSlugPaths(paths, '/anime/tag/', [{ slug: fallbackSlug }]);
  return [...paths];
}

/**
 * Purge the full site at the Cloudflare edge.
 */
export async function purgeEntireSiteCache(contextOrLocals?: any): Promise<PurgeCacheResult> {
  return purgeCloudflareCache({ purgeEverything: true, contextOrLocals });
}
