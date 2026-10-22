import { ISubagentProvider } from '../types/provider';
import { GeminiSubagentProvider } from './geminiSubagentProvider';
import { OpenAISubagentProvider } from './openAISubagentProvider';
import { MistralSubagentProvider } from './mistralSubagentProvider';
import { RequestySubagentProvider } from './requestySubagentProvider';
import { OllamaSubagentProvider } from './ollamaSubagentProvider';
import { SubagentProviderType } from '../config/modelRegistry';

export interface SubagentFactoryOptions {
  provider: SubagentProviderType;
  apiKey: string;
  model: string;
  endpoint?: string;
}

export function createSubagentProvider(options: SubagentFactoryOptions): ISubagentProvider {
  switch (options.provider) {
    case 'openai':
      return new OpenAISubagentProvider({
        apiKey: options.apiKey,
        model: options.model,
        endpoint: options.endpoint,
      });
    case 'mistral':
      return new MistralSubagentProvider({
        apiKey: options.apiKey,
        model: options.model,
        endpoint: options.endpoint,
      });
    case 'requesty':
      return new RequestySubagentProvider({
        apiKey: options.apiKey,
        model: options.model,
        endpoint: options.endpoint,
      });
    case 'ollama':
      return new OllamaSubagentProvider({
        apiKey: options.apiKey,
        model: options.model,
        baseUrl: options.endpoint,
      });
    case 'gemini':
    default:
      return new GeminiSubagentProvider(options.apiKey, options.model);
  }
}

