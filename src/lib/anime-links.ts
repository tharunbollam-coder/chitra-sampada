import { siteConfig } from '../config/site.js';
import { ANIME_TABS } from './anime-tabs.js';

const siteOrigin = new URL(siteConfig.siteUrl).origin;
const legacyTabs = [...Object.keys(ANIME_TABS), 'my-take', 'filler'];
const legacyTabPath = new RegExp(`^(/anime/(?!tag/)[^/]+)/(?:${legacyTabs.join('|')})/?$`);

export function isLegacyAnimeTab(tab: string): boolean {
  return legacyTabs.includes(tab);
}

export function canonicalizeAnimeTabHref(href: string, baseUrl = siteOrigin): string {
  if (!href.includes('/anime/')) return href;

  const url = URL.parse(href, baseUrl);
  if (!url || url.origin !== siteOrigin) return href;

  const animePath = url.pathname.match(legacyTabPath)?.[1];
  return animePath ? `${animePath}${url.search}` : href;
}
