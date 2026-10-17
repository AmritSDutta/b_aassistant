import rough from 'roughjs';
import { Canvas2dShape, ShapeBounds } from '../types/canvas2d';

export function getRoughCanvas(ctx: CanvasRenderingContext2D): any | null {
  try {
    if (typeof rough !== 'undefined' && rough && typeof rough.canvas === 'function') {
      const canvas = ctx?.canvas;
      if (canvas && typeof canvas.getContext === 'function') {
        return rough.canvas(canvas);
      }
    }
  } catch {
    // Graceful fallback in environments without full DOM canvas
  }
  return null;
}

// Hatch/fill alpha, applied in both themes. 0.2 = 80% transparent (20% opaque).
export const DARK_FILL_ALPHA = 0.2;

export function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

const NAMED_COLORS: Record<string, [number, number, number]> = {
  white: [255, 255, 255],
  black: [0, 0, 0],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
};

export function normalizeRgba(color: string, alpha: number): string {
  const c = color.trim().toLowerCase();
  if (c === 'transparent') return 'rgba(0, 0, 0, 0)';

  const hex6 = c.match(/^#([0-9a-f]{6})$/i);
  if (hex6) {
    const r = parseInt(hex6[1].slice(0, 2), 16);
    const g = parseInt(hex6[1].slice(2, 4), 16);
    const b = parseInt(hex6[1].slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const hex3 = c.match(/^#([0-9a-f]{3})$/i);
  if (hex3) {
    const r = parseInt(hex3[1][0] + hex3[1][0], 16);
    const g = parseInt(hex3[1][1] + hex3[1][1], 16);
    const b = parseInt(hex3[1][2] + hex3[1][2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const rgb = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)$/i);
  if (rgb) {
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
  }
  const named = NAMED_COLORS[c];
  if (named) return `rgba(${named[0]}, ${named[1]}, ${named[2]}, ${alpha})`;

  return color;
}

export const EDITORIAL_PALETTES = {
  risograph: {
    terracotta: 'rgba(224, 109, 83, 0.22)',
    cobalt: 'rgba(59, 102, 207, 0.22)',
    sage: 'rgba(78, 154, 126, 0.22)',
    sunflower: 'rgba(229, 169, 59, 0.22)',
    plum: 'rgba(124, 74, 115, 0.22)',
  },
  editorial: {
    olive: 'rgba(85, 107, 47, 0.22)',
    ochre: 'rgba(204, 119, 34, 0.22)',
    slate: 'rgba(47, 53, 66, 0.22)',
    rose: 'rgba(214, 109, 117, 0.22)',
  },
  botanical: {
    fern: 'rgba(74, 124, 89, 0.22)',
    moss: 'rgba(141, 153, 111, 0.22)',
    eucalyptus: 'rgba(92, 131, 116, 0.22)',
    bark: 'rgba(125, 90, 80, 0.22)',
  },
  cyberpunk: {
    cyan: 'rgba(6, 182, 212, 0.24)',
    lavender: 'rgba(168, 85, 247, 0.24)',
    amber: 'rgba(245, 158, 11, 0.24)',
    carbon: 'rgba(30, 41, 59, 0.28)',
  },
};

export function resolveHarmonizedFill(
  color: string | undefined,
  paletteName?: string,
  theme: 'dark' | 'light' = 'dark'
): string | undefined {
  if (!color || color === 'transparent') return color;
  const raw = color.trim().toLowerCase();

  const archetypeMap: Record<string, string> = {
    client: 'rgba(99, 102, 241, 0.22)',
    gateway: 'rgba(16, 185, 129, 0.20)',
    db: 'rgba(168, 85, 247, 0.22)',
    database: 'rgba(168, 85, 247, 0.22)',
    queue: 'rgba(251, 146, 60, 0.22)',
    cache: 'rgba(251, 146, 60, 0.22)',
    logic: 'rgba(250, 204, 21, 0.20)',
    decision: 'rgba(250, 204, 21, 0.20)',
    terracotta: 'rgba(224, 109, 83, 0.22)',
    cobalt: 'rgba(59, 102, 207, 0.22)',
    sage: 'rgba(78, 154, 126, 0.22)',
    sunflower: 'rgba(229, 169, 59, 0.22)',
    plum: 'rgba(124, 74, 115, 0.22)',
    olive: 'rgba(85, 107, 47, 0.22)',
    ochre: 'rgba(204, 119, 34, 0.22)',
  };

  if (archetypeMap[raw]) {
    return applyThemeAlpha(archetypeMap[raw], theme);
  }

  if (paletteName && (EDITORIAL_PALETTES as any)[paletteName]) {
    const pal = (EDITORIAL_PALETTES as any)[paletteName];
    if (pal[raw]) return applyThemeAlpha(pal[raw], theme);
  }

  if (raw === '#ff0000' || raw === 'red') return applyThemeAlpha('rgba(224, 109, 83, 0.24)', theme);
  if (raw === '#0000ff' || raw === 'blue') return applyThemeAlpha('rgba(59, 102, 207, 0.24)', theme);
  if (raw === '#00ff00' || raw === 'green') return applyThemeAlpha('rgba(78, 154, 126, 0.24)', theme);
  if (raw === '#ffff00' || raw === 'yellow') return applyThemeAlpha('rgba(229, 169, 59, 0.24)', theme);

  return applyThemeAlpha(color, theme);
}

export interface DrawRectCommand {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  fill?: boolean;
}

export interface DrawCircleCommand {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
  color?: string;
  fill?: boolean;
}

export interface DrawLineCommand {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  lineWidth?: number;
}

export interface DrawTextCommand {
  type: 'text';
  x: number;
  y: number;
  text: string;
  color?: string;
  fontSize?: number;
}

export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  label?: string;
}

export interface DrawGraphCommand {
  type: 'graph';
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ClearCommand {
  type: 'clear';
}

export type CanvasCommand =
  | DrawRectCommand
  | DrawCircleCommand
  | DrawLineCommand
  | DrawTextCommand
  | DrawGraphCommand
  | ClearCommand;

const DEFAULT_WIDTH = 160;
const DEFAULT_HEIGHT = 80;
const DEFAULT_STROKE_WIDTH = 1.5;
export const MEDIUM_DARK_YELLOW = '#d97706';
export const DEFAULT_TEXT_COLOR = MEDIUM_DARK_YELLOW;
const DEFAULT_FONT_SIZE = 15;
const CANVAS_FONT_STACK = `"Lora", "Georgia", serif`;

export function getShapeBounds(shape: Canvas2dShape): ShapeBounds {
  if (shape.type === 'arrow' || shape.type === 'line' || shape.type === 'freedraw') {
    return { x: shape.x, y: shape.y, width: shape.width || 0, height: shape.height || 0 };
  }
  return {
    x: shape.x,
    y: shape.y,
    width: typeof shape.width === 'number' ? shape.width : (shape.type === 'sticker' ? 180 : DEFAULT_WIDTH),
    height: typeof shape.height === 'number' ? shape.height : (shape.type === 'sticker' ? 100 : DEFAULT_HEIGHT),
  };
}

export function perimeterEdgeToEdge(a: ShapeBounds, b: ShapeBounds): [number, number, number, number] {
  const cax = a.x + a.width / 2;
  const cay = a.y + a.height / 2;
  const cbx = b.x + b.width / 2;
  const cby = b.y + b.height / 2;
  const dx = cbx - cax;
  const dy = cby - cay;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) return [a.x + a.width, cay, b.x, cby];
    return [a.x, cay, b.x + b.width, cby];
  }
  if (dy >= 0) return [cax, a.y + a.height, cbx, b.y];
  return [cax, a.y, cbx, b.y + b.height];
}

export function sanitizeCanvas2dShapes(raw: unknown[]): Canvas2dShape[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => item && typeof item === 'object' && typeof (item as any).type === 'string')
    .map((item, index) => {
      const el = { ...(item as any) } as Canvas2dShape & { label?: unknown };
      if (!el.id) {
        el.id = `c2d_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`;
      }

      // Normalize shape type aliases from external LLMs and diagrams
      const rawType = String(el.type).trim().toLowerCase();
      if (['rect', 'rectangle', 'box', 'card', 'container', 'node', 'square'].includes(rawType)) {
        el.type = 'rectangle';
      } else if (['ellipse', 'circle', 'oval', 'database', 'cylinder', 'db'].includes(rawType)) {
        el.type = 'ellipse';
      } else if (['diamond', 'rhombus', 'decision'].includes(rawType)) {
        el.type = 'diamond';
      } else if (['sticker', 'note', 'sticky', 'postit'].includes(rawType)) {
        el.type = 'sticker';
      } else if (['arrow', 'edge', 'connector'].includes(rawType)) {
        el.type = 'arrow';
      } else if (['line', 'segment'].includes(rawType)) {
        el.type = 'line';
      } else if (['text', 'label'].includes(rawType)) {
        el.type = 'text';
      } else if (['freedraw', 'draw', 'sketch'].includes(rawType)) {
        el.type = 'freedraw';
      }

      const labelText =
        typeof el.text === 'string' && el.text.trim()
          ? el.text
          : typeof el.label === 'string' && el.label.trim()
          ? el.label
          : el.label && typeof (el.label as any).text === 'string'
          ? (el.label as any).text
          : undefined;
      delete el.label;
      if (labelText && labelText.trim()) {
        el.text = labelText;
      }
      const subtitleText =
        typeof el.subtitle === 'string' && el.subtitle.trim()
          ? el.subtitle
          : typeof (el as any).sublabel === 'string' && (el as any).sublabel.trim()
          ? (el as any).sublabel
          : typeof (el as any).description === 'string' && (el as any).description.trim()
          ? (el as any).description
          : undefined;
      delete (el as any).sublabel;
      delete (el as any).description;
      if (subtitleText && subtitleText.trim()) {
        el.subtitle = subtitleText.trim();
      }
      el.x = toFiniteNumber(el.x) ?? 80 * (index + 1);
      el.y = toFiniteNumber(el.y) ?? 80 * (index + 1);

      const numericFields = [
        'width',
        'height',
        'strokeWidth',
        'fontSize',
        'roughness',
        'bowing',
        'hachureAngle',
        'hachureGap',
        'startX',
        'startY',
        'endX',
        'endY',
      ] as const;
      for (const field of numericFields) {
        const coerced = toFiniteNumber((el as any)[field]);
        if (coerced === undefined) {
          delete (el as any)[field];
        } else {
          (el as any)[field] = coerced;
        }
      }
      return el;
    });
}

export interface ContentBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function computeContentBounds(shapes: Canvas2dShape[]): ContentBounds | null {
  if (shapes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const shape of shapes) {
    const b = getShapeBounds(shape);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);

    if (typeof shape.startX === 'number') {
      minX = Math.min(minX, shape.startX);
      maxX = Math.max(maxX, shape.startX);
    }
    if (typeof shape.startY === 'number') {
      minY = Math.min(minY, shape.startY);
      maxY = Math.max(maxY, shape.startY);
    }
    if (typeof shape.endX === 'number') {
      minX = Math.min(minX, shape.endX);
      maxX = Math.max(maxX, shape.endX);
    }
    if (typeof shape.endY === 'number') {
      minY = Math.min(minY, shape.endY);
      maxY = Math.max(maxY, shape.endY);
    }
  }

  if (minX === Infinity || maxX === -Infinity) return null;
  return { minX, minY, maxX, maxY };
}

export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 10
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

export function applyThemeAlpha(color: string | undefined, theme: 'dark' | 'light'): string | undefined {
  if (!color || color === 'transparent') return color;
  if (theme === 'light') {
    const match = color.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i);
    if (match) {
      const r = match[1];
      const g = match[2];
      const b = match[3];
      const a = parseFloat(match[4]);
      const boosted = Math.min(0.88, Math.max(0.2, a * 1.8));
      return `rgba(${r}, ${g}, ${b}, ${boosted})`;
    }
  }
  return color;
}

