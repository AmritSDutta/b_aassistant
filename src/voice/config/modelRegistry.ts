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

export type SubagentProviderType = 'gemini' | 'openai' | 'mistral' | 'requesty' | 'ollama' | 'nebius';

export interface SubagentProviderOption {
  id: SubagentProviderType;
  name: string;
  description: string;
  defaultModel: string;
  defaultEndpoint?: string;
  keyPlaceholder: string;
  presets: { id: string; label: string; description?: string }[];
}

export const DEFAULT_LIVE_MODEL = 'gemini-3.8-live';
export const DEFAULT_SUBAGENT_PROVIDER: SubagentProviderType = 'gemini';
export const DEFAULT_SUBAGENT_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_VOICE = 'Puck';

export const SUBAGENT_PROVIDERS: SubagentProviderOption[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Native Google GenAI model suite with high throughput and direct SDK integration',
    defaultModel: 'gemini-3.5-flash-lite',
    keyPlaceholder: 'AIzaSy...',
    presets: [
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite (Recommended)', description: 'Fast, structured payloads' },
      { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', description: 'Compact reasoning' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Balanced performance' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI frontier reasoning and compact models',
    defaultModel: 'gpt-6-luna',
    defaultEndpoint: 'https://api.openai.com/v1',
    keyPlaceholder: 'sk-...',
    presets: [
      { id: 'gpt-6-luna', label: 'GPT-6 Luna (Default)', description: 'Advanced frontier reasoning & architecture subagent' },
      { id: 'gpt-5-nano', label: 'GPT-5 Nano', description: 'Fast, lightweight compact subagent' },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'Frontier European models with exceptional reasoning and code intelligence',
    defaultModel: 'ministral-14b-2512',
    keyPlaceholder: 'mis_...',
    presets: [
      { id: 'ministral-14b-2512', label: 'Ministral 14B 2512 (Default)', description: 'High-capability dense subagent' },
      { id: 'ministral-8b-2512', label: 'Ministral 8B 2512', description: 'Balanced reasoning & synthesis' },
      { id: 'ministral-3b-2512', label: 'Ministral 3B 2512', description: 'Fast, lightweight edge subagent' },
    ],
  },
  {
    id: 'requesty',
    name: 'Requesty AI',
    description: 'Unified high-speed AI router with cutting-edge frontier and open models',
    defaultModel: 'google/gemma-4-31b-it',
    defaultEndpoint: 'https://router.requesty.ai/v1',
    keyPlaceholder: 'req_...',
    presets: [
      { id: 'google/gemma-4-31b-it', label: 'Google Gemma 4 31B IT (Default)', description: 'Dense multimodal and structured payload engine' },
      { id: 'nvidia/muse-glimmer-30b', label: 'NVIDIA Muse Glimmer 30B', description: 'Superior synthesis & architecture' },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama Cloud',
    description: 'Hosted Ollama cloud API endpoint with managed frontier models',
    defaultModel: 'gemma4:31b-cloud',
    defaultEndpoint: 'https://ollama.com/api',
    keyPlaceholder: 'ollama_...',
    presets: [
      { id: 'gemma4:31b-cloud', label: 'Gemma 4 31B Cloud (Default)', description: 'Balanced high-capability reasoning' },
      { id: 'nemotron-3-super:cloud', label: 'Nemotron 3 Super Cloud', description: 'Superior architecture & synthesis' },
      { id: 'nemotron-3-nano:30b-cloud', label: 'Nemotron 3 Nano 30B Cloud', description: 'Compact fast reasoning' },
      { id: 'beam:cloud', label: 'Beam Cloud', description: 'Optimized inference subagent' },
    ],
  },
  {
    id: 'nebius',
    name: 'Nebius Token Factory',
    description: 'NVIDIA Nemotron frontier models via the Nebius Token Factory OpenAI-compatible API',
    defaultModel: 'nvidia/nemotron-3-super-120b-a12b',
    defaultEndpoint: 'https://api.tokenfactory.nebius.com/v1',
    keyPlaceholder: 'nebius_...',
    presets: [
      { id: 'nvidia/nemotron-3-super-120b-a12b', label: 'Nemotron 3 Super 120B A12B (Default)', description: 'High-capability dense reasoning & architecture subagent' },
      { id: 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B', label: 'Nemotron 3 Nano 30B A3B', description: 'Compact mixture-of-experts reasoning subagent' },
    ],
  },
];

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
