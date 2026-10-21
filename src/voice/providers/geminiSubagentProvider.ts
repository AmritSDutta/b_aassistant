import { GoogleGenAI } from '@google/genai';
import { ISubagentProvider } from '../types/provider';

export class GeminiSubagentProvider implements ISubagentProvider {
  readonly id = 'gemini-subagent';
  readonly name = 'Google Gemini Subagent';

  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'gemini-3.5-flash-lite'
  ) {}

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const response = await ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: systemInstruction
        ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
        : undefined,
    });

    return response.text || '';
  }
}
