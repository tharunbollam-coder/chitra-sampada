import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const pathname = context.url.pathname;

  // 1. Admin and API routes must never be cached by browser or edge
  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return response;
  }

  // 2. For public-facing dynamic pages, inject Cache-Control header
  // Instructs browser to cache for 60s and Cloudflare shared edge network for 5 min (s-maxage=300)
  if (response.status === 200) {
    response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300');
  }

  return response;
});
