import { useState, useEffect, useCallback } from 'react';
import { encryptString, decryptString, isEncrypted } from '../config/cryptoStorage';
import {
  DEFAULT_LIVE_MODEL,
  DEFAULT_SUBAGENT_MODEL,
  DEFAULT_VOICE,
} from '../config/modelRegistry';

const KEY_API_KEY = 'bassistant_gemini_api_key';
const KEY_LIVE_MODEL = 'bassistant_voice_live_model';
const KEY_SUBAGENT_MODEL = 'bassistant_subagent_model';
const KEY_STUDIO_VOICE = 'bassistant_studio_voice';

export function useVoiceSettings() {
  const [apiKey, setApiKeyState] = useState<string>('');
  const [liveModel, setLiveModelState] = useState<string>(DEFAULT_LIVE_MODEL);
  const [subagentModel, setSubagentModelState] = useState<string>(DEFAULT_SUBAGENT_MODEL);
  const [studioVoice, setStudioVoiceState] = useState<string>(DEFAULT_VOICE);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadSettings() {
      try {
        const rawKey =
          localStorage.getItem(KEY_API_KEY) ||
          localStorage.getItem('GEMINI_API_KEY') ||
          '';

        if (isEncrypted(rawKey)) {
          const decrypted = await decryptString(rawKey);
          if (!isCancelled) {
            setApiKeyState(decrypted);
            if (!decrypted) {
              localStorage.removeItem(KEY_API_KEY);
            } else {
              const reEncrypted = await encryptString(decrypted);
              localStorage.setItem(KEY_API_KEY, reEncrypted);
            }
          }
        } else if (rawKey && rawKey.trim()) {
          const trimmed = rawKey.trim();
          if (!isCancelled) setApiKeyState(trimmed);
          const encrypted = await encryptString(trimmed);
          if (encrypted) {
            localStorage.setItem(KEY_API_KEY, encrypted);
          }
        }
        localStorage.removeItem('GEMINI_API_KEY');

        const savedLive =
          localStorage.getItem(KEY_LIVE_MODEL) ||
          localStorage.getItem('VOICE_LIVE_MODEL');
        if (savedLive && !isCancelled) setLiveModelState(savedLive);
        localStorage.removeItem('VOICE_LIVE_MODEL');

        const savedSubagent =
          localStorage.getItem(KEY_SUBAGENT_MODEL) ||
          localStorage.getItem('GEMINI_MODEL');
        if (savedSubagent && !isCancelled) setSubagentModelState(savedSubagent);
        localStorage.removeItem('GEMINI_MODEL');

        const savedVoice =
          localStorage.getItem(KEY_STUDIO_VOICE) ||
          localStorage.getItem('STUDIO_VOICE');
        if (savedVoice && !isCancelled) setStudioVoiceState(savedVoice);
        localStorage.removeItem('STUDIO_VOICE');
      } finally {
        if (!isCancelled) setIsLoaded(true);
      }
    }

    void loadSettings();
    return () => {
      isCancelled = true;
    };
  }, []);

  const setApiKey = useCallback(async (newKey: string) => {
    const trimmed = newKey.trim();
    setApiKeyState(trimmed);
    if (trimmed) {
      const encrypted = await encryptString(trimmed);
      localStorage.setItem(KEY_API_KEY, encrypted);
    } else {
      localStorage.removeItem(KEY_API_KEY);
    }
    localStorage.removeItem('GEMINI_API_KEY');
  }, []);

  const setLiveModel = useCallback((model: string) => {
    setLiveModelState(model);
    localStorage.setItem(KEY_LIVE_MODEL, model);
  }, []);

  const setSubagentModel = useCallback((model: string) => {
    setSubagentModelState(model);
    localStorage.setItem(KEY_SUBAGENT_MODEL, model);
  }, []);

  const setStudioVoice = useCallback((voice: string) => {
    setStudioVoiceState(voice);
    localStorage.setItem(KEY_STUDIO_VOICE, voice);
  }, []);

  return {
    apiKey,
    setApiKey,
    liveModel,
    setLiveModel,
    subagentModel,
    setSubagentModel,
    studioVoice,
    setStudioVoice,
    isLoaded,
  };
}
