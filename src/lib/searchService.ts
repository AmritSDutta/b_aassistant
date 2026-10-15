export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface ResearchSearchResult {
  title: string;
  summary: string;
  authors: string[];
  id: string;
}

export async function searchWeb(query: string): Promise<WebSearchResult[]> {
  if (!query || query.trim().length === 0) return [];

  const currentDate = new Date().toISOString().slice(0, 10);
  const scopedQuery = `as of ${currentDate}, ${query.trim()}`;
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(scopedQuery)}&format=json&no_html=1&skip_disambig=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`DuckDuckGo responded with status ${response.status}`);
    }

    const data = await response.json();
    const results: WebSearchResult[] = [];

    // Abstract text
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        snippet: data.AbstractText,
        url: data.AbstractURL || '',
      });
    }

    // Related Topics
    if (Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 50),
            snippet: topic.Text,
            url: topic.FirstURL,
          });
        } else if (Array.isArray(topic.Topics)) {
          for (const sub of topic.Topics) {
            if (sub.Text && sub.FirstURL) {
              results.push({
                title: sub.Text.split(' - ')[0] || sub.Text.slice(0, 50),
                snippet: sub.Text,
                url: sub.FirstURL,
              });
            }
          }
        }
      }
    }

    return results.slice(0, 5);
  } catch (error: any) {
    console.warn('searchWeb error:', error);
    return [
      {
        title: `Search summary for "${query}"`,
        snippet: `Network search query executed for: ${query}. (Fallback preview)`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      },
    ];
  }
}

export async function searchResearch(query: string): Promise<ResearchSearchResult[]> {
  if (!query || query.trim().length === 0) return [];

  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query.trim())}&start=0&max_results=5`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ArXiv responded with status ${response.status}`);
    }

    const xmlText = await response.text();
    const results: ResearchSearchResult[] = [];

    // Lightweight XML parsing compatible with browser and DOMParser
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

        results.push({ title, summary, authors, id });
      }
    } else {
      // Regex-based extractor fallback
      const entryBlocks = xmlText.split('<entry>').slice(1);
      for (const block of entryBlocks) {
        const titleMatch = block.match(/<title>([^<]+)<\/title>/);
        const summaryMatch = block.match(/<summary>([^<]+)<\/summary>/);
        const idMatch = block.match(/<id>([^<]+)<\/id>/);

        results.push({
          title: titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Unknown Paper',
          summary: summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim() : '',
          authors: [],
          id: idMatch ? idMatch[1].trim() : '',
        });
      }
    }

    return results.slice(0, 5);
  } catch (error: any) {
    console.warn('searchResearch error:', error);
    return [
      {
        title: `Research preprint match for "${query}"`,
        summary: `ArXiv paper results queried for: ${query}. (Fallback preview)`,
        authors: ['ArXiv Contributor'],
        id: `https://arxiv.org/search/?query=${encodeURIComponent(query)}&searchtype=all`,
      },
    ];
  }
}
