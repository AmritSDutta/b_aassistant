import React, { useState, useEffect } from 'react';
import {
  LIVE_MODEL_OPTIONS,
  SUBAGENT_MODEL_OPTIONS,
  STUDIO_VOICES,
} from '../config/modelRegistry';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  liveModel: string;
  subagentModel: string;
  studioVoice: string;
  onSave: (settings: {
    apiKey: string;
    liveModel: string;
    subagentModel: string;
    studioVoice: string;
  }) => Promise<void> | void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey: initialApiKey,
  liveModel: initialLiveModel,
  subagentModel: initialSubagentModel,
  studioVoice: initialStudioVoice,
  onSave,
}) => {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [liveModel, setLiveModel] = useState(initialLiveModel);
  const [subagentModel, setSubagentModel] = useState(initialSubagentModel);
  const [studioVoice, setStudioVoice] = useState(initialStudioVoice);
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setApiKey(initialApiKey);
    setLiveModel(initialLiveModel);
    setSubagentModel(initialSubagentModel);
    setStudioVoice(initialStudioVoice);
  }, [initialApiKey, initialLiveModel, initialSubagentModel, initialStudioVoice, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        apiKey: apiKey.trim(),
        liveModel,
        subagentModel,
        studioVoice,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border p-6 shadow-2xl"
        style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--line)' }}>
          <div className="flex items-center space-x-2">
            <span className="text-xl">🎙️</span>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Voice & Subagent Settings</h2>
              <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>Configure full-duplex live audio and tiered models</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-lg leading-none p-1 transition-opacity hover:opacity-80"
            style={{ color: 'var(--ink-soft)' }}
          >
            &times;
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-medium" style={{ color: 'var(--ink)' }}>Gemini API Key</label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                AES-GCM-256 Encrypted
              </span>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-lg border px-3 py-2 pr-16 focus:outline-none focus:ring-1 transition-colors"
                style={{
                  background: 'var(--panel)',
                  borderColor: 'var(--line)',
                  color: 'var(--ink)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[11px] transition-opacity hover:opacity-80"
                style={{ color: 'var(--ink-soft)' }}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--ink-soft)' }}>
              Stored client-side encrypted in IndexedDB. Never leaves your device.
            </p>
          </div>

          <div>
            <label className="block font-medium mb-1" style={{ color: 'var(--ink)' }}>
              Tier 1: Live Voice Model (Conversational Audio)
            </label>
            <select
              value={liveModel}
              onChange={(e) => setLiveModel(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none transition-colors"
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
              Tier 2: Subagent Model (Structured Diagram & Technical Analysis)
            </label>
            <select
              value={subagentModel}
              onChange={(e) => setSubagentModel(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none transition-colors"
              style={{
                background: 'var(--panel)',
                borderColor: 'var(--line)',
                color: 'var(--ink)',
              }}
            >
              {SUBAGENT_MODEL_OPTIONS.map((opt) => (
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
              className="w-full rounded-lg border px-3 py-2 focus:outline-none transition-colors"
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

        <div className="mt-6 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs border transition-opacity hover:opacity-80"
            style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
