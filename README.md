# Chitra Sampada

Chitra Sampada is an Astro site for anime guides, watch orders, filler lists, and editorial articles. Public pages and the admin run on Cloudflare Workers, with D1 for site content.

## Build, check, and preview

Run these commands from the project root with Node.js 22.12 or later and npm.

```sh
npm ci
npm run build
npx astro check
npm run preview -- --background
```

The build writes the Worker and static assets to `dist/`. Astro Check reports TypeScript and Astro diagnostics separately from the build. Preview serves the built project locally in the Cloudflare Workers runtime. Open the URL printed by Astro and use `npm run astro -- preview stop` when finished. Rebuild after editing source files. Pages that use D1 need a configured local binding with data to show the full site.

For development with live reload, start Astro in the background using `npm run dev -- --background`. Use `npm run astro -- dev status`, `npm run astro -- dev logs`, and `npm run astro -- dev stop` to manage it.

## Separate D1 maintenance

- `npm run db:pull` exports production data and replaces the local D1 state.
- `npm run db:push` applies production migrations and imports local data into production D1.

Run these maintenance commands only when you intend to change the destination database. Build, check, and preview do not require running either sync command.
