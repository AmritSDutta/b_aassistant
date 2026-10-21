export interface ModelOption {
  id: string;
  label: string;
  description: string;
  provider: 'gemini' | 'openai' | 'mistral';
}

export interface VoiceOption {
  id: string;
  name: string;
  tone: string;
}

export const DEFAULT_LIVE_MODEL = 'gemini-3.8-live';
export const DEFAULT_SUBAGENT_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_VOICE = 'Puck';

export const LIVE_MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'gemini-3.8-live',
    label: 'Gemini 3.8 Live (Recommended)',
    description: 'Ultra-low latency conversational audio orchestrator',
    provider: 'gemini',
  },
  {
    id: 'gemini-2.5-flash-native-audio-preview-12-2025',
    label: 'Gemini 2.5 Flash Native Audio',
    description: 'High fidelity audio turn-taking and speech inflections',
    provider: 'gemini',
  },
  {
    id: 'gemini-3.1-flash-live-preview',
    label: 'Gemini 3.1 Flash Live Preview',
    description: 'Lightweight rapid audio conversationalist',
    provider: 'gemini',
  },
];

export const SUBAGENT_MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash Lite (Recommended)',
    description: 'High throughput structured payload & diagram subagent',
    provider: 'gemini',
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    description: 'Fast compact reasoning subagent',
    provider: 'gemini',
  },
];

export const STUDIO_VOICES: VoiceOption[] = [
  { id: 'Puck', name: '🎙️ Puck', tone: 'Clear & Energetic' },
  { id: 'Charon', name: '🎙️ Charon', tone: 'Deep & Resonant' },
  { id: 'Kore', name: '🎙️ Kore', tone: 'Warm & Natural' },
  { id: 'Fenrir', name: '🎙️ Fenrir', tone: 'Authoritative & Strong' },
  { id: 'Aoede', name: '🎙️ Aoede', tone: 'Melodic & Bright' },
];
