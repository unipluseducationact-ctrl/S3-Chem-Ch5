import { defineConfig } from 'vite';

export default defineConfig({
  // Relative URLs so the built site works on GitHub Pages project sites
  // (e.g. …/S3-CH5-table/) as well as at domain root and on Vite dev server.
  base: './',
  server: {
    headers: {
      // iPad Safari can aggressively cache; ensure refresh pulls latest dev bundle.
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
    proxy: {
      // Proxy all /api/chem requests to the chemistry API server
      '/api/chem': {
        target: 'http://10.0.0.149:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/chem/, ''),
      },
    },
  },
});
