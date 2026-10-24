import rough from 'roughjs';
import { Canvas2dShape } from './types';
import {
  DARK_FILL_ALPHA,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_FONT_SIZE,
  CANVAS_FONT_STACK,
} from './constants';
import {
  normalizeRgba,
  resolveHarmonizedFill,
  resolveThemeTextColor,
  resolveThemeStrokeColor,
} from './color';
import {
  finiteOr,
  safeSetLineDash,
  roundedRectPath,
  getShapeBounds,
} from './geometry';

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

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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
            strokeLineDash: shape.strokeDash,
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
        if (shape.strokeDash && shape.strokeDash.length > 0) {
          safeSetLineDash(ctx, shape.strokeDash);
        }
        ctx.stroke();
        if (shape.strokeDash) {
          safeSetLineDash(ctx, []);
        }
      }

      // UML class compartments
      if (Array.isArray(shape.compartments) && shape.compartments.length > 0) {
        const numComps = shape.compartments.length;
        const titleH = Math.max(30, Math.min(42, h / (numComps + 0.5)));
        const remH = Math.max(20, h - titleH);
        const compH = remH / Math.max(1, numComps - 1);

        // Header compartment (class title)
        drawLabel(ctx, shape.compartments[0], shape.x + w / 2, shape.y + 8, w - 16, shape, 'topCenter', false, theme);

        let currentY = shape.y + titleH;
        for (let i = 1; i < numComps; i++) {
          ctx.save();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(shape.x, currentY);
          ctx.lineTo(shape.x + w, currentY);
          ctx.stroke();
          ctx.restore();

          const compText = shape.compartments[i];
          const lines = wrapText(ctx, compText, w - 20);
          ctx.save();
          ctx.font = `12px monospace, ${CANVAS_FONT_STACK}`;
          ctx.fillStyle = resolveThemeTextColor(shape.textColor, theme, false, shape.fillColor);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          lines.forEach((line, lineIdx) => {
            const lineY = currentY + 6 + lineIdx * 16;
            if (lineY < shape.y + h - 10) {
              ctx.fillText(line, shape.x + 10, lineY);
            }
          });
          ctx.restore();

          currentY += compH;
        }
      } else if (shape.text) {
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
            strokeLineDash: shape.strokeDash,
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
        if (shape.strokeDash && shape.strokeDash.length > 0) {
          safeSetLineDash(ctx, shape.strokeDash);
        }
        ctx.stroke();
        if (shape.strokeDash) {
          safeSetLineDash(ctx, []);
        }
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
              strokeLineDash: shape.strokeDash,
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
        if (shape.strokeDash && shape.strokeDash.length > 0) {
          safeSetLineDash(ctx, shape.strokeDash);
        }
        ctx.stroke();
        if (shape.strokeDash) {
          safeSetLineDash(ctx, []);
        }
      }

      if (shape.text) {
        drawLabel(ctx, shape.text, cx, shape.y + 16, w * 0.7, shape, 'topCenter', false, theme);
      }
      break;
    }
    case 'polygon':
    case 'poly' as any:
    case 'triangle' as any:
    case 'hexagon' as any: {
      const points: [number, number][] =
        Array.isArray(shape.points) && shape.points.length >= 3
          ? (shape.points.map((pt) => [pt[0], pt[1]] as [number, number]))
          : [
              [shape.x, shape.y + (shape.height || DEFAULT_HEIGHT)],
              [shape.x + (shape.width || DEFAULT_WIDTH) / 2, shape.y],
              [shape.x + (shape.width || DEFAULT_WIDTH), shape.y + (shape.height || DEFAULT_HEIGHT)],
            ];

      let renderedRough = false;
      if (rc) {
        try {
          applyShadow(ctx, theme);
          rc.polygon(points, {
            roughness,
            bowing,
            stroke: strokeColor,
            strokeWidth,
            fill: effectiveFill,
            fillStyle,
            fillWeight,
            hachureAngle,
            hachureGap,
            strokeLineDash: shape.strokeDash,
          });
          clearShadow(ctx);
          renderedRough = true;
        } catch {
          renderedRough = false;
        }
      }

      if (!renderedRough) {
        ctx.beginPath();
        points.forEach(([px, py], i) => {
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        if (effectiveFill && effectiveFill !== 'transparent') {
          applyShadow(ctx, theme);
          ctx.fillStyle = effectiveFill;
          ctx.fill();
          clearShadow(ctx);
        }
        if (shape.strokeDash && shape.strokeDash.length > 0) {
          safeSetLineDash(ctx, shape.strokeDash);
        }
        ctx.stroke();
        if (shape.strokeDash) {
          safeSetLineDash(ctx, []);
        }
      }

      if (shape.text) {
        const b = getShapeBounds({ ...shape, points });
        drawLabel(ctx, shape.text, b.x + b.width / 2, b.y + b.height / 2 - 8, b.width - 16, shape, 'center', false, theme);
      }
      break;
    }
    case 'path':
    case 'svg' as any:
    case 'icon' as any:
    case 'drawing' as any: {
      if (shape.d) {
        const hasOffset = (shape.x && shape.x !== 0) || (shape.y && shape.y !== 0);
        ctx.save();
        if (hasOffset) {
          ctx.translate(shape.x, shape.y);
        }

        let renderedRough = false;
        if (rc) {
          try {
            applyShadow(ctx, theme);
            rc.path(shape.d, {
              roughness,
              bowing,
              stroke: strokeColor,
              strokeWidth,
              fill: effectiveFill,
              fillStyle,
              fillWeight,
              hachureAngle,
              hachureGap,
              strokeLineDash: shape.strokeDash,
            });
            clearShadow(ctx);
            renderedRough = true;
          } catch {
            renderedRough = false;
          }
        }

        if (!renderedRough && typeof Path2D !== 'undefined') {
          try {
            const p = new Path2D(shape.d);
            if (effectiveFill && effectiveFill !== 'transparent') {
              applyShadow(ctx, theme);
              ctx.fillStyle = effectiveFill;
              ctx.fill(p);
              clearShadow(ctx);
            }
            if (shape.strokeDash && shape.strokeDash.length > 0) {
              safeSetLineDash(ctx, shape.strokeDash);
            }
            ctx.stroke(p);
            if (shape.strokeDash) {
              safeSetLineDash(ctx, []);
            }
          } catch (err) {
            console.warn('renderShape: invalid Path2D path string', err);
          }
        }

        ctx.restore();
      }

      if (shape.text) {
        const b = getShapeBounds(shape);
        drawLabel(ctx, shape.text, b.x + b.width / 2, b.y + b.height + 6, b.width + 40, shape, 'topCenter', false, theme);
      }
      break;
    }
    case 'container':
    case 'group' as any:
    case 'boundary' as any:
    case 'cluster' as any:
    case 'subgraph' as any:
    case 'package' as any: {
      const w = finiteOr(shape.width, 320);
      const h = finiteOr(shape.height, 220);
      const strokeDash = shape.strokeDash || [6, 4];
      const contFill =
        effectiveFill && effectiveFill !== 'transparent'
          ? normalizeRgba(effectiveFill, 0.05)
          : theme === 'dark'
          ? 'rgba(255, 255, 255, 0.02)'
          : 'rgba(0, 0, 0, 0.015)';

      // Background boundary box
      roundedRectPath(ctx, shape.x, shape.y, w, h, 12);
      ctx.fillStyle = contFill;
      ctx.fill();

      ctx.save();
      safeSetLineDash(ctx, strokeDash);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = Math.max(1, strokeWidth);
      ctx.stroke();
      ctx.restore();

      // Top-left header tab
      if (shape.text) {
        drawLabel(
          ctx,
          shape.text,
          shape.x + 14,
          shape.y + 10,
          w - 28,
          { ...shape, fontSize: Math.max(11, shape.fontSize || 12) },
          'topLeft',
          true,
          theme
        );
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
