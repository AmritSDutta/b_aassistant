import { useState, useEffect, useCallback } from 'react';
import { encryptString, decryptString, isEncrypted } from '../config/cryptoStorage';
import {
  DEFAULT_LIVE_MODEL,
  DEFAULT_SUBAGENT_PROVIDER,
  DEFAULT_SUBAGENT_MODEL,
  DEFAULT_VOICE,
  SubagentProviderType,
} from '../config/modelRegistry';

const KEY_API_KEY = 'bassistant_gemini_api_key';
const KEY_LIVE_MODEL = 'bassistant_voice_live_model';
const KEY_STUDIO_VOICE = 'bassistant_studio_voice';

const KEY_SUBAGENT_PROVIDER = 'bassistant_subagent_provider';
const KEY_SUBAGENT_MODEL = 'bassistant_subagent_model';
const KEY_USE_TIER1_GEMINI_KEY = 'bassistant_use_tier1_gemini_key';
const KEY_GEMINI_SUBAGENT_KEY = 'bassistant_gemini_subagent_key';
const KEY_OPENAI_KEY = 'bassistant_openai_api_key';
const KEY_MISTRAL_KEY = 'bassistant_mistral_api_key';
const KEY_REQUESTY_KEY = 'bassistant_requesty_api_key';
const KEY_OLLAMA_KEY = 'bassistant_ollama_api_key';
const KEY_OLLAMA_ENDPOINT = 'bassistant_ollama_endpoint';
const KEY_NEBIUS_KEY = 'bassistant_nebius_api_key';

async function loadEncryptedKey(storageKey: string, fallbackKey?: string): Promise<string> {
  const raw =
    localStorage.getItem(storageKey) ||
    (fallbackKey ? localStorage.getItem(fallbackKey) : null) ||
    '';
  if (fallbackKey) localStorage.removeItem(fallbackKey);
  if (!raw) return '';

  if (isEncrypted(raw)) {
    const dec = await decryptString(raw);
    if (!dec) {
      localStorage.removeItem(storageKey);
      return '';
    }
    const reEnc = await encryptString(dec);
    localStorage.setItem(storageKey, reEnc);
    return dec;
  }

  const trimmed = raw.trim();
  const enc = await encryptString(trimmed);
  if (enc) localStorage.setItem(storageKey, enc);
  return trimmed;
}

async function saveEncryptedKey(storageKey: string, value: string): Promise<void> {
  const trimmed = value.trim();
  if (trimmed) {
    const enc = await encryptString(trimmed);
    localStorage.setItem(storageKey, enc);
  } else {
    localStorage.removeItem(storageKey);
  }
}

