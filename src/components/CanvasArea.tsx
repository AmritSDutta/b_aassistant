import React, { useEffect, useRef } from 'react';
import { globalCanvasEngine } from '../lib/canvasEngine';

interface CanvasAreaProps {
  theme?: 'dark' | 'light';
  onClear?: () => void;
  onExportPdf?: () => void;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({ theme = 'dark', onClear, onExportPdf }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    globalCanvasEngine.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set internal resolution matching element dimensions
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        globalCanvasEngine.redraw();
      }
    };

    resizeCanvas();
    globalCanvasEngine.attach(canvas);

    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      globalCanvasEngine.detach();
    };
  }, []);

  const handleClear = () => {
    globalCanvasEngine.clear();
    if (onClear) onClear();
  };

  return (
    <div className="h-[60%] flex flex-col border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 relative overflow-hidden">
      {/* Canvas Toolbar */}
      <div className="px-3 py-1.5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-white/40 dark:bg-slate-900/40 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">HTML Canvas</span>
          <span className="text-[10px] text-emerald-500 font-mono">live 2D engine</span>
        </div>
        <div className="flex items-center gap-2">
          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              className="px-2 py-0.5 rounded border border-sky-400/80 dark:border-sky-600 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors text-xs font-mono font-medium"
            >
              Export PDF
            </button>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-xs font-mono"
          >
            Clear Canvas
          </button>
        </div>
      </div>

      {/* Canvas Element */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-crosshair bg-transparent"
        />
      </div>
    </div>
  );
};
