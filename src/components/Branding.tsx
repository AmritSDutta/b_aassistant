import React from 'react';

interface BrandingProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenTips?: () => void;
}

export const Branding: React.FC<BrandingProps> = ({ theme, onToggleTheme, onOpenTips }) => {
  return (
    <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-center space-x-2">
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

      {/* Header Actions: Tips + Theme Toggle */}
      <div className="flex items-center gap-1.5">
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
    </div>
  );
};