export function useVoiceSettings() {
  const [apiKey, setApiKeyState] = useState<string>('');
  const [liveModel, setLiveModelState] = useState<string>(DEFAULT_LIVE_MODEL);
  const [studioVoice, setStudioVoiceState] = useState<string>(DEFAULT_VOICE);

  const [subagentProvider, setSubagentProviderState] = useState<SubagentProviderType>(DEFAULT_SUBAGENT_PROVIDER);
  const [subagentModel, setSubagentModelState] = useState<string>(DEFAULT_SUBAGENT_MODEL);
  const [useTier1GeminiKey, setUseTier1GeminiKeyState] = useState<boolean>(true);
  const [geminiSubagentKey, setGeminiSubagentKeyState] = useState<string>('');
  const [openaiKey, setOpenAIKeyState] = useState<string>('');
  const [mistralKey, setMistralKeyState] = useState<string>('');
  const [requestyKey, setRequestyKeyState] = useState<string>('');
  const [ollamaKey, setOllamaKeyState] = useState<string>('');
  const [ollamaEndpoint, setOllamaEndpointState] = useState<string>('https://ollama.com/api');
  const [nebiusKey, setNebiusKeyState] = useState<string>('');

  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadSettings(): Promise<void> {
      try {
        const loadedGemini = await loadEncryptedKey(KEY_API_KEY, 'GEMINI_API_KEY');
        const loadedGeminiSub = await loadEncryptedKey(KEY_GEMINI_SUBAGENT_KEY);
        const loadedOpenAI = await loadEncryptedKey(KEY_OPENAI_KEY);
        const loadedMistral = await loadEncryptedKey(KEY_MISTRAL_KEY);
        const loadedRequesty = await loadEncryptedKey(KEY_REQUESTY_KEY);
        const loadedOllama = await loadEncryptedKey(KEY_OLLAMA_KEY);
        const loadedNebius = await loadEncryptedKey(KEY_NEBIUS_KEY);

        if (isCancelled) return;

        setApiKeyState(loadedGemini);
        setGeminiSubagentKeyState(loadedGeminiSub);
        setOpenAIKeyState(loadedOpenAI);
        setMistralKeyState(loadedMistral);
        setRequestyKeyState(loadedRequesty);
        setOllamaKeyState(loadedOllama);
        setNebiusKeyState(loadedNebius);

        const savedLive =
          localStorage.getItem(KEY_LIVE_MODEL) ||
          localStorage.getItem('VOICE_LIVE_MODEL');
        if (savedLive) setLiveModelState(savedLive);
        localStorage.removeItem('VOICE_LIVE_MODEL');

        const savedVoice =
          localStorage.getItem(KEY_STUDIO_VOICE) ||
          localStorage.getItem('STUDIO_VOICE');
        if (savedVoice) setStudioVoiceState(savedVoice);
        localStorage.removeItem('STUDIO_VOICE');

        const savedProvider = localStorage.getItem(KEY_SUBAGENT_PROVIDER) as SubagentProviderType;
        if (savedProvider && ['gemini', 'openai', 'mistral', 'requesty', 'ollama', 'nebius'].includes(savedProvider)) {
          setSubagentProviderState(savedProvider);
        }

        const savedSubagentModel =
          localStorage.getItem(KEY_SUBAGENT_MODEL) ||
          localStorage.getItem('GEMINI_MODEL');
        if (savedSubagentModel) setSubagentModelState(savedSubagentModel);
        localStorage.removeItem('GEMINI_MODEL');

        const savedUseTier1 = localStorage.getItem(KEY_USE_TIER1_GEMINI_KEY);
        if (savedUseTier1 !== null) {
          setUseTier1GeminiKeyState(savedUseTier1 !== 'false');
        }

        const savedOllamaEndpoint = localStorage.getItem(KEY_OLLAMA_ENDPOINT);
        if (savedOllamaEndpoint) setOllamaEndpointState(savedOllamaEndpoint);
      } finally {
        if (!isCancelled) setIsLoaded(true);
      }
    }

    void loadSettings();
    return () => {
      isCancelled = true;
    };
  }, []);

  const setApiKey = useCallback(async (newKey: string): Promise<void> => {
    const trimmed = newKey.trim();
    setApiKeyState(trimmed);
    await saveEncryptedKey(KEY_API_KEY, trimmed);
    localStorage.removeItem('GEMINI_API_KEY');
  }, []);

  const setLiveModel = useCallback((model: string): void => {
    setLiveModelState(model);
    localStorage.setItem(KEY_LIVE_MODEL, model);
  }, []);

  const setStudioVoice = useCallback((voice: string): void => {
    setStudioVoiceState(voice);
    localStorage.setItem(KEY_STUDIO_VOICE, voice);
  }, []);

  const setSubagentProvider = useCallback((provider: SubagentProviderType): void => {
    setSubagentProviderState(provider);
    localStorage.setItem(KEY_SUBAGENT_PROVIDER, provider);
  }, []);

  const setSubagentModel = useCallback((model: string): void => {
    setSubagentModelState(model);
    localStorage.setItem(KEY_SUBAGENT_MODEL, model);
  }, []);

  const setUseTier1GeminiKey = useCallback((useTier1: boolean): void => {
    setUseTier1GeminiKeyState(useTier1);
    localStorage.setItem(KEY_USE_TIER1_GEMINI_KEY, String(useTier1));
  }, []);

  const setGeminiSubagentKey = useCallback(async (key: string): Promise<void> => {
    const trimmed = key.trim();
    setGeminiSubagentKeyState(trimmed);
    await saveEncryptedKey(KEY_GEMINI_SUBAGENT_KEY, trimmed);
  }, []);

  const setOpenAIKey = useCallback(async (key: string): Promise<void> => {
    const trimmed = key.trim();
    setOpenAIKeyState(trimmed);
    await saveEncryptedKey(KEY_OPENAI_KEY, trimmed);
  }, []);

  const setMistralKey = useCallback(async (key: string): Promise<void> => {
    const trimmed = key.trim();
    setMistralKeyState(trimmed);
    await saveEncryptedKey(KEY_MISTRAL_KEY, trimmed);
  }, []);

  const setRequestyKey = useCallback(async (key: string): Promise<void> => {
    const trimmed = key.trim();
    setRequestyKeyState(trimmed);
    await saveEncryptedKey(KEY_REQUESTY_KEY, trimmed);
  }, []);

  const setOllamaKey = useCallback(async (key: string): Promise<void> => {
    const trimmed = key.trim();
    setOllamaKeyState(trimmed);
    await saveEncryptedKey(KEY_OLLAMA_KEY, trimmed);
  }, []);

  const setOllamaEndpoint = useCallback((endpoint: string): void => {
    const trimmed = endpoint.trim();
    setOllamaEndpointState(trimmed);
    localStorage.setItem(KEY_OLLAMA_ENDPOINT, trimmed);
  }, []);

  const setNebiusKey = useCallback(async (key: string): Promise<void> => {
    const trimmed = key.trim();
    setNebiusKeyState(trimmed);
    await saveEncryptedKey(KEY_NEBIUS_KEY, trimmed);
  }, []);

  const getActiveSubagentApiKey = useCallback((): string => {
    switch (subagentProvider) {
      case 'openai':
        return openaiKey;
      case 'mistral':
        return mistralKey;
      case 'requesty':
        return requestyKey;
      case 'ollama':
        return ollamaKey;
      case 'nebius':
        return nebiusKey;
      case 'gemini':
      default:
        return useTier1GeminiKey ? apiKey : (geminiSubagentKey || apiKey);
    }
  }, [subagentProvider, openaiKey, mistralKey, requestyKey, ollamaKey, nebiusKey, useTier1GeminiKey, apiKey, geminiSubagentKey]);

  return {
    apiKey,
    setApiKey,
    liveModel,
    setLiveModel,
    studioVoice,
    setStudioVoice,

    subagentProvider,
    setSubagentProvider,
    subagentModel,
    setSubagentModel,
    useTier1GeminiKey,
    setUseTier1GeminiKey,
    geminiSubagentKey,
    setGeminiSubagentKey,
    openaiKey,
    setOpenAIKey,
    mistralKey,
    setMistralKey,
    requestyKey,
    setRequestyKey,
    ollamaKey,
    setOllamaKey,
    ollamaEndpoint,
    setOllamaEndpoint,
    nebiusKey,
    setNebiusKey,
    getActiveSubagentApiKey,

    isLoaded,
  };
}
