import { Canvas2dShape, ShapeBounds, ContentBounds } from './types';
import { DEFAULT_WIDTH, DEFAULT_HEIGHT } from './constants';

export function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function safeSetLineDash(ctx: CanvasRenderingContext2D, dashes: number[]): void {
  if (ctx && typeof ctx.setLineDash === 'function') {
    ctx.setLineDash(dashes);
  }
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

export function getShapeBounds(shape: Canvas2dShape): ShapeBounds {
  if (shape.type === 'arrow' || shape.type === 'line' || shape.type === 'freedraw') {
    return { x: shape.x, y: shape.y, width: shape.width || 0, height: shape.height || 0 };
  }
  if (shape.type === 'polygon' && Array.isArray(shape.points) && shape.points.length > 0) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const pt of shape.points) {
      if (Array.isArray(pt) && pt.length >= 2) {
        const px = finiteOr(pt[0], 0);
        const py = finiteOr(pt[1], 0);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }
    if (minX !== Infinity && maxX !== -Infinity) {
      return {
        x: minX,
        y: minY,
        width: Math.max(maxX - minX, 10),
        height: Math.max(maxY - minY, 10),
      };
    }
  }
  if (shape.type === 'container') {
    return {
      x: shape.x,
      y: shape.y,
      width: typeof shape.width === 'number' && shape.width > 0 ? shape.width : 320,
      height: typeof shape.height === 'number' && shape.height > 0 ? shape.height : 220,
    };
  }
  if (shape.type === 'path') {
    return {
      x: shape.x,
      y: shape.y,
      width: typeof shape.width === 'number' && shape.width > 0 ? shape.width : 120,
      height: typeof shape.height === 'number' && shape.height > 0 ? shape.height : 120,
    };
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
      maxX = Math.max(maxX, shape.startY);
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
