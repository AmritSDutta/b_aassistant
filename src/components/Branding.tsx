import React from 'react';

interface BrandingProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Branding: React.FC<BrandingProps> = ({ theme, onToggleTheme }) => {
  return (
    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        {/* Logo Placeholder */}
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-500 font-bold text-sm">
          bA
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100">
            bAssistant
          </h1>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            WebMCP enabled
          </span>
        </div>
      </div>

      {/* Theme Toggle */}
      <button
        type="button"
        onClick={onToggleTheme}
        className="p-1.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors text-xs font-medium flex items-center gap-1"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <span>☀️ Light</span>
        ) : (
          <span>🌙 Dark</span>
        )}
      </button>
    </div>
  );
};
