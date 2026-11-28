import { defineMiddleware } from 'astro:middleware';
import { SEARCH_INDEX_PATH } from './lib/search-cache.js';

const PUBLIC_HTML_CACHE_CONTROL = 'public, max-age=0, must-revalidate, s-maxage=86400';
const PRIVATE_ROUTE_CACHE_CONTROL = 'no-store, no-cache, must-revalidate, max-age=0';

export const onRequest = defineMiddleware(async (context, next) => {
  const startedAt = performance.now();
  const response = await next();
  const pathname = context.url.pathname;
  const appDuration = performance.now() - startedAt;
  const metrics = context.locals.__chitraPerformance || { d1TotalDuration: 0, d1Queries: 0 };

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Server-Timing',
    `app;dur=${appDuration.toFixed(1)}, d1;dur=${metrics.d1TotalDuration.toFixed(1)};desc="Sum of ${metrics.d1Queries} D1 query durations"`
  );

  // Only successful anonymous search index responses own their cache policy.
  if ((pathname === SEARCH_INDEX_PATH || pathname === SEARCH_INDEX_PATH + '/') && response.status === 200) {
    return response;
  }

  // Admin and other API responses must never be cached by browser or edge.
  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    response.headers.set('Cache-Control', PRIVATE_ROUTE_CACHE_CONTROL);
    return response;
  }

  // 2. Static asset isolation:
  // Static assets (/_astro/*, images, scripts, fonts) and non-HTML endpoints (robots.txt, sitemap.xml)
  // must maintain their own caching policies and never receive max-age=0.
  if (
    pathname.startsWith('/_astro/') ||
    /\.(?:ico|svg|webp|png|jpe?g|gif|css|js|mjs|woff2?|ttf|eot|xml|txt|webmanifest)$/i.test(pathname)
  ) {
    return response;
  }

  // 3. For public-facing dynamic HTML pages:
  // - max-age=0, must-revalidate: Directs client browsers to validate HTML with Cloudflare on every visit or link navigation, making purged updates visible immediately.
  // - s-maxage=86400: Instructs Cloudflare edge nodes to cache the generated HTML globally for 24 hours to protect D1 from redundant queries until an admin purge is triggered.
  const contentType = response.headers.get('content-type') || '';
  if (response.status === 200 && (contentType.includes('text/html') || !contentType)) {
    if (context.locals.__chitraD1ReadFailed) response.headers.set('Cache-Control', 'no-store');
    if (response.headers.has('Cache-Control')) return response;
    response.headers.set('Cache-Control', PUBLIC_HTML_CACHE_CONTROL);
    response.headers.set('X-Chitra-Cache-Policy', 'public-html');
  }

  return response;
});