export function applyShadow(ctx: CanvasRenderingContext2D, theme: 'dark' | 'light'): void {
  ctx.shadowColor = theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
}

export function clearShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

export function parseColorLuminance(color: string): { luminance: number; alpha: number } | null {
  const c = color.trim().toLowerCase();
  if (c === 'transparent') return { luminance: 255, alpha: 0 };
  if (c === 'white' || c === '#fff' || c === '#ffffff') return { luminance: 255, alpha: 1 };
  if (c === 'black' || c === '#000' || c === '#000000') return { luminance: 0, alpha: 1 };

  if (/^#([0-9a-f]{6})$/i.test(c)) {
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    return { luminance: 0.299 * r + 0.587 * g + 0.114 * b, alpha: 1 };
  }
  if (/^#([0-9a-f]{3})$/i.test(c)) {
    const r = parseInt(c[1] + c[1], 16);
    const g = parseInt(c[2] + c[2], 16);
    const b = parseInt(c[3] + c[3], 16);
    return { luminance: 0.299 * r + 0.587 * g + 0.114 * b, alpha: 1 };
  }
  const rgbMatch = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
    return { luminance: 0.299 * r + 0.587 * g + 0.114 * b, alpha: a };
  }

  return null;
}

export function isLightColor(color: string): boolean {
  const parsed = parseColorLuminance(color);
  if (!parsed) {
    const c = color.trim().toLowerCase();
    return ['#e5e7eb', '#f1f5f9', '#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8', 'lightgray', 'lightgrey', 'white'].includes(c);
  }
  return parsed.luminance > 120;
}

