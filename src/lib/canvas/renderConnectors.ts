import { Canvas2dShape } from './types';
import { resolveThemeStrokeColor } from './color';
import {
  finiteOr,
  safeSetLineDash,
  perimeterEdgeToEdge,
  getShapeBounds,
} from './geometry';
import { drawLabel } from './renderNodes';

export function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  targetX: number,
  targetY: number,
  angle: number,
  kind: 'filled' | 'open' | 'diamond' | 'none',
  size: number,
  fillColor?: string
): void {
  if (kind === 'none') return;

  if (kind === 'open') {
    ctx.beginPath();
    ctx.moveTo(targetX - size * Math.cos(angle - Math.PI / 6), targetY - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(targetX, targetY);
    ctx.lineTo(targetX - size * Math.cos(angle + Math.PI / 6), targetY - size * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
    return;
  }

  if (kind === 'diamond') {
    const dSize = size * 1.1;
    const midX = targetX - (dSize / 2) * Math.cos(angle);
    const midY = targetY - (dSize / 2) * Math.sin(angle);
    const tipX = targetX - dSize * Math.cos(angle);
    const tipY = targetY - dSize * Math.sin(angle);
    const perpX = (dSize / 3) * -Math.sin(angle);
    const perpY = (dSize / 3) * Math.cos(angle);
    ctx.beginPath();
    ctx.moveTo(targetX, targetY);
    ctx.lineTo(midX + perpX, midY + perpY);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(midX - perpX, midY - perpY);
    ctx.closePath();
    ctx.fillStyle = fillColor || ctx.strokeStyle;
    ctx.fill();
    ctx.stroke();
    return;
  }

  // Default: 'filled'
  ctx.beginPath();
  ctx.moveTo(targetX, targetY);
  ctx.lineTo(targetX - size * Math.cos(angle - Math.PI / 6), targetY - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(targetX - size * Math.cos(angle + Math.PI / 6), targetY - size * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
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

  const strokeWidth = typeof shape.strokeWidth === 'number' ? shape.strokeWidth : 1.5;
  ctx.strokeStyle = resolveThemeStrokeColor(shape.strokeColor, theme);
  ctx.lineWidth = strokeWidth;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);

  const arrowheadKind = shape.arrowhead || 'filled';
  const arrowSize = Math.max(10, strokeWidth * 5);

  if (shape.strokeDash && shape.strokeDash.length > 0) {
    safeSetLineDash(ctx, shape.strokeDash);
  }

  if (shape.curved === false || dist < 12) {
    // Clean straight connection fallback
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    safeSetLineDash(ctx, []);

    if (shape.type === 'arrow' || shape.arrowhead) {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      drawArrowhead(ctx, x2, y2, angle, arrowheadKind, arrowSize, shape.fillColor);

      if (shape.bidirectional) {
        drawArrowhead(ctx, x1, y1, angle + Math.PI, arrowheadKind, arrowSize, shape.fillColor);
      }
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

    safeSetLineDash(ctx, []);

    // Tangent angle at arrival point t=1: (x2 - cx2, y2 - cy2)
    if (shape.type === 'arrow' || shape.arrowhead) {
      const tangentDx = x2 - cx2;
      const tangentDy = y2 - cy2;
      const angle = Math.atan2(tangentDy, tangentDx);
      drawArrowhead(ctx, x2, y2, angle, arrowheadKind, arrowSize, shape.fillColor);

      if (shape.bidirectional) {
        // Departure tangent angle at source point t=0: (cx1 - x1, cy1 - y1)
        const startDx = cx1 - x1;
        const startDy = cy1 - y1;
        const startAngle = Math.atan2(-startDy, -startDx);
        drawArrowhead(ctx, x1, y1, startAngle, arrowheadKind, arrowSize, shape.fillColor);
      }
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
