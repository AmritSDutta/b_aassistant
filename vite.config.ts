import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { searchDuckDuckGo } from './src/lib/ddgSearch';
import { searchTavilyKeyless } from './src/lib/tavilySearch';

const ALLOWED_PROXY_HOSTS = new Set([
  'ollama.com',
  'generativelanguage.googleapis.com',
  'api.mistral.ai',
  'api.openai.com',
  'openai.com',
  'router.requesty.ai',
  'requesty.ai',
  'api.duckduckgo.com',
  'html.duckduckgo.com',
  'duckduckgo.com',
  'lite.duckduckgo.com',
  'api.tavily.com',
]);

function isAllowedProxyTarget(targetUrl: string): boolean {
  try {
    const url = new URL(targetUrl);
    const host = url.hostname.toLowerCase();
    const isHttpLocal = (url.protocol === 'http:' || url.protocol === 'https:') && (host === 'localhost' || host === '127.0.0.1');
    const isHttpsAllowed = url.protocol === 'https:' && (
      ALLOWED_PROXY_HOSTS.has(host) ||
      [...ALLOWED_PROXY_HOSTS].some((allowed) => host.endsWith('.' + allowed))
    );
    return isHttpLocal || isHttpsAllowed;
  } catch {
    return false;
  }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dev-api-endpoints',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url) return next();

          // 1. Web search endpoint
          if (req.url.startsWith('/api/websearch')) {
            const requestUrl = new URL(req.url, 'http://localhost');
            const query = requestUrl.searchParams.get('query') || '';
            const send = (status: number, payload: unknown) => {
              res.statusCode = status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(payload));
            };

            // 1a. Try Keyless Tavily Search first
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

            // 1b. Fallback to DuckDuckGo HTML scraper
            try {
              return send(200, { results: await searchDuckDuckGo(query), fetchedAt: new Date().toISOString(), source: 'duckduckgo' });
            } catch (error: any) {
              return send(502, { results: [], unavailable: true, error: String(error?.message || error) });
            }
          }

          // 2. Proxy endpoint for CORS-restricted APIs (Ollama Cloud, etc.)
          if (req.url.startsWith('/api/proxy')) {
            if (req.method === 'OPTIONS') {
              res.statusCode = 204;
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', '*');
              return res.end();
            }

            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'Method not allowed. Use POST or OPTIONS.' }));
            }

            let bodyBuffer = '';
            req.on('data', (chunk: Buffer | string) => {
              bodyBuffer += chunk.toString();
            });

            req.on('end', async () => {
              try {
                const { targetUrl, body, headers, method: reqMethod } = JSON.parse(bodyBuffer || '{}');
                if (!targetUrl || typeof targetUrl !== 'string') {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: 'Missing or invalid targetUrl' }));
                }

                if (!isAllowedProxyTarget(targetUrl)) {
                  res.statusCode = 403;
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  return res.end(
                    JSON.stringify({
                      error: `Blocked: target host is not on the proxy allow-list`,
                    })
                  );
                }

                const forwardHeaders: Record<string, string> = {
                  'Content-Type': 'application/json',
                };
                if (headers?.Authorization) {
                  forwardHeaders.Authorization = headers.Authorization;
                }
                if (headers?.['X-Title']) {
                  forwardHeaders['X-Title'] = headers['X-Title'];
                }
                if (headers?.['HTTP-Referer']) {
                  forwardHeaders['HTTP-Referer'] = headers['HTTP-Referer'];
                }

                const method = (reqMethod || (body !== undefined ? 'POST' : 'GET')).toUpperCase();
                const fetchOptions: RequestInit = {
                  method,
                  headers: forwardHeaders,
                };
                if (method !== 'GET' && method !== 'HEAD' && body !== undefined) {
                  fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
                }

                const upstream = await fetch(targetUrl, fetchOptions);
                const upstreamText = await upstream.text();
                res.statusCode = upstream.status;
                res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', '*');
                res.end(upstreamText);
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ error: err?.message || 'Proxy request failed' }));
              }
            });
            return;
          }

          next();
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
