import { ISubagentProvider } from '../types/provider';

export interface OpenAISubagentConfig {
  apiKey: string;
  model?: string;
  endpoint?: string;
}

export class OpenAISubagentProvider implements ISubagentProvider {
  readonly id = 'openai-subagent';
  readonly name = 'OpenAI Subagent';

  private readonly apiKey: string;
  private readonly model: string;
  private readonly endpoint: string;

  constructor(config: OpenAISubagentConfig) {
    this.apiKey = config.apiKey.trim();
    this.model = config.model?.trim() || 'gpt-6-luna';
    const rawEndpoint = config.endpoint?.trim() || 'https://api.openai.com/v1';
    const clean = rawEndpoint.replace(/\/+$/, '');
    this.endpoint = clean.endsWith('/chat/completions') ? clean : `${clean}/chat/completions`;
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required. Please set it in Voice Settings.');
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const requestHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    const requestPayload = {
      model: this.model,
      messages,
    };

    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUrl: this.endpoint,
        method: 'POST',
        headers: requestHeaders,
        body: requestPayload,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      if (response.status === 400) {
        throw new Error(
          `OpenAI request rejected (400 Bad Request). Please verify the model ID ('${this.model}') in Voice Settings. ${errBody}`.trim()
        );
      }
      if (response.status === 401) {
        throw new Error(
          `OpenAI API authentication failed (401 Unauthorized). Please verify your OpenAI API key in Voice Settings. ${errBody}`.trim()
        );
      }
      if (response.status === 403) {
        throw new Error(
          `OpenAI request forbidden (403). Please verify your OpenAI account permissions, billing, and model quota. ${errBody}`.trim()
        );
      }
      if (response.status === 404 || response.status === 410) {
        throw new Error(
          `OpenAI model '${this.model}' or endpoint is unavailable (${response.status}). Please select an active model in Voice Settings. ${errBody}`.trim()
        );
      }
      if (response.status === 429) {
        throw new Error(
          `OpenAI rate limit or quota exceeded (429). Please check your OpenAI billing plan and usage limits. ${errBody}`.trim()
        );
      }
      if (response.status >= 500) {
        throw new Error(
          `OpenAI service error (${response.status}). The upstream provider is currently experiencing issues. ${errBody}`.trim()
        );
      }
      throw new Error(`OpenAI API request failed (${response.status}): ${errBody || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}
