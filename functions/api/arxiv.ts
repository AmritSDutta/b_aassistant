export async function onRequestGet(context: { request: Request }): Promise<Response> {
  const incoming = new URL(context.request.url);
  const upstream = `https://export.arxiv.org/api/query${incoming.search}`;

  try {
    const response = await fetch(upstream, { headers: { Accept: 'application/atom+xml' } });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        'content-type': 'application/atom+xml; charset=utf-8',
        'access-control-allow-origin': '*',
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ results: [], unavailable: true, error: String((error as Error)?.message || error) }),
      {
        status: 502,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      }
    );
  }
}
