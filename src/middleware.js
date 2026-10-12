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
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate, s-maxage=86400');
    response.headers.set('X-Chitra-Cache-Policy', 'public-html');
  }

  return response;
});
