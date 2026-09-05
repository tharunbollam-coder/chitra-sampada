/**
 * Global site configuration
 * You can customize the site name and branding here.
 */
export const siteConfig = {
  // Change this to your preferred brand name:
  name: 'Chitra Sampada',
  shortName: 'Chitra',
  tagline: 'A personal list of what to watch and in what order, clearly labeled.',
  subTagline: 'A personal companion for what to watch and where to start.',
  description: 'A personal entertainment list focusing on what I have watched and what is next on my watchlist, with clear watch orders and filler guides.',

  navLinks: [
    {
      name: 'Anime',
      href: '/anime',
      status: 'live',
      badge: 'LIVE',
      description: 'Filler lists, watch orders, and what I’ve watched'
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
    editorialPledge: 'I only list what I have personally watched and what is currently on my watchlist, clearly labeled so you always know where each recommendation comes from.'
  }
};
