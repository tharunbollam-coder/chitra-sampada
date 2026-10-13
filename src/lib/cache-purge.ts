// src/lib/cache-purge.ts
// Centralized Cloudflare Edge Cache Purge Utility

import { env } from 'cloudflare:workers';
import { siteConfig } from '../config/site.js';
import {
  getDatabase,
  invalidateAllCaches,
  invalidateAnimeCache,
  invalidateBlogCache,
  invalidateSiteSettingsCache
} from './d1.js';

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

/**
 * Extract Cloudflare credentials and public site URL from Cloudflare Workers env and fallbacks.
 */
export function getCloudflareConfig(contextOrLocals?: any): CloudflareConfig {
  const procEnv = typeof process !== 'undefined' ? process.env : {};
  const metaEnv: Record<string, any> = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}) as Record<string, any>;
  const cfEnv: Record<string, any> = (typeof env !== 'undefined' && env) ? env : {};
  const localsEnv: Record<string, any> = (contextOrLocals && typeof contextOrLocals === 'object' && contextOrLocals.env) ? contextOrLocals.env : {};
  const globalEnv: Record<string, any> = (typeof globalThis !== 'undefined' && (globalThis as any).env) ? (globalThis as any).env : {};

  const zoneId = (
    cfEnv.CLOUDFLARE_ZONE_ID ||
    procEnv.CLOUDFLARE_ZONE_ID ||
    localsEnv.CLOUDFLARE_ZONE_ID ||
    metaEnv.CLOUDFLARE_ZONE_ID ||
    globalEnv.CLOUDFLARE_ZONE_ID ||
    ''
  ).toString().trim() || undefined;

  const apiToken = (
    cfEnv.CLOUDFLARE_API_TOKEN ||
    procEnv.CLOUDFLARE_API_TOKEN ||
    localsEnv.CLOUDFLARE_API_TOKEN ||
    metaEnv.CLOUDFLARE_API_TOKEN ||
    globalEnv.CLOUDFLARE_API_TOKEN ||
    ''
  ).toString().trim() || undefined;

  let siteUrl = (
    cfEnv.PUBLIC_SITE_URL ||
    procEnv.PUBLIC_SITE_URL ||
    localsEnv.PUBLIC_SITE_URL ||
    metaEnv.PUBLIC_SITE_URL ||
    siteConfig.siteUrl ||
    'https://chitrasampada.com'
  ).toString().trim();
  siteUrl = siteUrl.replace(/\/+$/, '');

  return { zoneId, apiToken, siteUrl };
}

/**
 * Normalizes relative paths to full canonical URLs using the configured public site URL.
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
      continue;
    }

    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    if (path === '/') {
      urlSet.add(`${cleanBase}/`);
    } else {
      urlSet.add(`${cleanBase}${path}`);
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

    const { zoneId, apiToken, siteUrl } = getCloudflareConfig(locals);

    if (!zoneId || !apiToken) {
      console.warn(
        '[Cache Purge] Cloudflare CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN is not defined. Skipping edge cache purge.'
      );
      return {
        success: true,
        skipped: true,
        reason: 'Cloudflare credentials not configured in environment'
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
  invalidateSiteSettingsCache();
  invalidateAnimeCache();
  return purgeCloudflareCache(['/', '/sitemap.xml'], contextOrLocals);
}

/**
 * Purge Franchise and Watch Order Cache.
 * Discovers all anime associated with this franchise in D1,
 * and purges all of their individual detail routes, sub-tabs, catalog, hub, and homepage.
 */
export async function purgeFranchiseCache(
  franchiseId?: string | null,
  contextOrLocals?: any
): Promise<PurgeCacheResult> {
  invalidateAnimeCache();

  const paths = new Set<string>(['/anime', '/anime/catalog', '/', '/sitemap.xml']);

  if (franchiseId && typeof franchiseId === 'string' && franchiseId.trim().length > 0) {
    const cleanFid = franchiseId.trim();
    try {
      const db = await getDatabase(contextOrLocals);
      const rows = await db.query(`
        SELECT DISTINCT slug FROM anime WHERE franchise_id = ?
        UNION
        SELECT DISTINCT a.slug
        FROM franchise_watch_order fwo
        JOIN anime a ON fwo.anime_id = a.id
        WHERE fwo.franchise_id = ?
      `, cleanFid, cleanFid);

      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (row?.slug) {
            const s = String(row.slug).trim().toLowerCase();
            paths.add(`/anime/${s}`);
            paths.add(`/anime/${s}/watch-order`);
            paths.add(`/anime/${s}/filler-list`);
            paths.add(`/anime/${s}/characters`);
            paths.add(`/anime/${s}/review`);
            paths.add(`/anime/${s}/lessons`);
            paths.add(`/anime/${s}/source`);
            paths.add(`/anime/${s}/power-system`);
            paths.add(`/anime/${s}/universe`);
            paths.add(`/anime/${s}/recommendations`);
          }
        }
      }
    } catch (err) {
      console.warn('[Cache Purge] Could not query anime slugs for franchise:', cleanFid, err);
    }
  }

  return purgeCloudflareCache(Array.from(paths), contextOrLocals);
}