export function isDarkColor(color: string): boolean {
  const parsed = parseColorLuminance(color);
  if (!parsed) {
    const c = color.trim().toLowerCase();
    return ['black', '#000', '#000000', '#0f172a', '#1e293b', '#09090b', 'darkgray', 'darkgrey'].includes(c);
  }
  if (parsed.alpha < 0.6) return false;
  return parsed.luminance < 100;
}

export function resolveThemeTextColor(
  color: string | undefined,
  _theme: 'dark' | 'light' = 'dark',
  _isConnectorPill: boolean = false,
  _fillColor?: string
): string {
  // Medium dark yellow (#d97706) provides high-contrast clarity across both light and dark modes
  if (!color) return MEDIUM_DARK_YELLOW;

  // Generic white, off-white, black, or washed-out slate adapt to medium dark yellow
  if (isLightColor(color) || isDarkColor(color)) {
    return MEDIUM_DARK_YELLOW;
  }

  return color;
}

export function resolveThemeStrokeColor(
  color: string | undefined,
  theme: 'dark' | 'light'
): string {
  if (theme === 'light') {
    if (!color) return '#334155';
    if (isLightColor(color)) return '#334155';
    return color;
  } else {
    if (!color) return '#94a3b8';
    if (isDarkColor(color)) return '#94a3b8';
    return color;
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const rawLine of text.split('\n')) {
    let current = '';
    for (const word of rawLine.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    lines.push(current);
  }
  return lines;
}

export function renderShape(
  ctx: CanvasRenderingContext2D,
  shape: Canvas2dShape,
  theme: 'dark' | 'light'
): void {
  ctx.save();
  const strokeColor = resolveThemeStrokeColor(shape.strokeColor, theme);
  const strokeWidth = typeof shape.strokeWidth === 'number' ? shape.strokeWidth : DEFAULT_STROKE_WIDTH;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;

  let effectiveFill = resolveHarmonizedFill(shape.fillColor, shape.palette, theme);
  const isDarkScene = theme === 'dark';
  // Applied in both themes so the hatch strips are the same transparency everywhere.
  if (effectiveFill && effectiveFill !== 'transparent') {
    effectiveFill = normalizeRgba(effectiveFill, DARK_FILL_ALPHA);
  }
  const roughness = finiteOr(shape.roughness, isDarkScene ? 0.8 : 1.2);
  const bowing = finiteOr(shape.bowing, isDarkScene ? 0.8 : 1.2);
  const fillStyle = shape.fillStyle || (effectiveFill && effectiveFill !== 'transparent' ? 'hachure' : undefined);
  const hachureAngle = finiteOr(shape.hachureAngle, -41);
  const hachureGap = finiteOr(shape.hachureGap, 6);
  const fillWeight = Math.max(strokeWidth, 1);

  const rc = roughness > 0 ? getRoughCanvas(ctx) : null;

  switch (shape.type) {
    case 'rectangle':
    case 'rect' as any:
    case 'box' as any:
    case 'card' as any:
    case 'node' as any:
    case 'container' as any:
    case 'square' as any: {
      const w = finiteOr(shape.width, DEFAULT_WIDTH);
      const h = finiteOr(shape.height, DEFAULT_HEIGHT);

      let renderedRough = false;
      if (rc) {
        try {
          applyShadow(ctx, theme);
          rc.rectangle(shape.x, shape.y, w, h, {
            roughness,
            bowing,
            stroke: strokeColor,
            strokeWidth,
            fill: effectiveFill,
            fillStyle,
            fillWeight,
            hachureAngle,
            hachureGap,
          });
          clearShadow(ctx);
          renderedRough = true;
        } catch {
          renderedRough = false;
        }
      }

      if (!renderedRough) {
        roundedRectPath(ctx, shape.x, shape.y, w, h, 10);
        if (effectiveFill && effectiveFill !== 'transparent') {
          applyShadow(ctx, theme);
          ctx.fillStyle = effectiveFill;
          ctx.fill();
          clearShadow(ctx);
        }
        ctx.stroke();
      }

      if (shape.text) {
        drawLabel(ctx, shape.text, shape.x + w / 2, shape.y + 12, w - 16, shape, 'topCenter', false, theme);
      }
      break;
    }
    case 'ellipse':
    case 'circle' as any:
    case 'oval' as any:
    case 'database' as any:
    case 'cylinder' as any:
    case 'db' as any: {
      const w = finiteOr(shape.width, 150);
      const h = finiteOr(shape.height, 90);
      const cx = shape.x + w / 2;
      const cy = shape.y + h / 2;

      let renderedRough = false;
      if (rc) {
        try {
          applyShadow(ctx, theme);
          rc.ellipse(cx, cy, w, h, {
            roughness,
            bowing,
            stroke: strokeColor,
            strokeWidth,
            fill: effectiveFill,
            fillStyle,
            fillWeight,
            hachureAngle,
            hachureGap,
          });
          clearShadow(ctx);
          renderedRough = true;
        } catch {
          renderedRough = false;
        }
      }

      if (!renderedRough) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
        if (effectiveFill && effectiveFill !== 'transparent') {
          applyShadow(ctx, theme);
          ctx.fillStyle = effectiveFill;
          ctx.fill();
          clearShadow(ctx);
        }
        ctx.stroke();
      }

      if (shape.text) {
        drawLabel(ctx, shape.text, cx, shape.y + 14, w - 24, shape, 'topCenter', false, theme);
      }
      break;
    }
    case 'diamond':
    case 'rhombus' as any:
    case 'decision' as any: {
      const w = finiteOr(shape.width, DEFAULT_WIDTH);
      const h = finiteOr(shape.height, DEFAULT_HEIGHT);
      const cx = shape.x + w / 2;
      const cy = shape.y + h / 2;

      let renderedRough = false;
      if (rc) {
        try {
          applyShadow(ctx, theme);
          rc.polygon(
            [
              [cx, shape.y],
              [shape.x + w, cy],
              [cx, shape.y + h],
              [shape.x, cy],
            ],
            {
              roughness,
              bowing,
              stroke: strokeColor,
              strokeWidth,
              fill: effectiveFill,
              fillStyle,
              hachureAngle,
              hachureGap,
            }
          );
          clearShadow(ctx);
          renderedRough = true;
        } catch {
          renderedRough = false;
        }
      }

      if (!renderedRough) {
        ctx.beginPath();
        ctx.moveTo(cx, shape.y);
        ctx.lineTo(shape.x + w, cy);
        ctx.lineTo(cx, shape.y + h);
        ctx.lineTo(shape.x, cy);
        ctx.closePath();
        if (effectiveFill && effectiveFill !== 'transparent') {
          applyShadow(ctx, theme);
          ctx.fillStyle = effectiveFill;
          ctx.fill();
          clearShadow(ctx);
        }
        ctx.stroke();
      }

      if (shape.text) {
        drawLabel(ctx, shape.text, cx, shape.y + 16, w * 0.7, shape, 'topCenter', false, theme);
      }
      break;
    }
    case 'sticker':
    case 'note' as any:
    case 'sticky' as any:
    case 'postit' as any: {
      const w = finiteOr(shape.width, 160);
      const h = finiteOr(shape.height, 90);
      const color = shape.stickerColor || 'yellow';
      const fills: Record<string, string> = {
        yellow: 'rgba(254, 240, 138, 0.95)',
        mint: 'rgba(167, 243, 208, 0.95)',
        rose: 'rgba(254, 205, 211, 0.95)',
      };
      const stickerFill = fills[color] || fills.yellow;

      let renderedRough = false;
      if (rc) {
        try {
          applyShadow(ctx, theme);
          rc.rectangle(shape.x, shape.y, w, h, {
            roughness: 0.8,
            bowing: 1.0,
            fill: stickerFill,
            fillStyle: 'solid',
            stroke: 'rgba(0, 0, 0, 0.18)',
            strokeWidth: 1.2,
          });
          clearShadow(ctx);
          renderedRough = true;
        } catch {
          renderedRough = false;
        }
      }

      if (!renderedRough) {
        applyShadow(ctx, theme);
        ctx.fillStyle = stickerFill;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        roundedRectPath(ctx, shape.x, shape.y, w, h, 6);
        ctx.fill();
        clearShadow(ctx);
        ctx.stroke();
      }

      // Simulated tactile tape banner at top
      ctx.save();
      ctx.fillStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.45)';
      roundedRectPath(ctx, shape.x + w / 2 - 20, shape.y - 4, 40, 10, 2);
      ctx.fill();
      ctx.restore();

      let display = shape.text || '';
      if (shape.emoji) display = `${shape.emoji} ${display}`;
      drawLabel(ctx, display, shape.x + 12, shape.y + 14, w - 24, { ...shape, textColor: '#1f2937' }, 'topLeft', false, theme);
      break;
    }
    case 'text': {
      if (shape.text) {
        drawLabel(ctx, shape.text, shape.x, shape.y, 400, shape, 'topLeft', false, theme);
      }
      break;
    }
    case 'freedraw' as any: {
      if (Array.isArray(shape.points) && shape.points.length > 1) {
        ctx.beginPath();
        shape.points.forEach(([px, py], i) => {
          const fx = finiteOr(px, 0);
          const fy = finiteOr(py, 0);
          if (i === 0) ctx.moveTo(fx, fy);
          else ctx.lineTo(fx, fy);
        });
        ctx.stroke();
      }
      break;
    }
    default: {
      console.warn(`renderShape: unknown shape type "${String((shape as any).type)}" — rendering as rectangle.`);
      renderShape(ctx, { ...shape, type: 'rectangle' }, theme);
      break;
    }
  }
  ctx.restore();
}

