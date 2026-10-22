import React from 'react';

interface BrandingProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenTips?: () => void;
  onOpenVoiceSettings?: () => void;
  onOpenPreferences?: () => void;
}

export const Branding: React.FC<BrandingProps> = ({
  theme,
  onToggleTheme,
  onOpenTips,
  onOpenVoiceSettings,
  onOpenPreferences,
}) => {
  return (
    <div className="p-3 border-b flex items-center justify-between gap-2" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-center space-x-2 shrink-0">
        <img
          src={
            theme === 'dark'
              ? 'https://pub-c1d80f0f7327493997a3c1285f43a9ea.r2.dev/bassistant_light.jpg'
              : 'https://pub-c1d80f0f7327493997a3c1285f43a9ea.r2.dev/bassistant_dark.jpg'
          }
          alt="bAssistant Logo"
          className="w-8 h-8 rounded-lg object-cover"
        />
        <div>
          <h1 className="font-bold text-base tracking-tight" style={{ color: 'var(--ink)' }}>
            bAssistant
          </h1>
          <span className="text-[10px] font-mono" style={{ color: 'var(--ink-soft)' }}>
            WebMCP enabled
          </span>
        </div>
      </div>

      {/* Header Actions: 2-Tiered Right-Aligned Layout */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {/* Tier 1: Existing 3 action buttons */}
        <div className="flex items-center gap-1.5">
          {onOpenVoiceSettings && (
            <button
              type="button"
              onClick={onOpenVoiceSettings}
              aria-label="Voice & Subagent Settings"
              className="px-2 py-1 rounded-md border transition-colors font-mono text-[10px] font-bold uppercase tracking-[0.06em] hover:opacity-80"
              style={{ borderColor: 'var(--line)', color: 'var(--accent)', background: 'var(--card)' }}
              title="Open Voice Live & Subagent settings"
            >
              🎙️ voice
            </button>
          )}
          {onOpenTips && (
            <button
              type="button"
              onClick={onOpenTips}
              aria-label="Show tips and guide"
              className="px-2 py-1 rounded-md border transition-colors font-mono text-[10px] font-bold uppercase tracking-[0.06em] hover:opacity-80"
              style={{ borderColor: 'var(--line)', color: 'var(--note)', background: 'var(--card)' }}
              title="Open onboarding tips & WebMCP guide"
            >
              tips
            </button>
          )}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="px-2 py-1 rounded-md border transition-colors font-mono text-[10px] font-bold uppercase tracking-[0.06em]"
            style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}
          >
            {theme === 'dark' ? '☀ light' : '☾ dark'}
          </button>
        </div>

        {/* Tier 2: Long single button, right-aligned below the 3 buttons */}
        {onOpenPreferences && (
          <button
            type="button"
            onClick={onOpenPreferences}
            aria-label="User Preferences"
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded-md border transition-colors font-mono text-[10px] font-bold uppercase tracking-[0.06em] hover:opacity-80"
            style={{ borderColor: 'var(--line)', color: 'var(--you, #10b981)', background: 'var(--card)' }}
            title="Open custom user preferences dialog"
          >
            <span>⚙️</span>
            <span>user preferences</span>
          </button>
        )}
      </div>
    </div>
  );
};
