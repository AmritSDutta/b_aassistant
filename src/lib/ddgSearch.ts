export interface RawSearchResult {
  title: string;
  snippet: string;
  url: string;
}

const DDG_HTML_ENDPOINT = 'https://html.duckduckgo.com/html/';
const DDG_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, '');
}

function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clean(input: string): string {
  return decodeEntities(stripTags(input));
}

function extractRealUrl(href: string): string {
  const uddg = href.match(/[?&]uddg=([^&]+)/);
  if (uddg) {
    try {
      return decodeURIComponent(uddg[1]);
    } catch {
      return href;
    }
  }
  if (href.startsWith('//')) return `https:${href}`;
  return href;
}

export async function searchDuckDuckGo(query: string, limit = 5): Promise<RawSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `${DDG_HTML_ENDPOINT}?q=${encodeURIComponent(trimmed)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': DDG_USER_AGENT,
      Accept: 'text/html',
    },
  });
  if (!response.ok) {
    throw new Error(`DuckDuckGo responded with status ${response.status}`);
  }

  const html = await response.text();

  const snippets: string[] = [];
  const snippetRe = /<a\b[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let snippetMatch: RegExpExecArray | null;
  while ((snippetMatch = snippetRe.exec(html)) !== null) {
    snippets.push(clean(snippetMatch[1]));
  }

  const anchorRe = /<a\b([^>]*class="[^"]*result__a[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi;
  const results: RawSearchResult[] = [];
  let anchorMatch: RegExpExecArray | null;
  while ((anchorMatch = anchorRe.exec(html)) !== null && results.length < limit) {
    const hrefMatch = anchorMatch[1].match(/href="([^"]+)"/i);
    const rawUrl = hrefMatch ? extractRealUrl(hrefMatch[1]) : '';
    if (!rawUrl) continue;
    results.push({
      title: clean(anchorMatch[2]) || rawUrl,
      snippet: snippets[results.length] || '',
      url: rawUrl,
    });
  }

  return results;
}