export function renderConnector(
  ctx: CanvasRenderingContext2D,
  shape: Canvas2dShape,
  byId: Map<string, Canvas2dShape>,
  theme: 'dark' | 'light'
): void {
  ctx.save();
  const baseX = finiteOr(shape.x, 0);
  const baseY = finiteOr(shape.y, 0);
  let x1 = finiteOr(shape.startX, baseX);
  let y1 = finiteOr(shape.startY, baseY);
  let x2 = finiteOr(shape.endX, baseX + 160);
  let y2 = finiteOr(shape.endY, baseY);

  // Edge-to-Edge perimeter auto-docking
  if (shape.startId && shape.endId) {
    const startShape = byId.get(shape.startId);
    const endShape = byId.get(shape.endId);
    if (startShape && endShape) {
      const [dx1, dy1, dx2, dy2] = perimeterEdgeToEdge(
        getShapeBounds(startShape),
        getShapeBounds(endShape)
      );
      x1 = dx1;
      y1 = dy1;
      x2 = dx2;
      y2 = dy2;
    }
  }

  ctx.strokeStyle = resolveThemeStrokeColor(shape.strokeColor, theme);
  ctx.lineWidth = typeof shape.strokeWidth === 'number' ? shape.strokeWidth : 1.5;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);

  if (shape.curved === false || dist < 12) {
    // Clean straight connection fallback
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (shape.type === 'arrow') {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const size = 11;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }

    if (shape.text) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      drawLabel(ctx, shape.text, mx, my, 220, shape, 'center', true, theme);
    }
  } else {
    // Fluid generative cubic Bézier spline
    let cx1: number;
    let cy1: number;
    let cx2: number;
    let cy2: number;

    if (Math.abs(dx) >= Math.abs(dy)) {
      const curvature = Math.min(Math.abs(dx) * 0.5, 120);
      const signX = dx >= 0 ? 1 : -1;
      cx1 = x1 + curvature * signX;
      cy1 = y1;
      cx2 = x2 - curvature * signX;
      cy2 = y2;
    } else {
      const curvature = Math.min(Math.abs(dy) * 0.5, 120);
      const signY = dy >= 0 ? 1 : -1;
      cx1 = x1;
      cy1 = y1 + curvature * signY;
      cx2 = x2;
      cy2 = y2 - curvature * signY;
    }

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Tangent angle at arrival point t=1: (x2 - cx2, y2 - cy2)
    if (shape.type === 'arrow') {
      const tangentDx = x2 - cx2;
      const tangentDy = y2 - cy2;
      const angle = Math.atan2(tangentDy, tangentDx);
      const size = 11;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }

    // Midpoint label position at cubic Bézier t=0.5
    if (shape.text) {
      const mx = 0.125 * x1 + 0.375 * cx1 + 0.375 * cx2 + 0.125 * x2;
      const my = 0.125 * y1 + 0.375 * cy1 + 0.375 * cy2 + 0.125 * y2;
      drawLabel(ctx, shape.text, mx, my, 220, shape, 'center', true, theme);
    }
  }

  ctx.restore();
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  maxWidth: number,
  shape: Canvas2dShape,
  anchor: 'center' | 'topCenter' | 'topLeft',
  withPill: boolean = false,
  theme: 'dark' | 'light' = 'dark'
): void {
  const effectiveTheme: 'dark' | 'light' = theme;

  const fontSize = typeof shape.fontSize === 'number' && shape.fontSize > 0 ? shape.fontSize : DEFAULT_FONT_SIZE;
  ctx.font = `bold ${fontSize}px ${CANVAS_FONT_STACK}`;

  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = fontSize * 1.35;

  if (withPill && lines.length > 0) {
    let maxLineWidth = 0;
    for (const line of lines) {
      const w = ctx.measureText(line).width;
      if (w > maxLineWidth) maxLineWidth = w;
    }
    const padX = effectiveTheme === 'dark' ? 6 : 8;
    const padY = effectiveTheme === 'dark' ? 2 : 3;
    const badgeW = maxLineWidth + padX * 2;
    const badgeH = lines.length * lineHeight + padY * 2;
    const badgeX = anchor === 'center' || anchor === 'topCenter' ? cx - badgeW / 2 : cx - padX;
    const badgeY = anchor === 'center' ? cy - badgeH / 2 : cy - padY;

    ctx.save();
    roundedRectPath(ctx, badgeX, badgeY, badgeW, badgeH, 6);
    if (effectiveTheme === 'dark') {
      // Sleek elevated dark substrate: crisp against #0d1117 without milky white hazing
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1.2;
    } else {
      ctx.fillStyle = 'rgba(255, 253, 247, 0.96)';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = resolveThemeTextColor(shape.textColor, effectiveTheme, withPill, shape.fillColor);

  let currentY = cy;
  if (anchor === 'center') {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const startY = cy - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => ctx.fillText(line, cx, startY + i * lineHeight));
    currentY = startY + lines.length * lineHeight;
  } else if (anchor === 'topCenter') {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => ctx.fillText(line, cx, cy + i * lineHeight));
    currentY = cy + lines.length * lineHeight;
  } else {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => ctx.fillText(line, cx, cy + i * lineHeight));
    currentY = cy + lines.length * lineHeight;
  }

  // Micro-badge / subtitle beneath main label
  if (shape.subtitle && !withPill) {
    ctx.save();
    ctx.font = 'bold 9px monospace, sans-serif';
    ctx.fillStyle = effectiveTheme === 'light' ? '#64748b' : '#94a3b8';
    if (anchor === 'topCenter' || anchor === 'center') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(shape.subtitle.toUpperCase(), cx, currentY + 3);
    } else {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(shape.subtitle.toUpperCase(), cx, currentY + 3);
    }
    ctx.restore();
  }
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  shapes: Canvas2dShape[],
  theme: 'dark' | 'light'
): void {
  if (shapes.length === 0) return;
  const byId = new Map(shapes.map((s) => [s.id, s]));

  // Pass 1: Render Nodes & Containers
  for (const shape of shapes) {
    if (shape.type !== 'arrow' && shape.type !== 'line') {
      renderShape(ctx, shape, theme);
    }
  }

  // Pass 2: Render Connectors with edge-to-edge docking and pill labels
  for (const shape of shapes) {
    if (shape.type === 'arrow' || shape.type === 'line') {
      renderConnector(ctx, shape, byId, theme);
    }
  }
}

