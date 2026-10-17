import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchWeb, searchResearch } from '../lib/searchService';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('Search Service', () => {
  it('returns empty results for empty search queries', async () => {
    const webOutcome = await searchWeb('');
    expect(webOutcome.results).toEqual([]);

    const researchOutcome = await searchResearch('');
    expect(researchOutcome.results).toEqual([]);
  });

  it('returns live web results with a freshness timestamp', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ title: 'Result', snippet: 'Snippet', url: 'https://example.com' }] }),
    } as any);

    const outcome = await searchWeb('test query');
    expect(outcome.unavailable).toBeFalsy();
    expect(outcome.results.length).toBe(1);
    expect(outcome.results[0].title).toBe('Result');
    expect(outcome.results[0].fetchedAt).toBeTruthy();
    expect(outcome.results[0].source).toBe('duckduckgo');
  });

  it('reports unavailability instead of fabricating results on network error (web)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const outcome = await searchWeb('test query');
    expect(outcome.results).toEqual([]);
    expect(outcome.unavailable).toBe(true);
    expect(outcome.error).toBeTruthy();
  });

  it('parses arXiv XML results with a freshness timestamp', async () => {
    const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Quantum Paper</title><summary>About quantum</summary><id>https://arxiv.org/abs/1</id><author><name>Jane Doe</name></author></entry></feed>`;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => xml } as any);

    const outcome = await searchResearch('quantum computing');
    expect(outcome.results.length).toBe(1);
    expect(outcome.results[0].title).toContain('Quantum Paper');
    expect(outcome.results[0].id).toContain('arxiv.org');
    expect(outcome.results[0].fetchedAt).toBeTruthy();
    expect(outcome.results[0].source).toBe('arxiv');
  });

  it('reports unavailability instead of fabricating results on network error (research)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const outcome = await searchResearch('quantum computing');
    expect(outcome.results).toEqual([]);
    expect(outcome.unavailable).toBe(true);
  });
});
