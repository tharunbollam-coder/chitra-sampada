import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const startedAt = performance.now();
  const response = await next();
  const pathname = context.url.pathname;
  const appDuration = performance.now() - startedAt;
  const metrics = context.locals.__chitraPerformance || { d1Duration: 0, d1Queries: 0 };

  response.headers.set(
    'Server-Timing',
    `app;dur=${appDuration.toFixed(1)}, d1;dur=${metrics.d1Duration.toFixed(1)};desc="${metrics.d1Queries} queries"`
  );

  // 1. Admin and API routes must never be cached by browser or edge
  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return response;
  }

  // 2. For public-facing dynamic pages, inject Cache-Control header
  // Instructs browser to cache for 60s and Cloudflare shared edge network for 5 min (s-maxage=300)
  if (response.status === 200) {
    response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
    response.headers.set('X-Chitra-Cache-Policy', 'public-html');
  }

  return response;
});
