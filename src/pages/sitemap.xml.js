import { getDatabase } from '../lib/d1.js';
import { publicDataUnavailable } from '../lib/public-response.js';
import { RESERVED_ANIME_SLUGS } from '../lib/slug-validator.js';
import { siteConfig } from '../config/site.js';

export const prerender = false;

const staticPaths = [
  '/', '/anime', '/anime/catalog', '/blog',
  '/about', '/contact', '/privacy', '/terms', '/disclaimer', '/dmca', '/cookies'
];

function formatDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:$|[T ])/.test(value)) return null;
  // D1 timestamps without an explicit offset are UTC.
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? value.replace(' ', 'T') + 'Z'
    : value;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function escapeXml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  }[character]));
}

export async function GET({ locals }) {
  const siteUrl = (siteConfig.siteUrl || 'https://chitrasampada.com').replace(/\/+$/, '');

  try {
    const db = await getDatabase(locals, { strictReads: true });
    const [anime, posts, vibes] = await Promise.all([
      // Independently editable related records can change a page without updating its own timestamp.
      db.query(`
        SELECT a.slug, a.last_updated, a.added_date,
          (a.franchise_id IS NOT NULL OR NULLIF(TRIM(a.character_related_post_slug), '') IS NOT NULL
            OR EXISTS (SELECT 1 FROM anime_recommendations r WHERE r.anime_id = a.id)
            OR EXISTS (SELECT 1 FROM anime_genres g WHERE g.anime_id = a.id AND substr(g.genre, 1, 9) = '__blog__:'))
            AS has_independent_content
        FROM anime a
        ORDER BY a.year DESC, a.title ASC
      `),
      db.query(`
        SELECT p.slug, p.last_updated, p.published_date,
          EXISTS (SELECT 1 FROM blog_post_anime bpa WHERE bpa.post_id = p.id) AS has_independent_content
        FROM blog_posts p
        WHERE p.status = 'published'
        ORDER BY p.published_date DESC
      `),
      db.query(`
        SELECT v.slug FROM vibes v
        WHERE v.is_active = 1 AND EXISTS (
          SELECT 1 FROM anime_vibes av JOIN anime a ON a.id = av.anime_id WHERE av.vibe_id = v.id
        )
        ORDER BY v.name ASC
      `)
    ]);

    const urls = [
      ...staticPaths.map((path) => ({ path, lastmod: null })),
      ...vibes.map(({ slug }) => ({ path: '/anime/tag/' + encodeURIComponent(slug), lastmod: null })),
      ...anime.filter(({ slug }) => !RESERVED_ANIME_SLUGS.has(slug)).map((row) => ({
        path: '/anime/' + encodeURIComponent(row.slug),
        lastmod: row.has_independent_content ? null : formatDate(row.last_updated) || formatDate(row.added_date)
      })),
      ...posts.map((row) => ({
        path: '/blog/' + encodeURIComponent(row.slug),
        lastmod: row.has_independent_content ? null : formatDate(row.last_updated) || formatDate(row.published_date)
      }))
    ];

    const entries = urls.map(({ path, lastmod }) =>
      '  <url>\n    <loc>' + escapeXml(siteUrl + path) + '</loc>' +
      (lastmod ? '\n    <lastmod>' + lastmod + '</lastmod>' : '') + '\n  </url>'
    );
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      entries.join('\n') + '\n</urlset>';

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=0, must-revalidate, s-maxage=86400'
      }
    });
  } catch (error) {
    return publicDataUnavailable(error);
  }
}
