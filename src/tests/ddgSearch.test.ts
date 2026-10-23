import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseDdgHtml, searchDuckDuckGo } from '../lib/ddgSearch';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

const uddg = (target: string) =>
  `//duckduckgo.com/l/?uddg=${encodeURIComponent(target)}&rut=abc123`;

function block(opts: {
  cls?: string;
  href: string;
  title: string;
  snippet?: string;
}): string {
  const cls = opts.cls ?? 'result results_links results_links_deep web-result';
  const snippet =
    opts.snippet === undefined
      ? ''
      : `<a class="result__snippet" href="${opts.href}">${opts.snippet}</a>`;
  return (
    `<div class="${cls}"><div class="result__body">` +
    `<h2 class="result__title"><a rel="nofollow" class="result__a" href="${opts.href}">${opts.title}</a></h2>` +
    `${snippet}</div></div>`
  );
}

function page(...blocks: string[]): string {
  return `<html><body><div class="results">${blocks.join('')}</div></body></html>`;
}

describe('parseDdgHtml', () => {
  it('parses title, real URL, and snippet from each result', () => {
    const html = page(
      block({ href: uddg('https://example.com/one'), title: 'First <b>Result</b>', snippet: 'First snippet' }),
      block({ href: uddg('https://example.com/two'), title: 'Second Result', snippet: 'Second snippet' })
    );

    const results = parseDdgHtml(html);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      title: 'First Result',
      snippet: 'First snippet',
      url: 'https://example.com/one',
    });
    expect(results[1]).toEqual({
      title: 'Second Result',
      snippet: 'Second snippet',
      url: 'https://example.com/two',
    });
  });

  it('keeps each snippet with its own block and ignores stray snippets (regression)', () => {
    // A snippet anchor sits outside any result block; a later result has no snippet.
    const stray = `<a class="result__snippet" href="#">STRAY</a>`;
    const html =
      `<html><body>` +
      stray +
      block({ href: uddg('https://example.com/a'), title: 'A' }) +
      block({ href: uddg('https://example.com/b'), title: 'B', snippet: 'B snippet' }) +
      `</body></html>`;

    const results = parseDdgHtml(html);

    expect(results).toHaveLength(2);
    expect(results[0].snippet).toBe('');
    expect(results[1].snippet).toBe('B snippet');
  });

  it('decodes named and numeric HTML entities', () => {
    const html = page(
      block({
        href: uddg('https://example.com/enc'),
        title: 'A &amp; B &#39;quoted&#39;',
        snippet: 'slash &#x2F; dash &mdash; end',
      })
    );

    const [result] = parseDdgHtml(html);
    expect(result.title).toBe("A & B 'quoted'");
    expect(result.snippet).toBe('slash / dash — end');
  });

  it('drops DuckDuckGo ad/redirect links but keeps real results', () => {
    const html = page(
      block({ cls: 'result result--ad', href: '//duckduckgo.com/y.js?ad=1', title: 'Sponsored', snippet: 'Ad' }),
      block({ href: uddg('https://example.com/real'), title: 'Real', snippet: 'Real snippet' })
    );

    const results = parseDdgHtml(html);
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('https://example.com/real');
  });

  it('drops non-http(s) URLs after redirect unwrapping', () => {
    const html = page(
      block({ href: uddg('javascript:alert(1)'), title: 'Bad', snippet: 'Bad' }),
      block({ href: uddg('https://example.com/ok'), title: 'Good', snippet: 'Good' })
    );

    const results = parseDdgHtml(html);
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('https://example.com/ok');
  });

  it('respects the limit', () => {
    const html = page(
      block({ href: uddg('https://example.com/1'), title: 'One' }),
      block({ href: uddg('https://example.com/2'), title: 'Two' }),
      block({ href: uddg('https://example.com/3'), title: 'Three' })
    );

    expect(parseDdgHtml(html, 2)).toHaveLength(2);
  });

  it('returns an empty array for empty input', () => {
    expect(parseDdgHtml('')).toEqual([]);
    expect(parseDdgHtml('<html><body>No results.</body></html>')).toEqual([]);
  });
});

describe('searchDuckDuckGo', () => {
  it('returns an empty array for blank queries without fetching', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as any;

    expect(await searchDuckDuckGo('')).toEqual([]);
    expect(await searchDuckDuckGo('   ')).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('parses results from an OK response', async () => {
    const html = page(block({ href: uddg('https://example.com/x'), title: 'X', snippet: 'x snippet' }));
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => html } as any);

    const results = await searchDuckDuckGo('query');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ title: 'X', snippet: 'x snippet', url: 'https://example.com/x' });
  });

  it('throws on a non-OK response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 } as any);
    await expect(searchDuckDuckGo('query')).rejects.toThrow('DuckDuckGo responded with status 429');
  });

  it('throws on a bot-challenge page instead of returning an empty success', async () => {
    const challenge =
      '<html><body><div id="anomaly-modal">Unfortunately, bots use DuckDuckGo too.</div></body></html>';
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => challenge } as any);

    await expect(searchDuckDuckGo('query')).rejects.toThrow(/bot-challenge/i);
  });
});