export function renderLegacyCommand(
  ctx: CanvasRenderingContext2D,
  cmd: CanvasCommand,
  theme: 'dark' | 'light'
): void {
  ctx.save();
  switch (cmd.type) {
    case 'rect': {
      ctx.strokeStyle = cmd.color || '#38bdf8';
      ctx.fillStyle = cmd.color || '#38bdf8';
      if (cmd.fill) {
        ctx.fillRect(cmd.x, cmd.y, cmd.width, cmd.height);
      } else {
        ctx.strokeRect(cmd.x, cmd.y, cmd.width, cmd.height);
      }
      break;
    }
    case 'circle': {
      ctx.strokeStyle = cmd.color || '#38bdf8';
      ctx.fillStyle = cmd.color || '#38bdf8';
      ctx.beginPath();
      ctx.arc(cmd.x, cmd.y, cmd.radius, 0, Math.PI * 2);
      if (cmd.fill) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
      break;
    }
    case 'line': {
      ctx.strokeStyle = resolveThemeStrokeColor(cmd.color, theme);
      ctx.lineWidth = cmd.lineWidth || 2;
      ctx.beginPath();
      ctx.moveTo(cmd.x1, cmd.y1);
      ctx.lineTo(cmd.x2, cmd.y2);
      ctx.stroke();
      break;
    }
    case 'text': {
      ctx.fillStyle = resolveThemeTextColor(cmd.color, theme);
      ctx.font = `bold ${cmd.fontSize || 14}px ${CANVAS_FONT_STACK}`;
      ctx.fillText(cmd.text, cmd.x, cmd.y);
      break;
    }
    case 'graph': {
      for (const edge of cmd.edges) {
        const fromNode = cmd.nodes.find((n) => n.id === edge.from);
        const toNode = cmd.nodes.find((n) => n.id === edge.to);
        if (fromNode && toNode) {
          ctx.strokeStyle = resolveThemeStrokeColor(undefined, theme);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(fromNode.x, fromNode.y);
          ctx.lineTo(toNode.x, toNode.y);
          ctx.stroke();

          if (edge.label) {
            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;
            ctx.fillStyle = MEDIUM_DARK_YELLOW;
            ctx.font = `bold 11px ${CANVAS_FONT_STACK}`;
            ctx.fillText(edge.label, midX + 5, midY - 5);
          }
        }
      }
      for (const node of cmd.nodes) {
        ctx.fillStyle = node.color || '#0284c7';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = MEDIUM_DARK_YELLOW;
        ctx.font = `bold 12px ${CANVAS_FONT_STACK}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(node.label, node.x, node.y - 24);
      }
      break;
    }
  }
  ctx.restore();
}
