import { describe, it, expect, vi } from 'vitest';
import { searchWeb, searchResearch } from '../lib/searchService';

describe('Search Service', () => {
  it('returns empty array for empty search queries', async () => {
    const webRes = await searchWeb('');
    expect(webRes).toEqual([]);

    const researchRes = await searchResearch('');
    expect(researchRes).toEqual([]);
  });

  it('provides graceful fallback preview on network error in searchWeb', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const res = await searchWeb('test query');
    expect(res.length).toBe(1);
    expect(res[0].title).toContain('test query');
    expect(res[0].url).toContain('duckduckgo.com');

    globalThis.fetch = originalFetch;
  });

  it('provides graceful fallback preview on network error in searchResearch', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const res = await searchResearch('quantum computing');
    expect(res.length).toBe(1);
    expect(res[0].title).toContain('quantum computing');
    expect(res[0].id).toContain('arxiv.org');

    globalThis.fetch = originalFetch;
  });
});
