import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LIVE_MODEL,
  DEFAULT_SUBAGENT_MODEL,
  DEFAULT_VOICE,
  LIVE_MODEL_OPTIONS,
  SUBAGENT_MODEL_OPTIONS,
  SUBAGENT_PROVIDERS,
  STUDIO_VOICES,
} from '../voice/config/modelRegistry';

describe('modelRegistry', () => {
  it('has gemini-3.8-live configured as the default live model', () => {
    expect(DEFAULT_LIVE_MODEL).toBe('gemini-3.8-live');
    const liveDefault = LIVE_MODEL_OPTIONS.find((m) => m.id === DEFAULT_LIVE_MODEL);
    expect(liveDefault).toBeDefined();
    expect(liveDefault?.provider).toBe('gemini');
  });

  it('has gemini-3.5-flash-lite configured as the default subagent model', () => {
    expect(DEFAULT_SUBAGENT_MODEL).toBe('gemini-3.5-flash-lite');
    const subDefault = SUBAGENT_MODEL_OPTIONS.find((m) => m.id === DEFAULT_SUBAGENT_MODEL);
    expect(subDefault).toBeDefined();
    expect(subDefault?.provider).toBe('gemini');
  });

  it('has Puck configured as the default studio voice', () => {
    expect(DEFAULT_VOICE).toBe('Puck');
    const voiceDefault = STUDIO_VOICES.find((v) => v.id === DEFAULT_VOICE);
    expect(voiceDefault).toBeDefined();
  });

  it('contains expected alternative live models and voices', () => {
    const liveIds = LIVE_MODEL_OPTIONS.map((m) => m.id);
    expect(liveIds).toContain('gemini-2.5-flash-native-audio-preview-12-2025');
    expect(liveIds).toContain('gemini-3.1-flash-live-preview');

    const voiceIds = STUDIO_VOICES.map((v) => v.id);
    expect(voiceIds).toContain('Charon');
    expect(voiceIds).toContain('Kore');
    expect(voiceIds).toContain('Fenrir');
    expect(voiceIds).toContain('Aoede');
  });

  it('contains openai in SUBAGENT_PROVIDERS with gpt-6-luna and gpt-5-nano', () => {
    const openai = SUBAGENT_PROVIDERS.find((p) => p.id === 'openai');
    expect(openai).toBeDefined();
    expect(openai?.name).toBe('OpenAI');
    expect(openai?.defaultModel).toBe('gpt-6-luna');
    expect(openai?.presets.map((p) => p.id)).toEqual(['gpt-6-luna', 'gpt-5-nano']);
  });
});
