import { ISubagentProvider } from '../types/provider';

export interface OllamaSubagentConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export function resolveOllamaChatUrl(baseUrl: string): string {
  const clean = baseUrl.trim().replace(/\/+$/, '');
  if (clean.endsWith('/chat')) return clean;
  if (clean.endsWith('/api')) return `${clean}/chat`;
  return `${clean}/api/chat`;
}

export function isLocalEndpoint(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.')
    );
  } catch {
    return false;
  }
}

export class OllamaSubagentProvider implements ISubagentProvider {
  readonly id = 'ollama-subagent';
  readonly name = 'Ollama Cloud Subagent';

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(config: OllamaSubagentConfig) {
    this.apiKey = config.apiKey.trim();
    this.model = config.model?.trim() || 'gemma4:31b-cloud';
    const rawBase = config.baseUrl?.trim() || 'https://ollama.com/api';
    this.baseUrl = rawBase.replace(/\/+$/, '');
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    const chatUrl = resolveOllamaChatUrl(this.baseUrl);
    const isLocal = isLocalEndpoint(chatUrl);

    if (!isLocal && !this.apiKey) {
      throw new Error('Ollama Cloud API key is required. Please set it in Voice Settings.');
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      requestHeaders.Authorization = `Bearer ${this.apiKey}`;
    }

    const requestPayload = {
      model: this.model,
      messages,
      stream: false,
    };

    let response: Response;

    if (isLocal) {
      try {
        response = await fetch(chatUrl, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(requestPayload),
        });
      } catch {
        response = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUrl: chatUrl,
            method: 'POST',
            headers: requestHeaders,
            body: requestPayload,
          }),
        });
      }
    } else {
      response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: chatUrl,
          method: 'POST',
          headers: requestHeaders,
          body: requestPayload,
        }),
      });
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      if (response.status === 401) {
        throw new Error(
          `Ollama Cloud authentication failed (401 Unauthorized). Please verify your Ollama API key in Voice Settings. ${errBody}`.trim()
        );
      }
      throw new Error(`Ollama Cloud API request failed (${response.status}): ${errBody || response.statusText}`);
    }

    const data = await response.json();
    return data.message?.content || data.response || '';
  }
}
