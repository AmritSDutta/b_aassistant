import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyUrlReachability } from '../components/ReferenceUrls';

describe('verifyUrlReachability', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('resolves true when endpoint is reachable', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      type: 'opaque',
      status: 0,
      ok: false,
    } as Response);

    const result = await verifyUrlReachability('https://example.com/docs');
    expect(result.reachable).toBe(true);
    expect(result.error).toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/docs', {
      method: 'GET',
      mode: 'no-cors',
      signal: expect.any(AbortSignal),
    });
  });

  it('returns false and error message when network request fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await verifyUrlReachability('https://non-existent-domain-12345.org');
    expect(result.reachable).toBe(false);
    expect(result.error).toContain('URL is unreachable or network failed');
  });

  it('returns false with timeout message when request aborts', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    globalThis.fetch = vi.fn().mockRejectedValue(abortError);

    const result = await verifyUrlReachability('https://hanging-domain.org', 100);
    expect(result.reachable).toBe(false);
    expect(result.error).toContain('Connection timed out');
  });
});
