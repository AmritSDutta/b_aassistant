import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { searchDuckDuckGo } from './src/lib/ddgSearch';
import { searchTavilyKeyless } from './src/lib/tavilySearch';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dev-search-endpoints',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url || !req.url.startsWith('/api/websearch')) return next();

          const requestUrl = new URL(req.url, 'http://localhost');
          const query = requestUrl.searchParams.get('query') || '';
          const send = (status: number, payload: unknown) => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(payload));
          };

          // 1. Try Keyless Tavily Search first
          try {
            const tavilyResults = await searchTavilyKeyless(query);
            if (tavilyResults && tavilyResults.length > 0) {
              return send(200, {
                results: tavilyResults,
                fetchedAt: new Date().toISOString(),
                source: 'tavily',
              });
            }
          } catch (tavilyErr) {
            console.warn('Tavily search failed or rate-limited in dev, falling back to DuckDuckGo:', tavilyErr);
          }

          // 2. Fallback to DuckDuckGo HTML scraper
          try {
            send(200, { results: await searchDuckDuckGo(query), fetchedAt: new Date().toISOString(), source: 'duckduckgo' });
          } catch (error: any) {
            send(502, { results: [], unavailable: true, error: String(error?.message || error) });
          }
        });
      },
    },
  ],
  server: {
    proxy: {
      '/api/arxiv': {
        target: 'https://export.arxiv.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/arxiv/, '/api/query'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
