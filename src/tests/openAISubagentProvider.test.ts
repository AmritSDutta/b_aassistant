import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAISubagentProvider } from '../voice/providers/openAISubagentProvider';
import { createSubagentProvider } from '../voice';

describe('OpenAISubagentProvider', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('has provider name "OpenAI Subagent"', () => {
    const provider = new OpenAISubagentProvider({ apiKey: 'sk-test' });
    expect(provider.name).toBe('OpenAI Subagent');
  });

  it('throws error when apiKey is empty', async () => {
    const provider = new OpenAISubagentProvider({ apiKey: '' });
    await expect(provider.generateText('hello')).rejects.toThrow('OpenAI API key is required');
  });

  it('defaults to gpt-6-luna and routes request through /api/proxy with Bearer auth', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'gpt-6-luna architecture response' } }],
      }),
    });
    globalThis.fetch = mockFetch;

    const provider = new OpenAISubagentProvider({
      apiKey: 'sk-proj-test1234',
    });

    const result = await provider.generateText('Design auth pipeline', 'System instruction');

    expect(result).toBe('gpt-6-luna architecture response');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/proxy',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: 'https://api.openai.com/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer sk-proj-test1234',
          },
          body: {
            model: 'gpt-6-luna',
            messages: [
              { role: 'system', content: 'System instruction' },
              { role: 'user', content: 'Design auth pipeline' },
            ],
          },
        }),
      })
    );
  });

  it('supports gpt-5-nano model and omit empty system prompt', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'nano response' } }],
      }),
    });
    globalThis.fetch = mockFetch;

    const provider = new OpenAISubagentProvider({
      apiKey: 'sk-nano-key',
      model: 'gpt-5-nano',
    });

    const result = await provider.generateText('Draw box');
    expect(result).toBe('nano response');

    const fetchCall = mockFetch.mock.calls[0];
    const parsedBody = JSON.parse(fetchCall[1].body);
    expect(parsedBody.body.model).toBe('gpt-5-nano');
    expect(parsedBody.body.messages).toHaveLength(1);
    expect(parsedBody.body.messages[0]).toEqual({ role: 'user', content: 'Draw box' });
  });

  it('translates 401 Unauthorized into descriptive error message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Incorrect API key provided',
    });

    const provider = new OpenAISubagentProvider({ apiKey: 'invalid-key' });
    await expect(provider.generateText('test')).rejects.toThrow(
      /OpenAI API authentication failed \(401 Unauthorized\)/
    );
  });

  it('translates 429 Rate Limit into descriptive error message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: async () => 'Rate limit exceeded or quota exhausted',
    });

    const provider = new OpenAISubagentProvider({ apiKey: 'rate-limited-key' });
    await expect(provider.generateText('test')).rejects.toThrow(
      /OpenAI rate limit or quota exceeded \(429\)/
    );
  });

  it('translates 500 Server Error into descriptive error message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Internal server error',
    });

    const provider = new OpenAISubagentProvider({ apiKey: 'sk-test' });
    await expect(provider.generateText('test')).rejects.toThrow(
      /OpenAI service error \(500\)/
    );
  });

  it('can be instantiated via createSubagentProvider factory', async () => {
    const provider = createSubagentProvider({
      provider: 'openai',
      apiKey: 'sk-factory-key',
      model: 'gpt-5-nano',
    });
    expect(provider).toBeInstanceOf(OpenAISubagentProvider);
    expect(provider.name).toBe('OpenAI Subagent');
  });
});
