export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
  fetchedAt: string;
  source: string;
}

export interface ResearchSearchResult {
  title: string;
  summary: string;
  authors: string[];
  id: string;
  fetchedAt: string;
  source: string;
}

export interface SearchOutcome<T> {
  results: T[];
  fetchedAt: string;
  source: string;
  unavailable?: boolean;
  error?: string;
}

async function fetchWithTimeout(url: string, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function searchWeb(query: string): Promise<SearchOutcome<WebSearchResult>> {
  const fetchedAt = new Date().toISOString();
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return { results: [], fetchedAt, source: 'tavily' };
  }

  try {
    const response = await fetchWithTimeout(`/api/websearch?query=${encodeURIComponent(trimmed)}`);
    if (!response.ok) {
      throw new Error(`Search endpoint responded with status ${response.status}`);
    }
    const data = (await response.json()) as {
      results?: Array<{ title: string; snippet: string; url: string }>;
      source?: string;
    };
    const source = data.source || 'duckduckgo';
    const results = (data.results || []).map((r) => ({ ...r, fetchedAt, source }));
    return { results: results.slice(0, 5), fetchedAt, source };
  } catch (error: any) {
    console.warn('searchWeb error:', error);
    return {
      results: [],
      fetchedAt,
      source: 'duckduckgo',
      unavailable: true,
      error: String(error?.message || error),
    };
  }
}

export async function searchResearch(query: string): Promise<SearchOutcome<ResearchSearchResult>> {
  const fetchedAt = new Date().toISOString();
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return { results: [], fetchedAt, source: 'arxiv' };
  }

  const url = `/api/arxiv?search_query=all:${encodeURIComponent(trimmed)}&start=0&max_results=5`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`ArXiv endpoint responded with status ${response.status}`);
    }

    const xmlText = await response.text();
    const parsed: Array<Omit<ResearchSearchResult, 'fetchedAt' | 'source'>> = [];

    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      const entries = doc.getElementsByTagName('entry');

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const title = entry.getElementsByTagName('title')[0]?.textContent?.replace(/\s+/g, ' ').trim() || '';
        const summary = entry.getElementsByTagName('summary')[0]?.textContent?.replace(/\s+/g, ' ').trim() || '';
        const id = entry.getElementsByTagName('id')[0]?.textContent?.trim() || '';

        const authorNodes = entry.getElementsByTagName('author');
        const authors: string[] = [];
        for (let j = 0; j < authorNodes.length; j++) {
          const name = authorNodes[j].getElementsByTagName('name')[0]?.textContent?.trim();
          if (name) authors.push(name);
        }

        parsed.push({ title, summary, authors, id });
      }
    } else {
      const entryBlocks = xmlText.split('<entry>').slice(1);
      for (const block of entryBlocks) {
        const titleMatch = block.match(/<title>([^<]+)<\/title>/);
        const summaryMatch = block.match(/<summary>([^<]+)<\/summary>/);
        const idMatch = block.match(/<id>([^<]+)<\/id>/);

        parsed.push({
          title: titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Unknown Paper',
          summary: summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim() : '',
          authors: [],
          id: idMatch ? idMatch[1].trim() : '',
        });
      }
    }

    const results = parsed.slice(0, 5).map((r) => ({ ...r, fetchedAt, source: 'arxiv' }));
    return { results, fetchedAt, source: 'arxiv' };
  } catch (error: any) {
    console.warn('searchResearch error:', error);
    return {
      results: [],
      fetchedAt,
      source: 'arxiv',
      unavailable: true,
      error: String(error?.message || error),
    };
  }
}
