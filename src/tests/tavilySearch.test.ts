import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchTavilyKeyless } from '../lib/tavilySearch';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('Tavily Keyless Search', () => {
  it('returns an empty array for empty or whitespace queries without fetching', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const res1 = await searchTavilyKeyless('');
    const res2 = await searchTavilyKeyless('   ');

    expect(res1).toEqual([]);
    expect(res2).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends correct headers, endpoint, and keyless access mode', async () => {
    let capturedUrl = '';
    let capturedOptions: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      capturedUrl = url;
      capturedOptions = opts;
      return {
        ok: true,
        json: async () => ({
          results: [
            {
              title: 'AI Insights',
              content: 'Clean parsed LLM summary',
              url: 'https://example.com/ai',
              score: 0.95,
            },
          ],
        }),
      } as any;
    });

    const results = await searchTavilyKeyless('agent tools', 3);

    expect(capturedUrl).toBe('https://api.tavily.com/search');
    expect(capturedOptions.method).toBe('POST');
    expect(capturedOptions.headers['Content-Type']).toBe('application/json');
    expect(capturedOptions.headers['X-Tavily-Access-Mode']).toBe('keyless');

    const parsedBody = JSON.parse(capturedOptions.body);
    expect(parsedBody.query).toBe('agent tools');
    expect(parsedBody.max_results).toBe(3);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('AI Insights');
    expect(results[0].snippet).toBe('Clean parsed LLM summary');
    expect(results[0].url).toBe('https://example.com/ai');
    expect(results[0].score).toBe(0.95);
  });

  it('handles fallback titles when title is missing in Tavily output', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            content: 'Snippet only',
            url: 'https://example.com/page',
          },
        ],
      }),
    } as any);

    const results = await searchTavilyKeyless('query');
    expect(results[0].title).toBe('https://example.com/page');
    expect(results[0].snippet).toBe('Snippet only');
  });

  it('throws an error when Tavily returns non-200 status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    } as any);

    await expect(searchTavilyKeyless('query')).rejects.toThrow('Tavily search responded with status 429');
  });

  it('handles empty results array gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    } as any);

    const results = await searchTavilyKeyless('query');
    expect(results).toEqual([]);
  });
});
