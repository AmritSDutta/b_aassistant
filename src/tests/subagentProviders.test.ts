import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MistralSubagentProvider,
  RequestySubagentProvider,
  OllamaSubagentProvider,
  createSubagentProvider,
  GeminiSubagentProvider,
} from '../voice';

describe('Subagent Providers', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('MistralSubagentProvider', () => {
    it('throws error when apiKey is empty', async () => {
      const provider = new MistralSubagentProvider({ apiKey: '' });
      await expect(provider.generateText('hello')).rejects.toThrow('Mistral API key is required');
    });

    it('sends correct payload via /api/proxy to bypass browser 403 Forbidden and parses response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Mistral architectural explanation' } }],
        }),
      });
      globalThis.fetch = mockFetch;

      const provider = new MistralSubagentProvider({
        apiKey: 'test-mistral-key',
      });

      const result = await provider.generateText('Design event architecture', 'System prompt');

      expect(result).toBe('Mistral architectural explanation');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/proxy',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUrl: 'https://api.mistral.ai/v1/chat/completions',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer test-mistral-key',
            },
            body: {
              model: 'ministral-14b-2512',
              messages: [
                { role: 'system', content: 'System prompt' },
                { role: 'user', content: 'Design event architecture' },
              ],
            },
          }),
        })
      );
    });

    it('throws descriptive error on 401 Unauthorized', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid key',
      });

      const provider = new MistralSubagentProvider({ apiKey: 'invalid-key' });
      await expect(provider.generateText('test')).rejects.toThrow(/Mistral API authentication failed \(401 Unauthorized\)/);
    });

    it('throws descriptive error on 403 Forbidden', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Tier permissions insufficient',
      });

      const provider = new MistralSubagentProvider({ apiKey: 'forbidden-key' });
      await expect(provider.generateText('test')).rejects.toThrow(/Mistral API request forbidden \(403\)/);
    });
  });

  describe('RequestySubagentProvider', () => {
    it('throws error when apiKey is empty', async () => {
      const provider = new RequestySubagentProvider({ apiKey: '' });
      await expect(provider.generateText('hello')).rejects.toThrow('Requesty AI API key is required');
    });

    it('sends correct headers and payload to Requesty with default model and normalizes base url', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Requesty Gemma architecture explanation' } }],
        }),
      });
      globalThis.fetch = mockFetch;

      const provider = new RequestySubagentProvider({
        apiKey: 'req_test_key_123',
        endpoint: 'https://router.requesty.ai/v1',
      });

      const result = await provider.generateText('Diagram prompt', 'System instructions');

      expect(result).toBe('Requesty Gemma architecture explanation');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://router.requesty.ai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer req_test_key_123',
          },
          body: JSON.stringify({
            model: 'google/gemma-4-31b-it',
            messages: [
              { role: 'system', content: 'System instructions' },
              { role: 'user', content: 'Diagram prompt' },
            ],
          }),
        })
      );
    });

    it('throws descriptive error on 400 Bad Request with model hint', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid model identifier',
      });

      const provider = new RequestySubagentProvider({ apiKey: 'valid-key' });
      await expect(provider.generateText('test')).rejects.toThrow(
        /Requesty AI request rejected \(400 Bad Request\).*google\/gemma-4-31b-it/
      );
    });

    it('throws descriptive error on 410 Gone', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 410,
        statusText: 'Gone',
        text: async () => 'Endpoint or model deprecated',
      });

      const provider = new RequestySubagentProvider({ apiKey: 'valid-key' });
      await expect(provider.generateText('test')).rejects.toThrow(
        /Requesty AI model 'google\/gemma-4-31b-it' or endpoint is unavailable \(410 Gone\)/
      );
    });

    it('throws descriptive error on 401 Unauthorized', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid key',
      });

      const provider = new RequestySubagentProvider({ apiKey: 'invalid-key' });
      await expect(provider.generateText('test')).rejects.toThrow(/Requesty AI authentication failed \(401 Unauthorized\)/);
    });

    it('throws descriptive error on 403 Forbidden', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Model access restricted',
      });

      const provider = new RequestySubagentProvider({ apiKey: 'forbidden-key' });
      await expect(provider.generateText('test')).rejects.toThrow(/Requesty AI request forbidden \(403\)/);
    });
  });

  describe('OllamaSubagentProvider', () => {
    it('throws error when apiKey is empty on remote cloud endpoint', async () => {
      const provider = new OllamaSubagentProvider({ apiKey: '', baseUrl: 'https://ollama.com/api' });
      await expect(provider.generateText('hello')).rejects.toThrow('Ollama Cloud API key is required');
    });

    it('routes remote cloud requests through same-origin /api/proxy to bypass browser CORS', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: 'Ollama Cloud gemma4:31b-cloud response' },
        }),
      });
      globalThis.fetch = mockFetch;

      const provider = new OllamaSubagentProvider({
        apiKey: 'ollama-secret-bearer',
        model: 'gemma4:31b-cloud',
        baseUrl: 'https://ollama.com/api',
      });

      const result = await provider.generateText('Check diagram', 'System spec');

      expect(result).toBe('Ollama Cloud gemma4:31b-cloud response');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/proxy',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUrl: 'https://ollama.com/api/chat',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ollama-secret-bearer',
            },
            body: {
              model: 'gemma4:31b-cloud',
              messages: [
                { role: 'system', content: 'System spec' },
                { role: 'user', content: 'Check diagram' },
              ],
              stream: false,
            },
          }),
        })
      );
    });

    it('makes direct call for local endpoints and does not mandate API key', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: 'Local Ollama response' },
        }),
      });
      globalThis.fetch = mockFetch;

      const provider = new OllamaSubagentProvider({
        apiKey: '',
        model: 'llama3.2',
        baseUrl: 'http://localhost:11434',
      });

      const result = await provider.generateText('ping');
      expect(result).toBe('Local Ollama response');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3.2',
            messages: [{ role: 'user', content: 'ping' }],
            stream: false,
          }),
        })
      );
    });

    it('falls back to /api/proxy when local direct call fails', async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch (CORS)'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: { content: 'Proxy fallback response' },
          }),
        });
      globalThis.fetch = mockFetch;

      const provider = new OllamaSubagentProvider({
        apiKey: '',
        model: 'llama3.2',
        baseUrl: 'http://localhost:11434',
      });

      const result = await provider.generateText('ping');
      expect(result).toBe('Proxy fallback response');
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:11434/api/chat',
        expect.anything()
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        '/api/proxy',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"targetUrl":"http://localhost:11434/api/chat"'),
        })
      );
    });

    it('supports fallback to response field if message is absent', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: 'Ollama raw response',
        }),
      });

      const provider = new OllamaSubagentProvider({
        apiKey: 'bearer',
        model: 'mistral',
      });

      const result = await provider.generateText('ping');
      expect(result).toBe('Ollama raw response');
    });

    it('provides clear actionable error on 401 Unauthorized', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid token',
      });

      const provider = new OllamaSubagentProvider({ apiKey: 'bad-key' });
      await expect(provider.generateText('test')).rejects.toThrow(/Ollama Cloud authentication failed \(401 Unauthorized\)/);
    });

    it('throws error on cloud API failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        text: async () => 'Cloud service offline',
      });

      const provider = new OllamaSubagentProvider({ apiKey: 'test' });
      await expect(provider.generateText('test')).rejects.toThrow(/Ollama Cloud API request failed \(502\)/);
    });
  });

  describe('createSubagentProvider factory', () => {
    it('creates GeminiSubagentProvider for gemini provider type', () => {
      const provider = createSubagentProvider({
        provider: 'gemini',
        apiKey: 'gemini-key',
        model: 'gemini-3.5-flash-lite',
      });
      expect(provider).toBeInstanceOf(GeminiSubagentProvider);
      expect(provider.id).toBe('gemini-subagent');
    });

    it('creates MistralSubagentProvider for mistral provider type', () => {
      const provider = createSubagentProvider({
        provider: 'mistral',
        apiKey: 'mistral-key',
        model: 'ministral-14b-2512',
      });
      expect(provider).toBeInstanceOf(MistralSubagentProvider);
      expect(provider.id).toBe('mistral-subagent');
    });

    it('creates RequestySubagentProvider for requesty provider type', () => {
      const provider = createSubagentProvider({
        provider: 'requesty',
        apiKey: 'req_key',
        model: 'google/gemma-4-31b-it',
      });
      expect(provider).toBeInstanceOf(RequestySubagentProvider);
      expect(provider.id).toBe('requesty-subagent');
    });

    it('creates OllamaSubagentProvider for ollama provider type', () => {
      const provider = createSubagentProvider({
        provider: 'ollama',
        apiKey: 'ollama-key',
        model: 'gemma4:31b-cloud',
        endpoint: 'https://ollama.com/api',
      });
      expect(provider).toBeInstanceOf(OllamaSubagentProvider);
      expect(provider.id).toBe('ollama-subagent');
    });
  });
});
