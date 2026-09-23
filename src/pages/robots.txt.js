import { siteConfig } from '../config/site.js';

export function GET() {
  const siteUrl = (siteConfig.siteUrl || 'https://chitrasampada.com').replace(/\/+$/, '');

  const content = `# Robots.txt for Chitra Sampada
# https://chitrasampada.com

User-agent: *
Allow: /

# Disallow internal admin and backend API routes
Disallow: /admin
Disallow: /admin/
Disallow: /api/

# Sitemap location
Sitemap: ${siteUrl}/sitemap.xml
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
