import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CanvasEngine } from '../lib/canvasEngine';
import {
  resolveHarmonizedFill,
  EDITORIAL_PALETTES,
  sanitizeCanvas2dShapes,
  getRoughCanvas,
  renderShape,
  renderConnector,
  resolveThemeTextColor,
  drawLabel,
  MEDIUM_DARK_YELLOW,
} from '../lib/canvasHelper';
import { Canvas2dShape } from '../types/canvas2d';

describe('Artistic Canvas Engine (Rough.js & Low-Hanging Fruits)', () => {
  let engine: CanvasEngine;

  beforeEach(() => {
    engine = new CanvasEngine();
    if (typeof HTMLCanvasElement !== 'undefined') {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
        fillText: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        rect: vi.fn(),
        roundRect: vi.fn(),
        ellipse: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        translate: vi.fn(),
        setTransform: vi.fn(),
        font: '',
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        lineCap: '',
        lineJoin: '',
        shadowColor: '',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
      }) as any;
      HTMLCanvasElement.prototype.toDataURL = vi
        .fn()
        .mockReturnValue('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    }
  });

  describe('Editorial & Risograph Color Harmonizer', () => {
    it('maps named archetypes to soft translucent tones', () => {
      const clientFill = resolveHarmonizedFill('client', undefined, 'dark');
      expect(clientFill).toBe('rgba(99, 102, 241, 0.22)');

      const gatewayFill = resolveHarmonizedFill('gateway', undefined, 'dark');
      expect(gatewayFill).toBe('rgba(16, 185, 129, 0.20)');

      const dbFill = resolveHarmonizedFill('db', undefined, 'dark');
      expect(dbFill).toBe('rgba(168, 85, 247, 0.22)');
    });

    it('resolves curated Risograph palette tokens', () => {
      const terracotta = resolveHarmonizedFill('terracotta', 'risograph', 'dark');
      expect(terracotta).toBe(EDITORIAL_PALETTES.risograph.terracotta);

      const sage = resolveHarmonizedFill('sage', 'risograph', 'dark');
      expect(sage).toBe(EDITORIAL_PALETTES.risograph.sage);
    });

    it('softens harsh primary hex inputs into harmonious tones', () => {
      const harshRed = resolveHarmonizedFill('#ff0000', undefined, 'dark');
      expect(harshRed).toBe('rgba(224, 109, 83, 0.24)');

      const harshBlue = resolveHarmonizedFill('#0000ff', undefined, 'dark');
      expect(harshBlue).toBe('rgba(59, 102, 207, 0.24)');
    });

    it('scales alpha appropriately in light mode', () => {
      const lightGateway = resolveHarmonizedFill('gateway', undefined, 'light');
      expect(lightGateway).toBeDefined();
      expect(lightGateway).toContain('rgba(16, 185, 129,');
    });
  });

  describe('Shape Sanitization with Artistic Attributes', () => {
    it('retains roughness, fillStyle, palette, and extracts subtitle', () => {
      const raw = [
        {
          type: 'rectangle',
          text: 'Auth Service',
          sublabel: 'OIDC / JWT',
          roughness: 1.5,
          fillStyle: 'cross-hatch',
          palette: 'risograph',
          x: 100,
          y: 80,
        },
      ];

      const sanitized = sanitizeCanvas2dShapes(raw);
      expect(sanitized.length).toBe(1);
      expect(sanitized[0].text).toBe('Auth Service');
      expect(sanitized[0].subtitle).toBe('OIDC / JWT');
      expect(sanitized[0].roughness).toBe(1.5);
      expect(sanitized[0].fillStyle).toBe('cross-hatch');
      expect(sanitized[0].palette).toBe('risograph');
    });
  });

  describe('Rough.js & Spline Rendering Pipeline', () => {
    it('gracefully handles getRoughCanvas on HTMLCanvasElement', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rc = getRoughCanvas(ctx);
        // rc is instantiated or gracefully null
        expect(rc === null || typeof rc === 'object').toBe(true);
      }
    });

    it('renders shapes and fluid splines without throwing', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const shapes: Canvas2dShape[] = [
        {
          id: 'n1',
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 160,
          height: 80,
          text: 'API Gateway',
          subtitle: 'KONG',
          fillColor: 'gateway',
          roughness: 1.2,
          fillStyle: 'hachure',
        },
        {
          id: 'n2',
          type: 'diamond',
          x: 400,
          y: 100,
          width: 120,
          height: 80,
          text: 'Rate Limit?',
          roughness: 1.0,
        },
        {
          id: 'n3',
          type: 'sticker',
          x: 400,
          y: 300,
          text: 'Review JWT TTL',
          stickerColor: 'mint',
          emoji: '💡',
        },
        {
          id: 'c1',
          type: 'arrow',
          x: 0,
          y: 0,
          startId: 'n1',
          endId: 'n2',
          text: '1. Ingress Request',
          curved: true,
        },
      ];

      const byId = new Map(shapes.map((s) => [s.id, s]));

      expect(() => {
        renderShape(ctx, shapes[0], 'dark');
        renderShape(ctx, shapes[1], 'dark');
        renderShape(ctx, shapes[2], 'dark');
        renderConnector(ctx, shapes[3], byId, 'dark');
      }).not.toThrow();
    });

    it('generates high-resolution snapshot with warm paper backdrop', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 400;
      engine.attach(canvas);

      engine.appendShapes([
        {
          id: 'nodeA',
          type: 'rectangle',
          x: 50,
          y: 50,
          text: 'Primary Node',
          fillColor: 'terracotta',
        },
      ]);

      const dataUrl = engine.getSnapshotDataUrl();
      expect(dataUrl).toBeDefined();
      expect(dataUrl).toContain('data:image/png;base64');
    });
  });

  describe('Theme Adaptability & High Contrast Connector Labels', () => {
    it('resolves universal medium dark yellow for connector pills', () => {
      const darkColor = resolveThemeTextColor(undefined, 'dark', true);
      expect(darkColor).toBe(MEDIUM_DARK_YELLOW);

      const whiteInput = resolveThemeTextColor('#ffffff', 'dark', true);
      expect(whiteInput).toBe(MEDIUM_DARK_YELLOW);

      const lightColor = resolveThemeTextColor(undefined, 'light', true);
      expect(lightColor).toBe(MEDIUM_DARK_YELLOW);

      const darkInput = resolveThemeTextColor('#000000', 'light', true);
      expect(darkInput).toBe(MEDIUM_DARK_YELLOW);
    });

    it('renders elevated dark substrate pill strip in dark mode', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const fillStylesUsed: string[] = [];
      const origFill = ctx.fill.bind(ctx);
      ctx.fill = vi.fn(() => {
        fillStylesUsed.push(String(ctx.fillStyle));
        origFill();
      });

      const shape: Canvas2dShape = {
        id: 'conn1',
        type: 'arrow',
        x: 0,
        y: 0,
        text: 'token payload',
      };

      drawLabel(ctx, 'token payload', 100, 100, 200, shape, 'center', true, 'dark');

      // The pill backdrop uses sleek elevated dark substrate to avoid milky white hazing
      expect(fillStylesUsed).toContain('rgba(15, 23, 42, 0.92)');
      expect(fillStylesUsed).not.toContain('rgba(255, 255, 255, 0.95)');
    });
  });
});

