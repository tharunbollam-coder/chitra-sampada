/**
 * Global site configuration
 * You can customize the site name and branding here.
 */
export const siteConfig = {
  // Change this to your preferred brand name:
  name: 'Chitra Sampada',
  shortName: 'Chitra',
  tagline: 'Honest, no-fluff guides. Filler-free watch orders, real recommendations, nothing sugar-coated.',
  subTagline: 'The ultimate entertainment companion before and while you watch.',
  description: 'An entertainment discovery hub built for real viewers. Filler-free watch orders, transparent editor badges, and genuine vibe-driven curation.',

  navLinks: [
    {
      name: 'Anime',
      href: '/anime',
      status: 'live',
      badge: 'LIVE',
      description: 'Filler breakdowns, watch orders, and honest verdicts'
    },
    {
      name: 'Movies',
      href: '#',
      status: 'soon',
      badge: 'COMING SOON',
      description: 'Franchise chronological orders & real viewing guides'
    },
    {
      name: 'TV Shows',
      href: '#',
      status: 'soon',
      badge: 'COMING SOON',
      description: 'Season-by-season honesty meters & binge guides'
    },
    {
      name: 'Web Series',
      href: '#',
      status: 'soon',
      badge: 'COMING SOON',
      description: 'Deep dives, platform trackers, and curated gems'
    }
  ],

  footer: {
    tmdbAttribution: 'This product uses the TMDB API but is not endorsed or certified by TMDB. Posters and imagery are sourced via TMDB.',
    copyrightNotice: 'All titles, character names, imagery, and related media are copyright and trademarks of their respective owners and production studios.',
    editorialPledge: 'We never accept paid promotions to sugar-coat ratings. What we watch is marked with our verified editor badge; what is in queue is transparently flagged.'
  }
};
