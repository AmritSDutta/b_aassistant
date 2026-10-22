import { ISubagentProvider } from '../types/provider';

export interface RequestySubagentConfig {
  apiKey: string;
  model?: string;
  endpoint?: string;
}

export class RequestySubagentProvider implements ISubagentProvider {
  readonly id = 'requesty-subagent';
  readonly name = 'Requesty AI Subagent';

  private readonly apiKey: string;
  private readonly model: string;
  private readonly endpoint: string;

  constructor(config: RequestySubagentConfig) {
    this.apiKey = config.apiKey.trim();
    this.model = config.model?.trim() || 'google/gemma-4-31b-it';
    const rawEndpoint = config.endpoint?.trim() || 'https://router.requesty.ai/v1';
    const clean = rawEndpoint.replace(/\/+$/, '');
    this.endpoint = clean.endsWith('/chat/completions') ? clean : `${clean}/chat/completions`;
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Requesty AI API key is required. Please set it in Voice Settings.');
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    const requestPayload = {
      model: this.model,
      messages,
    };

    let response: Response;
    try {
      // 1. Direct browser fetch (Requesty router natively enables CORS with Access-Control-Allow-Origin: *)
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestPayload),
      });
    } catch {
      // 2. Fallback to same-origin /api/proxy if direct fetch fails (e.g. restrictive network firewall)
      response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: this.endpoint,
          method: 'POST',
          headers: requestHeaders,
          body: requestPayload,
        }),
      });
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      if (response.status === 400) {
        throw new Error(
          `Requesty AI request rejected (400 Bad Request). Please verify the model ID ('${this.model}') in Voice Settings. ${errBody}`.trim()
        );
      }
      if (response.status === 401) {
        throw new Error(
          `Requesty AI authentication failed (401 Unauthorized). Please verify your Requesty API key in Voice Settings. ${errBody}`.trim()
        );
      }
      if (response.status === 403) {
        throw new Error(
          `Requesty AI request forbidden (403). Please verify your Requesty account permissions and model access. ${errBody}`.trim()
        );
      }
      if (response.status === 410) {
        throw new Error(
          `Requesty AI model '${this.model}' or endpoint is unavailable (410 Gone). Please select an active model in Voice Settings. ${errBody}`.trim()
        );
      }
      throw new Error(`Requesty AI API request failed (${response.status}): ${errBody || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}
