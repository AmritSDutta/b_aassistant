import { ISubagentProvider } from '../types/provider';

export interface NebiusSubagentConfig {
  apiKey: string;
  model?: string;
  endpoint?: string;
}

export class NebiusSubagentProvider implements ISubagentProvider {
  readonly id = 'nebius-subagent';
  readonly name = 'Nebius Token Factory Subagent';

  private readonly apiKey: string;
  private readonly model: string;
  private readonly endpoint: string;

  constructor(config: NebiusSubagentConfig) {
    this.apiKey = config.apiKey.trim();
    this.model = config.model?.trim() || 'nvidia/nemotron-3-super-120b-a12b';
    const rawEndpoint = config.endpoint?.trim() || 'https://api.tokenfactory.nebius.com/v1';
    const clean = rawEndpoint.replace(/\/+$/, '');
    this.endpoint = clean.endsWith('/chat/completions') ? clean : `${clean}/chat/completions`;
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Nebius Token Factory API key is required. Please set it in Voice Settings.');
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

    // Route through same-origin /api/proxy to bypass browser CORS blocks on the Nebius API
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
          `Nebius Token Factory request rejected (400 Bad Request). Please verify the model ID ('${this.model}') in Voice Settings. ${errBody}`.trim()
        );
      }
      if (response.status === 401) {
        throw new Error(
          `Nebius Token Factory authentication failed (401 Unauthorized). Please verify your Nebius API key in Voice Settings. ${errBody}`.trim()
        );
      }
      if (response.status === 403) {
        throw new Error(
          `Nebius Token Factory request forbidden (403). Please verify your Nebius account permissions and model access. ${errBody}`.trim()
        );
      }
      if (response.status === 404 || response.status === 410) {
        throw new Error(
          `Nebius model '${this.model}' or endpoint is unavailable (${response.status}). Please select an active model in Voice Settings. ${errBody}`.trim()
        );
      }
      if (response.status === 429) {
        throw new Error(
          `Nebius Token Factory rate limit or quota exceeded (429). Please check your Nebius usage limits. ${errBody}`.trim()
        );
      }
      if (response.status >= 500) {
        throw new Error(
          `Nebius Token Factory service error (${response.status}). The upstream provider is currently experiencing issues. ${errBody}`.trim()
        );
      }
      throw new Error(`Nebius Token Factory API request failed (${response.status}): ${errBody || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}
