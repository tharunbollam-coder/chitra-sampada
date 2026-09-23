/**
 * Global site configuration
 * You can customize the site name and branding here.
 */
export const siteConfig = {
  siteUrl: 'https://chitrasampada.com',
  // Change this to your preferred brand name:
  name: 'Chitra Sampada',
  shortName: 'Chitra',
  tagline: 'An honest entertainment companion with carefully researched watch orders and filler guides, clearly labeled.',
  subTagline: 'An honest companion for watch orders, filler guides, and viewer context.',
  description: 'An honest entertainment reference guide featuring carefully researched watch orders, filler lists, and viewer context across watched titles, watchlist queues, and compiled reference guides.',
  contactEmail: 'suggestions@chitrasampada.com',
  policyLastUpdated: 'September 15, 2026',

  navLinks: [
    {
      name: 'Anime',
      href: '/anime',
      status: 'live',
      badge: 'LIVE',
      description: 'Filler lists, watch orders, and honest status guides'
    },
    {
      name: 'Blog',
      href: '/blog',
      status: 'live',
      badge: '',
      description: 'Articles, pacing breakdowns, and watch guides'
    },
    {
      name: 'About',
      href: '/about',
      status: 'live',
      badge: '',
      description: 'Why I built this and how it works'
    }
  ],

  footer: {
    tmdbAttribution: 'This product uses the TMDB API but is not endorsed or certified by TMDB. Posters and imagery are sourced via TMDB.',
    copyrightNotice: 'All titles, character names, imagery, and related media are copyright and trademarks of their respective owners and production studios.',
    editorialPledge: 'Every title is transparently classified under one of three clear categories: what I have personally watched, what is on my watchlist, and compiled reference guides — so you always know exactly what context you are getting.'
  }
};
