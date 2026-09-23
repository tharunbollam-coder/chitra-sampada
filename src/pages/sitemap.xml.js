import { getAllAnime, getAvailableTabs, getAllBlogPosts } from '../lib/d1.js';
import { vibes } from '../data/vibes.js';
import { siteConfig } from '../config/site.js';

export async function GET() {
  const siteUrl = (siteConfig.siteUrl || 'https://chitrasampada.com').replace(/\/+$/, '');

  // Fetch live records from D1
  const [animeList, blogPosts] = await Promise.all([
    getAllAnime().catch(() => []),
    getAllBlogPosts({ includeDrafts: false }).catch(() => [])
  ]);

  const urls = [];

  function formatDate(d) {
    if (!d) return null;
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  // 1. Core hub & section homepages
  urls.push({
    loc: `${siteUrl}/`,
    changefreq: 'daily',
    priority: '1.0'
  });

  urls.push({
    loc: `${siteUrl}/anime`,
    changefreq: 'daily',
    priority: '0.9'
  });

  urls.push({
    loc: `${siteUrl}/anime/catalog`,
    changefreq: 'weekly',
    priority: '0.8'
  });

  urls.push({
    loc: `${siteUrl}/blog`,
    changefreq: 'daily',
    priority: '0.8'
  });

  // 2. Curated vibes & tag pages
  for (const vibe of vibes) {
    urls.push({
      loc: `${siteUrl}/anime/tag/${vibe.slug}`,
      changefreq: 'weekly',
      priority: '0.7'
    });
  }

  // 3. Dynamic Anime Detail Pages and their active tabs
  for (const anime of animeList) {
    const animeLastMod = formatDate(anime.lastUpdated) || formatDate(anime.addedDate);

    // Root anime detail page
    urls.push({
      loc: `${siteUrl}/anime/${anime.slug}`,
      lastmod: animeLastMod,
      changefreq: 'weekly',
      priority: '0.8'
    });

    // Sub-page tabs that have content and are set to Show in section_visibility
    const tabs = getAvailableTabs(anime);
    for (const tab of tabs) {
      urls.push({
        loc: `${siteUrl}/anime/${anime.slug}/${tab.key}`,
        lastmod: animeLastMod,
        changefreq: 'weekly',
        priority: '0.7'
      });
    }
  }

  // 4. Published Blog posts
  for (const post of blogPosts) {
    const postLastMod = formatDate(post.lastUpdated) || formatDate(post.publishedDate);
    urls.push({
      loc: `${siteUrl}/blog/${post.slug}`,
      lastmod: postLastMod,
      changefreq: 'monthly',
      priority: '0.7'
    });
  }

  // 5. Legal & static reference pages
  const staticPages = [
    { path: '/about', priority: '0.5', changefreq: 'monthly' },
    { path: '/contact', priority: '0.4', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.3', changefreq: 'monthly' },
    { path: '/terms', priority: '0.3', changefreq: 'monthly' },
    { path: '/disclaimer', priority: '0.3', changefreq: 'monthly' },
    { path: '/dmca', priority: '0.3', changefreq: 'monthly' }
  ];

  for (const p of staticPages) {
    urls.push({
      loc: `${siteUrl}${p.path}`,
      changefreq: p.changefreq,
      priority: p.priority
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}${u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : ''}${u.priority ? `\n    <priority>${u.priority}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
}
