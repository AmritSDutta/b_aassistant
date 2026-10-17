import { searchDuckDuckGo } from '../../src/lib/ddgSearch';

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': 'no-store' },
  });
}

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  const incoming = new URL(context.request.url);
  const query = incoming.searchParams.get('query') || '';

  try {
    const results = await searchDuckDuckGo(query);
    return json({ results, fetchedAt: new Date().toISOString(), source: 'duckduckgo' });
  } catch (error) {
    return json(
      { results: [], unavailable: true, error: String((error as Error)?.message || error) },
      502
    );
  }
}
