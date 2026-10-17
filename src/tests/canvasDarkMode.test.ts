import { describe, it, expect, vi } from 'vitest';
import {
  normalizeRgba,
  DARK_FILL_ALPHA,
  sanitizeCanvas2dShapes,
  renderShape,
} from '../lib/canvasHelper';
import { Canvas2dShape } from '../types/canvas2d';

interface RecordedContext {
  ctx: CanvasRenderingContext2D;
  coordinates: number[];
  strokeStyles: string[];
}

/**
 * Builds a 2D-context stub whose `canvas.getContext()` returns itself, so that
 * `getRoughCanvas` resolves and the real Rough.js drawing path executes.
 */
function makeRecordingContext(): RecordedContext {
  const coordinates: number[] = [];
  const strokeStyles: string[] = [];

  const ctx: any = {
    canvas: null,
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: (x: number, y: number) => coordinates.push(x, y),
    lineTo: (x: number, y: number) => coordinates.push(x, y),
    bezierCurveTo: (...args: number[]) => coordinates.push(...args),
    stroke: () => strokeStyles.push(String(ctx.strokeStyle)),
    fill: () => {},
    rect: (...args: number[]) => coordinates.push(...args),
    roundRect: (...args: number[]) => coordinates.push(...args),
    ellipse: (...args: number[]) => coordinates.push(...args),
    fillRect: (...args: number[]) => coordinates.push(...args),
    clearRect: () => {},
    translate: () => {},
    setTransform: () => {},
    setLineDash: () => {},
    measureText: (t: string) => ({ width: t.length * 7 }),
    fillText: (t: string, x: number, y: number) => coordinates.push(x, y),
    font: '',
    lineWidth: 1,
    lineCap: '',
    lineJoin: '',
    lineDashOffset: 0,
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  };
  (ctx as any).strokeStyle = '';
  (ctx as any).fillStyle = '';
  ctx.canvas = { getContext: () => ctx, width: 1000, height: 800 };

  return { ctx: ctx as CanvasRenderingContext2D, coordinates, strokeStyles };
}

describe('Dark-mode canvas calibration', () => {
  describe('normalizeRgba', () => {
    it('forces the requested alpha on hex, rgb, rgba, and named colors', () => {
      expect(normalizeRgba('#3b82f6', DARK_FILL_ALPHA)).toBe(`rgba(59, 130, 246, ${DARK_FILL_ALPHA})`);
      expect(normalizeRgba('#fff', DARK_FILL_ALPHA)).toBe(`rgba(255, 255, 255, ${DARK_FILL_ALPHA})`);
      expect(normalizeRgba('rgb(10, 20, 30)', DARK_FILL_ALPHA)).toBe(`rgba(10, 20, 30, ${DARK_FILL_ALPHA})`);
      expect(normalizeRgba('rgba(99, 102, 241, 0.22)', DARK_FILL_ALPHA)).toBe(`rgba(99, 102, 241, ${DARK_FILL_ALPHA})`);
      expect(normalizeRgba('blue', DARK_FILL_ALPHA)).toBe(`rgba(0, 0, 255, ${DARK_FILL_ALPHA})`);
    });
  });

  describe('shape sanitization', () => {
    it('coerces string dimensions to numbers so Rough.js cannot string-concatenate them', () => {
      const [shape] = sanitizeCanvas2dShapes([
        { type: 'rectangle', x: '100', y: '80', width: '160', height: '80' },
      ]);
      expect(shape.x).toBe(100);
      expect(shape.y).toBe(80);
      expect(shape.width).toBe(160);
      expect(shape.height).toBe(80);
      expect(typeof shape.width).toBe('number');
    });

    it('drops non-finite geometry fields instead of passing them through', () => {
      const [shape] = sanitizeCanvas2dShapes([{ type: 'rectangle', width: 'auto', height: '120px' }]);
      expect(shape.width).toBeUndefined();
      expect(shape.height).toBeUndefined();
    });
  });

  describe('renderShape rectangle (Rough.js path)', () => {
    it('renders a rectangle with string dimensions at numeric, on-canvas coordinates', () => {
      const { ctx, coordinates } = makeRecordingContext();
      const [shape] = sanitizeCanvas2dShapes([
        { type: 'rectangle', x: 100, y: 100, width: '160', height: '80', text: 'API', fillColor: 'client' },
      ]);

      renderShape(ctx, shape, 'dark');

      expect(coordinates.length).toBeGreaterThan(0);
      expect(coordinates.every((n) => Number.isFinite(n))).toBe(true);
      expect(Math.max(...coordinates)).toBeLessThan(1000);
    });

    it('forces the fill to 80% transparency (alpha 0.2) in BOTH themes', () => {
      const dark = makeRecordingContext();
      const light = makeRecordingContext();
      const shape = sanitizeCanvas2dShapes([
        { type: 'rectangle', x: 10, y: 10, width: 120, height: 60, fillColor: '#3b82f6' },
      ])[0];

      renderShape(dark.ctx, shape, 'dark');
      renderShape(light.ctx, shape, 'light');

      const expected = `rgba(59, 130, 246, ${DARK_FILL_ALPHA})`;
      expect(dark.strokeStyles).toContain(expected);
      expect(light.strokeStyles).toContain(expected);
      expect(dark.strokeStyles).not.toContain('rgba(59, 130, 246, 1)');
      expect(light.strokeStyles).not.toContain('#3b82f6');
    });

    it('renders unknown shape types as a rectangle instead of silently dropping them', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { ctx, coordinates } = makeRecordingContext();
      const shape = { id: 'x', type: 'weird-widget', x: 20, y: 20, width: 100, height: 50 } as unknown as Canvas2dShape;

      renderShape(ctx, shape, 'dark');

      expect(warn).toHaveBeenCalled();
      expect(coordinates.length).toBeGreaterThan(0);
      warn.mockRestore();
    });
  });
});
