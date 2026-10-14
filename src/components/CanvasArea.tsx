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
    <div
      className="h-[60%] flex flex-col relative overflow-hidden border-b"
      style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
    >
      {/* Canvas Toolbar */}
      <div
        className="px-3 py-1.5 border-b flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.09em]"
        style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)', background: 'var(--card)' }}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold" style={{ color: 'var(--ink)' }}>
            Canvas
          </span>
          <span style={{ color: 'var(--you)' }}>live 2D engine</span>
        </div>
        <div className="flex items-center gap-2">
          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              className="px-2 py-0.5 rounded border transition-colors"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            >
              Export PDF
            </button>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="px-2 py-0.5 rounded border transition-colors"
            style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}
          >
            Clear Canvas
          </button>
        </div>
      </div>

      {/* Canvas Element over a quiet dotted grid */}
      <div
        className="flex-1 w-full h-full relative overflow-hidden"
        style={{
          backgroundColor: 'var(--paper)',
          backgroundImage: 'radial-gradient(circle, var(--line) 0.8px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-crosshair bg-transparent"
        />
      </div>
    </div>
  );
};
