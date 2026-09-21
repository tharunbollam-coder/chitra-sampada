import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { adminApiPlugin } from './src/lib/admin-api-plugin.js';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss(), adminApiPlugin()],
  },
});

