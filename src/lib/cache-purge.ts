// src/lib/cache-purge.ts
// Centralized Cloudflare Edge Cache Purge Utility

import { env } from 'cloudflare:workers';
import { siteConfig } from '../config/site.js';
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
  return purgeCloudflareCache(['/'], contextOrLocals);
}

/**
 * Purge Franchise and Watch Order Cache
 */
export async function purgeFranchiseCache(
  franchiseId?: string | null,
  contextOrLocals?: any
): Promise<PurgeCacheResult> {
  const paths = ['/watch-order', '/franchises', '/'];
  if (franchiseId && typeof franchiseId === 'string') {
    paths.push(`/franchise/${franchiseId.trim()}`);
  }
  return purgeCloudflareCache(paths, contextOrLocals);
}

/**
 * Purge Anime Page and related sub-tabs and catalog indexes
 */
export async function purgeAnimeCache(slug: string, contextOrLocals?: any): Promise<PurgeCacheResult> {
  if (!slug) {
    return purgeCloudflareCache(['/anime', '/anime/catalog', '/'], contextOrLocals);
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
    '/'
  ];

  return purgeCloudflareCache(paths, contextOrLocals);
}

/**
 * Helper to resolve anime slug (from ID or slug) and purge all associated edge cache URLs.
 */
export async function purgeAnimeCacheByIdOrSlug(
  idOrSlug: string,
  contextOrLocals?: any
): Promise<PurgeCacheResult> {
  if (!idOrSlug) {
    return purgeCloudflareCache(['/anime', '/anime/catalog', '/'], contextOrLocals);
  }

  let resolvedSlug = idOrSlug.trim().toLowerCase();

  try {
    const db = await getDatabase(contextOrLocals);
    const row = await db.queryOne('SELECT slug FROM anime WHERE id = ? OR slug = ? LIMIT 1', idOrSlug, idOrSlug);
    if (row && row.slug) {
      resolvedSlug = row.slug.trim().toLowerCase();
    }
  } catch (err) {
    console.warn('[Cache Purge] Could not query anime slug for ID:', idOrSlug, err);
  }

  return purgeAnimeCache(resolvedSlug, contextOrLocals);
}

/**
 * Purge Blog Posts and Blog Index
 */
export async function purgeBlogCache(slug?: string | null, contextOrLocals?: any): Promise<PurgeCacheResult> {
  const paths = ['/blog', '/'];
  if (slug && typeof slug === 'string') {
    paths.push(`/blog/${slug.trim().toLowerCase()}`);
  }
  return purgeCloudflareCache(paths, contextOrLocals);
}

/**
 * Purge Full Site (Entire Cloudflare Edge Cache)
 */
export async function purgeEntireSiteCache(contextOrLocals?: any): Promise<PurgeCacheResult> {
  return purgeCloudflareCache({ purgeEverything: true, contextOrLocals });
}
