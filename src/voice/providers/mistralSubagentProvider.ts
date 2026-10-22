import { ISubagentProvider } from '../types/provider';

export interface MistralSubagentConfig {
  apiKey: string;
  model?: string;
  endpoint?: string;
}

export class MistralSubagentProvider implements ISubagentProvider {
  readonly id = 'mistral-subagent';
  readonly name = 'Mistral AI Subagent';

  private readonly apiKey: string;
  private readonly model: string;
  private readonly endpoint: string;

  constructor(config: MistralSubagentConfig) {
    this.apiKey = config.apiKey.trim();
    this.model = config.model?.trim() || 'ministral-14b-2512';
    this.endpoint = config.endpoint?.trim() || 'https://api.mistral.ai/v1/chat/completions';
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Mistral API key is required. Please set it in Voice Settings.');
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

    // Route through same-origin /api/proxy to bypass browser 403 Forbidden CORS blocks
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
      if (response.status === 401) {
        throw new Error(
          `Mistral API authentication failed (401 Unauthorized). Please verify your Mistral API key in Voice Settings. ${errBody}`.trim()
        );
      }
      if (response.status === 403) {
        throw new Error(
          `Mistral API request forbidden (403). Please verify your Mistral API key and tier permissions. ${errBody}`.trim()
        );
      }
      throw new Error(`Mistral API request failed (${response.status}): ${errBody || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}
