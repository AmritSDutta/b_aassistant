import React, { useState } from 'react';
import { MAX_USER_PREFERENCES, MAX_USER_PREFERENCE_LENGTH } from '../lib/userPreferences';

export interface UserPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: string[];
  onAddPreference: (preference: string) => { success: boolean; error?: string };
  onRemovePreference: (index: number) => void;
}

export const UserPreferencesModal: React.FC<UserPreferencesModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onAddPreference,
  onRemovePreference,
}) => {
  const [inputText, setInputText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isFull = preferences.length >= MAX_USER_PREFERENCES;
  const charCount = inputText.length;
  const isOverLimit = charCount > MAX_USER_PREFERENCE_LENGTH;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFull) {
      setErrorMessage(`Maximum limit of ${MAX_USER_PREFERENCES} preferences reached.`);
      return;
    }

    const trimmed = inputText.trim();
    if (!trimmed) {
      setErrorMessage('Preference text cannot be empty.');
      return;
    }

    if (trimmed.length > MAX_USER_PREFERENCE_LENGTH) {
      setErrorMessage(`Preference exceeds ${MAX_USER_PREFERENCE_LENGTH} characters.`);
      return;
    }

    const result = onAddPreference(trimmed);
    if (result.success) {
      setInputText('');
      setErrorMessage(null);
    } else {
      setErrorMessage(result.error || 'Could not add preference.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-prefs-title"
    >
      <div
        className="w-full max-w-lg rounded-xl shadow-2xl border p-5 space-y-4 max-h-[90vh] flex flex-col"
        style={{
          background: 'var(--paper)',
          borderColor: 'var(--line)',
          color: 'var(--ink)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--line)' }}>
          <div className="flex items-center gap-2">
            <span className="text-base">⚙️</span>
            <h2 id="user-prefs-title" className="font-mono text-sm font-bold tracking-wide uppercase">
              User Preferences
            </h2>
            <span
              className="font-mono text-[10px] font-bold px-2 py-0.5 rounded"
              style={{ background: 'var(--card)', color: 'var(--ink)' }}
            >
              {preferences.length} / {MAX_USER_PREFERENCES}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-bold opacity-60 hover:opacity-100 px-2 py-0.5 rounded transition-opacity"
            aria-label="Close user preferences dialog"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Description */}
        <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
          Configure custom rules and guidelines (max 10 items, up to 120 characters each). Visiting LLMs, WebMCP tools,
          and background subagents will adhere to these preferences during diagramming and deliberation.
        </p>

        {/* Add Preference Form */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={isFull}
              placeholder={isFull ? 'Limit reached (10 max)' : 'e.g. Always use dark mode for architecture diagrams'}
              className="w-full text-xs font-mono px-3 py-2 rounded-lg border focus:outline-none transition-colors"
              style={{
                background: 'var(--card)',
                borderColor: errorMessage || isOverLimit ? '#ef4444' : 'var(--line)',
                color: 'var(--ink)',
              }}
              autoFocus
            />
            <div
              className={`text-[10px] font-mono text-right mt-1 ${
                isOverLimit
                  ? 'text-red-500 font-bold'
                  : charCount > 100
                  ? 'text-amber-500'
                  : 'opacity-60'
              }`}
              style={{ color: isOverLimit ? '#ef4444' : charCount > 100 ? '#f59e0b' : 'var(--ink-soft)' }}
            >
              {charCount} / {MAX_USER_PREFERENCE_LENGTH}
            </div>
          </div>

          {errorMessage && (
            <p className="text-[11px] text-red-500 font-mono">{errorMessage}</p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-mono" style={{ color: 'var(--ink-soft)' }}>
              {MAX_USER_PREFERENCES - preferences.length} slot(s) remaining
            </span>
            <button
              type="submit"
              disabled={isFull || !inputText.trim() || isOverLimit}
              className="font-mono text-xs font-bold px-3 py-1.5 rounded-lg border transition-opacity disabled:opacity-40 hover:opacity-80 flex items-center gap-1.5"
              style={{
                background: 'var(--accent, #6366f1)',
                borderColor: 'var(--line)',
                color: '#ffffff',
              }}
            >
              + Add Preference
            </button>
          </div>
        </form>

        {/* Preferences List */}
        <div className="flex-1 overflow-y-auto space-y-2 max-h-60 pt-2 border-t" style={{ borderColor: 'var(--line)' }}>
          {preferences.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs italic" style={{ color: 'var(--ink-soft)' }}>
                No custom preferences stored yet. Add up to 10 preferences for your AI assistant.
              </p>
            </div>
          ) : (
            preferences.map((pref, idx) => (
              <div
                key={`${idx}-${pref}`}
                className="flex items-start justify-between text-xs px-3 py-2 rounded-lg border gap-3 group"
                style={{ background: 'var(--card)', borderColor: 'var(--line)' }}
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span
                    className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                    style={{ background: 'var(--panel)', color: 'var(--ink-soft)' }}
                  >
                    #{idx + 1}
                  </span>
                  <span className="font-mono text-xs break-words flex-1 leading-relaxed" style={{ color: 'var(--ink)' }}>
                    {pref}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemovePreference(idx)}
                  className="opacity-50 hover:opacity-100 hover:text-red-500 font-bold px-1.5 py-0.5 text-xs rounded transition-opacity"
                  aria-label={`Delete preference ${idx + 1}: ${pref}`}
                  title="Remove preference"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t pt-3 flex justify-end" style={{ borderColor: 'var(--line)' }}>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs font-bold px-4 py-1.5 rounded-lg border hover:opacity-80 transition-opacity"
            style={{
              background: 'var(--card)',
              borderColor: 'var(--line)',
              color: 'var(--ink)',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
