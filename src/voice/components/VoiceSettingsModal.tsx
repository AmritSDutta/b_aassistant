import React, { useState, useEffect, useMemo } from 'react';
import {
  LIVE_MODEL_OPTIONS,
  STUDIO_VOICES,
  SUBAGENT_PROVIDERS,
  SubagentProviderType,
} from '../config/modelRegistry';
import { createSubagentProvider } from '../providers/subagentFactory';

export interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  liveModel: string;
  studioVoice: string;

  subagentProvider?: SubagentProviderType;
  subagentModel?: string;
  useTier1GeminiKey?: boolean;
  geminiSubagentKey?: string;
  mistralKey?: string;
  requestyKey?: string;
  ollamaKey?: string;
  ollamaEndpoint?: string;

  onSave: (settings: {
    apiKey: string;
    liveModel: string;
    studioVoice: string;
    subagentProvider: SubagentProviderType;
    subagentModel: string;
    useTier1GeminiKey: boolean;
    geminiSubagentKey: string;
    mistralKey: string;
    requestyKey: string;
    ollamaKey: string;
    ollamaEndpoint: string;
  }) => Promise<void> | void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey: initialApiKey = '',
  liveModel: initialLiveModel = 'gemini-3.8-live',
  studioVoice: initialStudioVoice = 'Puck',

  subagentProvider: initialSubagentProvider = 'gemini',
  subagentModel: initialSubagentModel = 'gemini-3.5-flash-lite',
  useTier1GeminiKey: initialUseTier1GeminiKey = true,
  geminiSubagentKey: initialGeminiSubagentKey = '',
  mistralKey: initialMistralKey = '',
  requestyKey: initialRequestyKey = '',
  ollamaKey: initialOllamaKey = '',
  ollamaEndpoint: initialOllamaEndpoint = 'https://ollama.com/api',

  onSave,
}) => {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [liveModel, setLiveModel] = useState(initialLiveModel);
  const [studioVoice, setStudioVoice] = useState(initialStudioVoice);

  const [subagentProvider, setSubagentProvider] = useState<SubagentProviderType>(initialSubagentProvider);
  const [subagentModel, setSubagentModel] = useState(initialSubagentModel);
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false);
  const [customModelInput, setCustomModelInput] = useState<string>('');

  const [useTier1GeminiKey, setUseTier1GeminiKey] = useState<boolean>(initialUseTier1GeminiKey);
  const [geminiSubagentKey, setGeminiSubagentKey] = useState(initialGeminiSubagentKey);
  const [mistralKey, setMistralKey] = useState(initialMistralKey);
  const [requestyKey, setRequestyKey] = useState(initialRequestyKey);
  const [ollamaKey, setOllamaKey] = useState(initialOllamaKey);
  const [ollamaEndpoint, setOllamaEndpoint] = useState(initialOllamaEndpoint);

  const [showTier1Key, setShowTier1Key] = useState(false);
  const [showSubagentKey, setShowSubagentKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'passed' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [testLatencyMs, setTestLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    setApiKey(initialApiKey);
    setLiveModel(initialLiveModel);
    setStudioVoice(initialStudioVoice);
    setSubagentProvider(initialSubagentProvider);

    const providerConfig = SUBAGENT_PROVIDERS.find((p) => p.id === initialSubagentProvider);
    const isPreset = providerConfig?.presets.some((p) => p.id === initialSubagentModel);
    if (isPreset) {
      setSubagentModel(initialSubagentModel);
      setIsCustomModel(false);
      setCustomModelInput('');
    } else {
      setSubagentModel('__custom__');
      setIsCustomModel(true);
      setCustomModelInput(initialSubagentModel);
    }

    setUseTier1GeminiKey(initialUseTier1GeminiKey);
    setGeminiSubagentKey(initialGeminiSubagentKey);
    setMistralKey(initialMistralKey);
    setRequestyKey(initialRequestyKey);
    setOllamaKey(initialOllamaKey);
    setOllamaEndpoint(initialOllamaEndpoint);

    setTestStatus('idle');
    setTestMessage('');
    setTestLatencyMs(null);
  }, [
    initialApiKey,
    initialLiveModel,
    initialStudioVoice,
    initialSubagentProvider,
    initialSubagentModel,
    initialUseTier1GeminiKey,
    initialGeminiSubagentKey,
    initialMistralKey,
    initialRequestyKey,
    initialOllamaKey,
    initialOllamaEndpoint,
    isOpen,
  ]);

  const activeProviderConfig = useMemo(() => {
    return SUBAGENT_PROVIDERS.find((p) => p.id === subagentProvider) || SUBAGENT_PROVIDERS[0];
  }, [subagentProvider]);

  const resolvedSubagentModel = isCustomModel ? customModelInput.trim() : subagentModel;

  const isTier2Dirty = useMemo(() => {
    if (subagentProvider !== initialSubagentProvider) return true;
    if (resolvedSubagentModel !== initialSubagentModel) return true;
    if (subagentProvider === 'gemini') {
      if (useTier1GeminiKey !== initialUseTier1GeminiKey) return true;
      if (!useTier1GeminiKey && geminiSubagentKey !== initialGeminiSubagentKey) return true;
    } else if (subagentProvider === 'mistral') {
      if (mistralKey !== initialMistralKey) return true;
    } else if (subagentProvider === 'requesty') {
      if (requestyKey !== initialRequestyKey) return true;
    } else if (subagentProvider === 'ollama') {
      if (ollamaKey !== initialOllamaKey) return true;
      if (ollamaEndpoint !== initialOllamaEndpoint) return true;
    }
    return false;
  }, [
    subagentProvider,
    initialSubagentProvider,
    resolvedSubagentModel,
    initialSubagentModel,
    useTier1GeminiKey,
    initialUseTier1GeminiKey,
    geminiSubagentKey,
    initialGeminiSubagentKey,
    mistralKey,
    initialMistralKey,
    requestyKey,
    initialRequestyKey,
    ollamaKey,
    initialOllamaKey,
    ollamaEndpoint,
    initialOllamaEndpoint,
  ]);

  if (!isOpen) return null;

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const next = e.target.value as SubagentProviderType;
    setSubagentProvider(next);
    const nextConfig = SUBAGENT_PROVIDERS.find((p) => p.id === next) || SUBAGENT_PROVIDERS[0];
    setSubagentModel(nextConfig.defaultModel);
    setIsCustomModel(false);
    setCustomModelInput('');
    setTestStatus('idle');
    setTestMessage('');
  };

  const handleModelSelectChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomModel(true);
      setSubagentModel('__custom__');
    } else {
      setIsCustomModel(false);
      setSubagentModel(val);
    }
    setTestStatus('idle');
    setTestMessage('');
  };

  const runQuickTest = async (): Promise<void> => {
    setTestStatus('testing');
    setTestMessage('');
    setTestLatencyMs(null);

    const startTime = performance.now();
    try {
      const activeKey =
        subagentProvider === 'gemini'
          ? (useTier1GeminiKey ? apiKey.trim() : geminiSubagentKey.trim())
          : subagentProvider === 'mistral'
          ? mistralKey.trim()
          : subagentProvider === 'requesty'
          ? requestyKey.trim()
          : ollamaKey.trim();

      if (!resolvedSubagentModel) {
        throw new Error('Please select or specify a model ID.');
      }

      if (!activeKey) {
        throw new Error(`API key is required for ${activeProviderConfig.name}.`);
      }

      const testProvider = createSubagentProvider({
        provider: subagentProvider,
        apiKey: activeKey,
        model: resolvedSubagentModel,
        endpoint: subagentProvider === 'ollama' ? ollamaEndpoint : undefined,
      });

      const response = await testProvider.generateText('Respond with only the word OK to verify connection.');
      const elapsed = Math.round(performance.now() - startTime);
      setTestLatencyMs(elapsed);
      setTestStatus('passed');
      setTestMessage(response.trim().slice(0, 80) || 'OK');
    } catch (err) {
      setTestStatus('failed');
      setTestMessage(err instanceof Error ? err.message : 'Connection test failed');
    }
  };

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    try {
      await onSave({
        apiKey: apiKey.trim(),
        liveModel,
        studioVoice,
        subagentProvider,
        subagentModel: resolvedSubagentModel,
        useTier1GeminiKey,
        geminiSubagentKey: geminiSubagentKey.trim(),
        mistralKey: mistralKey.trim(),
        requestyKey: requestyKey.trim(),
        ollamaKey: ollamaKey.trim(),
        ollamaEndpoint: ollamaEndpoint.trim(),
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const isSaveDisabled = isSaving || (isTier2Dirty && testStatus !== 'passed') || testStatus === 'testing';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border p-6 shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--line)' }}>
          <div className="flex items-center space-x-2">
            <span className="text-xl">🎙️</span>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
                Voice & Subagent Settings
              </h2>
              <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                Configure Tier 1 live audio and multi-provider Tier 2 diagram subagent
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-lg leading-none p-1 transition-opacity hover:opacity-80"
            style={{ color: 'var(--ink-soft)' }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="mt-4 space-y-4 text-xs overflow-y-auto pr-1">
          {/* Tier 1 Section Header */}
          <div className="border-b pb-1" style={{ borderColor: 'var(--line)' }}>
            <span className="font-mono uppercase text-[10px] tracking-wider font-semibold" style={{ color: 'var(--accent)' }}>
              Tier 1: Live Voice Conversation
            </span>
          </div>

          {/* Tier 1 API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-medium" style={{ color: 'var(--ink)' }}>
                Gemini API Key (Live Audio)
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                AES-GCM-256 Encrypted
              </span>
            </div>
            <div className="relative">
              <input
                type={showTier1Key ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-lg border px-3 py-1.5 pr-16 focus:outline-none transition-colors"
                style={{
                  background: 'var(--panel)',
                  borderColor: 'var(--line)',
                  color: 'var(--ink)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowTier1Key(!showTier1Key)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[11px] transition-opacity hover:opacity-80"
                style={{ color: 'var(--ink-soft)' }}
              >
                {showTier1Key ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Tier 1 Model & Voice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1" style={{ color: 'var(--ink)' }}>
                Live Audio Model
              </label>
              <select
                value={liveModel}
                onChange={(e) => setLiveModel(e.target.value)}
                className="w-full rounded-lg border px-3 py-1.5 focus:outline-none transition-colors"
                style={{
                  background: 'var(--panel)',
                  borderColor: 'var(--line)',
                  color: 'var(--ink)',
                }}
              >
                {LIVE_MODEL_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} style={{ background: 'var(--panel)', color: 'var(--ink)' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium mb-1" style={{ color: 'var(--ink)' }}>
                Studio Voice Persona
              </label>
              <select
                value={studioVoice}
                onChange={(e) => setStudioVoice(e.target.value)}
                className="w-full rounded-lg border px-3 py-1.5 focus:outline-none transition-colors"
                style={{
                  background: 'var(--panel)',
                  borderColor: 'var(--line)',
                  color: 'var(--ink)',
                }}
              >
                {STUDIO_VOICES.map((v) => (
                  <option key={v.id} value={v.id} style={{ background: 'var(--panel)', color: 'var(--ink)' }}>
                    {v.name} ({v.tone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tier 2 Section Header */}
          <div className="border-b pt-2 pb-1" style={{ borderColor: 'var(--line)' }}>
            <div className="flex items-center justify-between">
              <span className="font-mono uppercase text-[10px] tracking-wider font-semibold" style={{ color: 'var(--accent)' }}>
                Tier 2: Background Diagram & Text Subagent
              </span>
              <span className="text-[10px]" style={{ color: 'var(--ink-soft)' }}>
                Draws Canvas diagrams & answers asynchronously
              </span>
            </div>
          </div>

          {/* 1. Tier 2 Provider Selection */}
          <div>
            <label className="block font-medium mb-1" style={{ color: 'var(--ink)' }}>
              1. Subagent LLM Provider
            </label>
            <select
              value={subagentProvider}
              onChange={handleProviderChange}
              className="w-full rounded-lg border px-3 py-1.5 focus:outline-none transition-colors font-medium"
              style={{
                background: 'var(--panel)',
                borderColor: 'var(--line)',
                color: 'var(--ink)',
              }}
            >
              {SUBAGENT_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id} style={{ background: 'var(--panel)', color: 'var(--ink)' }}>
                  {p.name} — {p.description.slice(0, 48)}...
                </option>
              ))}
            </select>
          </div>

          {/* 2. Tier 2 Provider API Key / Authentication */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-medium" style={{ color: 'var(--ink)' }}>
                2. {activeProviderConfig.name} API Key / Bearer Token
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                AES-GCM-256 Encrypted
              </span>
            </div>

            {subagentProvider === 'gemini' && (
              <div className="mb-2">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useTier1GeminiKey}
                    onChange={(e) => {
                      setUseTier1GeminiKey(e.target.checked);
                      setTestStatus('idle');
                    }}
                    className="rounded border"
                  />
                  <span style={{ color: 'var(--ink)' }}>Use Tier 1 Gemini API Key</span>
                </label>
              </div>
            )}

            {(subagentProvider !== 'gemini' || !useTier1GeminiKey) && (
              <div className="relative">
                <input
                  type={showSubagentKey ? 'text' : 'password'}
                  value={
                    subagentProvider === 'gemini'
                      ? geminiSubagentKey
                      : subagentProvider === 'mistral'
                      ? mistralKey
                      : subagentProvider === 'requesty'
                      ? requestyKey
                      : ollamaKey
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (subagentProvider === 'gemini') setGeminiSubagentKey(val);
                    else if (subagentProvider === 'mistral') setMistralKey(val);
                    else if (subagentProvider === 'requesty') setRequestyKey(val);
                    else setOllamaKey(val);
                    setTestStatus('idle');
                  }}
                  placeholder={activeProviderConfig.keyPlaceholder}
                  className="w-full rounded-lg border px-3 py-1.5 pr-16 focus:outline-none transition-colors"
                  style={{
                    background: 'var(--panel)',
                    borderColor: 'var(--line)',
                    color: 'var(--ink)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowSubagentKey(!showSubagentKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[11px] transition-opacity hover:opacity-80"
                  style={{ color: 'var(--ink-soft)' }}
                >
                  {showSubagentKey ? 'Hide' : 'Show'}
                </button>
              </div>
            )}

            {subagentProvider === 'requesty' && (
              <div className="mt-1 flex items-center justify-between text-[11px]" style={{ color: 'var(--ink-soft)' }}>
                <span>Router Base URL: <code className="font-mono">https://router.requesty.ai/v1</code></span>
                <span className="opacity-75">OpenAI-compatible</span>
              </div>
            )}

            {subagentProvider === 'ollama' && (
              <div className="mt-1 flex items-center justify-between text-[11px]" style={{ color: 'var(--ink-soft)' }}>
                <span>Cloud Endpoint: <code className="font-mono">https://ollama.com/api</code></span>
                <span className="opacity-75">Authenticated via Bearer token</span>
              </div>
            )}
          </div>

          {/* 3. Tier 2 Model Selection */}
          <div>
            <label className="block font-medium mb-1" style={{ color: 'var(--ink)' }}>
              3. Subagent Model ID
            </label>
            <select
              value={isCustomModel ? '__custom__' : subagentModel}
              onChange={handleModelSelectChange}
              className="w-full rounded-lg border px-3 py-1.5 focus:outline-none transition-colors"
              style={{
                background: 'var(--panel)',
                borderColor: 'var(--line)',
                color: 'var(--ink)',
              }}
            >
              {activeProviderConfig.presets.map((preset) => (
                <option key={preset.id} value={preset.id} style={{ background: 'var(--panel)', color: 'var(--ink)' }}>
                  {preset.label}
                </option>
              ))}
              <option value="__custom__" style={{ background: 'var(--panel)', color: 'var(--ink)' }}>
                ⚙️ Custom Model ID...
              </option>
            </select>

            {isCustomModel && (
              <div className="mt-2">
                <input
                  type="text"
                  value={customModelInput}
                  onChange={(e) => {
                    setCustomModelInput(e.target.value);
                    setTestStatus('idle');
                  }}
                  placeholder="Enter arbitrary model string (e.g. meta-llama/llama-3.3-70b-instruct)"
                  className="w-full rounded-lg border px-3 py-1.5 focus:outline-none font-mono text-xs transition-colors"
                  style={{
                    background: 'var(--panel)',
                    borderColor: 'var(--line)',
                    color: 'var(--ink)',
                  }}
                />
              </div>
            )}
          </div>

          {/* 4. Quick Test Subagent */}
          <div
            className="rounded-lg border p-3 space-y-2"
            style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium" style={{ color: 'var(--ink)' }}>
                4. Pre-Save Connection Test
              </span>
              <button
                type="button"
                onClick={runQuickTest}
                disabled={testStatus === 'testing'}
                className="px-3 py-1 rounded text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                style={{ background: 'var(--accent)' }}
              >
                {testStatus === 'testing' ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Testing...
                  </>
                ) : (
                  '⚡ Run Quick Test'
                )}
              </button>
            </div>

            {testStatus === 'idle' && (
              <p className="text-[11px]" style={{ color: 'var(--ink-soft)' }}>
                {isTier2Dirty
                  ? '⚠️ Tier 2 settings modified. Please run Quick Test to verify before saving.'
                  : 'Pristine settings verified. You may test or save immediately.'}
              </p>
            )}

            {testStatus === 'passed' && (
              <div
                className="flex items-center gap-2 p-2 rounded text-[11px] font-mono border"
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                  color: '#10b981',
                }}
              >
                <span>✓ Connection verified in {testLatencyMs}ms:</span>
                <span className="truncate opacity-90">"{testMessage}"</span>
              </div>
            )}

            {testStatus === 'failed' && (
              <div
                className="p-2 rounded text-[11px] font-mono border"
                style={{
                  background: 'rgba(244, 63, 94, 0.1)',
                  borderColor: 'rgba(244, 63, 94, 0.3)',
                  color: '#f43f5e',
                }}
              >
                <div className="font-semibold">✕ Test failed:</div>
                <div className="truncate">{testMessage}</div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="mt-5 pt-3 border-t flex justify-end space-x-2" style={{ borderColor: 'var(--line)' }}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs border transition-opacity hover:opacity-80"
            style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaveDisabled}
            className="rounded-lg px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)' }}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
