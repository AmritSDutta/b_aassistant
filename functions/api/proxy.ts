/**
 * Cloudflare Pages Function: /api/proxy
 * Handles external AI API requests (such as Ollama Cloud or Gemini endpoints)
 * when deployed on Cloudflare Pages without CORS limitations.
 *
 * Security: Only HTTPS requests to allow-listed hosts are forwarded.
 */

interface Env {}

const ALLOWED_TARGET_HOSTS = new Set([
  'ollama.com',
  'generativelanguage.googleapis.com',
  'api.mistral.ai',
  'api.openai.com',
  'openai.com',
  'router.requesty.ai',
  'requesty.ai',
  'api.tokenfactory.nebius.com',
  'api.duckduckgo.com',
  'html.duckduckgo.com',
  'duckduckgo.com',
  'lite.duckduckgo.com',
  'api.tavily.com',
]);

function isAllowedTarget(targetUrl: string): boolean {
  try {
    const url = new URL(targetUrl);
    return (
      url.protocol === 'https:' &&
      (ALLOWED_TARGET_HOSTS.has(url.hostname.toLowerCase()) ||
        [...ALLOWED_TARGET_HOSTS].some((host) => url.hostname.toLowerCase().endsWith('.' + host)))
    );
  } catch {
    return false;
  }
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const { targetUrl, body, headers, method: reqMethod } = (await context.request.json()) as {
      targetUrl: string;
      body?: any;
      headers?: Record<string, string>;
      method?: string;
    };

    if (!targetUrl || typeof targetUrl !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid targetUrl' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!isAllowedTarget(targetUrl)) {
      return new Response(
        JSON.stringify({
          error: `Blocked: target host is not on the proxy allow-list (allowed: ${[...ALLOWED_TARGET_HOSTS].join(', ')})`,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (headers && typeof headers.Authorization === 'string' && headers.Authorization) {
      forwardHeaders.Authorization = headers.Authorization;
    }
    if (headers && typeof headers['X-Title'] === 'string') {
      forwardHeaders['X-Title'] = headers['X-Title'];
    }
    if (headers && typeof headers['HTTP-Referer'] === 'string') {
      forwardHeaders['HTTP-Referer'] = headers['HTTP-Referer'];
    }

    const method =
      typeof reqMethod === 'string' && reqMethod
        ? reqMethod.toUpperCase()
        : body !== undefined
        ? 'POST'
        : 'GET';

    const fetchOptions: RequestInit = {
      method,
      headers: forwardHeaders,
    };
    if (method !== 'GET' && method !== 'HEAD' && body !== undefined) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const upstreamResponse = await fetch(targetUrl, fetchOptions);
    const data = await upstreamResponse.text();

    return new Response(data, {
      status: upstreamResponse.status,
      headers: {
        'Content-Type': upstreamResponse.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Proxy request failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
