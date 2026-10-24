import { Canvas2dShape, CanvasCommand } from './types';
import { MEDIUM_DARK_YELLOW, CANVAS_FONT_STACK } from './constants';
import { resolveThemeStrokeColor, resolveThemeTextColor } from './color';
import { renderShape } from './renderNodes';
import { renderConnector } from './renderConnectors';

export function renderScene(
  ctx: CanvasRenderingContext2D,
  shapes: Canvas2dShape[],
  theme: 'dark' | 'light'
): void {
  if (shapes.length === 0) return;
  const byId = new Map(shapes.map((s) => [s.id, s]));

  // Pass 0: Render Containers / Subgraphs (background)
  for (const shape of shapes) {
    if (shape.type === 'container') {
      renderShape(ctx, shape, theme);
    }
  }

  // Pass 1: Render Nodes & Visual Elements
  for (const shape of shapes) {
    if (shape.type !== 'container' && shape.type !== 'arrow' && shape.type !== 'line') {
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
