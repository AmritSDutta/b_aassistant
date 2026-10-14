import React from 'react';

interface BrandingProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Branding: React.FC<BrandingProps> = ({ theme, onToggleTheme }) => {
  return (
    <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-center space-x-2">
        {/* Logo Placeholder */}
        <div
          className="w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-sm"
          style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)', color: 'var(--accent)' }}
        >
          bA
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight" style={{ color: 'var(--ink)' }}>
            bAssistant
          </h1>
          <span className="text-[10px] font-mono" style={{ color: 'var(--ink-soft)' }}>
            WebMCP enabled
          </span>
        </div>
      </div>

      {/* Theme Toggle */}
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
  );
};