/**
 * Purge Anime Page and related sub-tabs and catalog indexes
 */
export async function purgeAnimeCache(slug: string, contextOrLocals?: any): Promise<PurgeCacheResult> {
  invalidateAnimeCache();
  if (!slug) {
    return purgeCloudflareCache(['/anime', '/anime/catalog', '/', '/sitemap.xml'], contextOrLocals);
  }

  const cleanSlug = slug.trim().toLowerCase();
  const tabs = [
    'watch-order',
    'filler-list',
    'characters',
    'review',
    'lessons',
    'source',
    'power-system',
    'universe',
    'recommendations'
  ];

  const paths = [
    `/anime/${cleanSlug}`,
    ...tabs.map((tab) => `/anime/${cleanSlug}/${tab}`),
    '/anime',
    '/anime/catalog',
    '/',
    '/sitemap.xml'
  ];

  return purgeCloudflareCache(paths, contextOrLocals);
}

/**
 * Helper to resolve anime slug, franchise connections, and vibe tags,
 * and purge all associated edge cache URLs across Cloudflare.
 */
export async function purgeAnimeCacheByIdOrSlug(
  idOrSlug: string,
  contextOrLocals?: any
): Promise<PurgeCacheResult> {
  invalidateAnimeCache();
  if (!idOrSlug) {
    return purgeAnimeCache('', contextOrLocals);
  }

  const paths = new Set<string>(['/anime', '/anime/catalog', '/', '/sitemap.xml']);
  let resolvedSlug = String(idOrSlug).trim().toLowerCase();
  let franchiseId: string | null = null;
  let animeId = String(idOrSlug).trim();

  try {
    const db = await getDatabase(contextOrLocals);
    const row = await db.queryOne('SELECT id, slug, franchise_id FROM anime WHERE id = ? OR slug = ? LIMIT 1', idOrSlug, idOrSlug);
    if (row && row.slug) {
      resolvedSlug = String(row.slug).trim().toLowerCase();
      franchiseId = row.franchise_id || null;
      animeId = row.id;
    }

    // Query associated vibe tags to purge corresponding vibe catalog pages
    const vibeRows = await db.query(`
      SELECT v.slug FROM anime_vibes av
      JOIN vibes v ON v.id = av.vibe_id
      WHERE av.anime_id = ?
    `, animeId);

    if (Array.isArray(vibeRows)) {
      for (const vr of vibeRows) {
        if (vr?.slug) paths.add(`/anime/tag/${String(vr.slug).trim().toLowerCase()}`);
      }
    }

    // If part of a franchise, also purge sibling franchise anime watch order tabs
    if (franchiseId) {
      const siblingRows = await db.query(`
        SELECT slug FROM anime WHERE franchise_id = ? AND slug != ?
      `, franchiseId, resolvedSlug);
      if (Array.isArray(siblingRows)) {
        for (const sr of siblingRows) {
          if (sr?.slug) {
            const sibSlug = String(sr.slug).trim().toLowerCase();
            paths.add(`/anime/${sibSlug}`);
            paths.add(`/anime/${sibSlug}/watch-order`);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Cache Purge] Could not query anime details for ID:', idOrSlug, err);
  }

  const tabs = [
    'watch-order',
    'filler-list',
    'characters',
    'review',
    'lessons',
    'source',
    'power-system',
    'universe',
    'recommendations'
  ];

  paths.add(`/anime/${resolvedSlug}`);
  for (const tab of tabs) {
    paths.add(`/anime/${resolvedSlug}/${tab}`);
  }

  return purgeCloudflareCache(Array.from(paths), contextOrLocals);
}

/**
 * Purge Blog Posts, Blog Index, and linked anime entry pages
 */
export async function purgeBlogCache(slug?: string | null, contextOrLocals?: any): Promise<PurgeCacheResult> {
  invalidateBlogCache();
  const paths = new Set<string>(['/blog', '/', '/sitemap.xml']);

  if (slug && typeof slug === 'string' && slug.trim().length > 0) {
    const cleanSlug = slug.trim().toLowerCase();
    paths.add(`/blog/${cleanSlug}`);

    try {
      const db = await getDatabase(contextOrLocals);
      const linked = await db.query(`
        SELECT a.slug FROM blog_post_anime bpa
        JOIN blog_posts bp ON bp.id = bpa.post_id
        JOIN anime a ON a.id = bpa.anime_id
        WHERE bp.slug = ? OR bp.id = ?
      `, cleanSlug, cleanSlug);

      if (Array.isArray(linked)) {
        for (const l of linked) {
          if (l?.slug) paths.add(`/anime/${String(l.slug).trim().toLowerCase()}`);
        }
      }
    } catch {}
  }

  return purgeCloudflareCache(Array.from(paths), contextOrLocals);
}

/**
 * Purge Full Site (Entire Cloudflare Edge Cache) and all in-memory caches
 */
export async function purgeEntireSiteCache(contextOrLocals?: any): Promise<PurgeCacheResult> {
  invalidateAllCaches();
  return purgeCloudflareCache({ purgeEverything: true, contextOrLocals });
}
