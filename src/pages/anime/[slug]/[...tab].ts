import type { APIRoute } from 'astro';
import { isLegacyAnimeTab } from '../../../lib/anime-links.ts';

export const prerender = false;

export const GET: APIRoute = ({ params, url, redirect }) => {
  if (!params.slug || !params.tab || !isLegacyAnimeTab(params.tab)) {
    return new Response(null, { status: 404 });
  }

  // Keep the original slug encoding and query string, including duplicate parameters.
  const animePath = url.pathname.split('/', 3).join('/');
  const response = redirect(`${animePath}${url.search}`, 301);
  if (url.search) response.headers.set('Cache-Control', 'no-store');
  return response;
};

export const HEAD = GET;
