import React, { useEffect, useRef, useState, useCallback } from 'react';
import { globalCanvasEngine } from '../lib/canvasEngine';

interface CanvasAreaProps {
  theme?: 'dark' | 'light';
  onClear?: () => void;
  onNewSession?: () => void;
  onExportPdf?: () => void;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({ theme = 'dark', onClear, onNewSession, onExportPdf }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

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

    // Active wheel listener with passive: false to prevent default page scrolling while zooming
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      globalCanvasEngine.zoomAtPoint(e.deltaY, screenX, screenY);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('resize', resizeCanvas);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', resizeCanvas);
      globalCanvasEngine.detach();
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      isDraggingRef.current = true;
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      setIsDragging(true);
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    globalCanvasEngine.pan(dx, dy);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  }, []);

  const handleClear = () => {
    globalCanvasEngine.clear();
    if (onClear) onClear();
  };

  const handleFit = () => {
    globalCanvasEngine.fitToContent();
  };

  const handleReset = () => {
    globalCanvasEngine.resetView();
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
          <button
            type="button"
            onClick={handleFit}
            className="px-2 py-0.5 rounded border transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
            title="Fit all diagram nodes into viewport"
          >
            Fit View
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-2 py-0.5 rounded border transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}
            title="Reset scale to 100% and center origin"
          >
            Reset
          </button>
          {onNewSession && (
            <button
              type="button"
              onClick={onNewSession}
              className="px-2 py-0.5 rounded border transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--you)', color: 'var(--you)' }}
              title="Start a fresh deliberation session"
            >
              New Session
            </button>
          )}
          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              className="px-2 py-0.5 rounded border transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            >
              Export PDF
            </button>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="px-2 py-0.5 rounded border transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}
          >
            Clear
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
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`w-full h-full block bg-transparent select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        />
      </div>
    </div>
  );
};

