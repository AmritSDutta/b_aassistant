import { Canvas2dShape, ShapeBounds, Canvas2dView } from '../types/canvas2d';

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
const DEFAULT_TEXT_COLOR = '#e5e7eb';
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
      if (typeof el.x !== 'number') el.x = 80 * (index + 1);
      if (typeof el.y !== 'number') el.y = 80 * (index + 1);
      return el;
    });
}

function roundedRectPath(
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

export class CanvasEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private theme: 'dark' | 'light' = 'dark';
  private shapes: Canvas2dShape[] = [];
  private legacyCommands: CanvasCommand[] = [];
  private view: Canvas2dView = { scale: 1, offsetX: 0, offsetY: 0 };

  public attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.redraw();
  }

  public detach(): void {
    this.canvas = null;
    this.ctx = null;
  }

  public setTheme(theme: 'dark' | 'light'): void {
    this.theme = theme;
    this.redraw();
  }

  public getView(): Canvas2dView {
    return { ...this.view };
  }

  public setView(view: Canvas2dView): void {
    this.view = { ...view };
    this.redraw();
  }

  public resetView(): void {
    this.view = { scale: 1, offsetX: 0, offsetY: 0 };
    this.redraw();
  }

  public pan(dx: number, dy: number): void {
    this.view.offsetX += dx;
    this.view.offsetY += dy;
    this.redraw();
  }

  public zoomAtPoint(deltaY: number, screenX: number, screenY: number): void {
    const factor = deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(Math.max(this.view.scale * factor, 0.2), 4);
    if (newScale === this.view.scale) return;

    this.view.offsetX = screenX - (screenX - this.view.offsetX) * (newScale / this.view.scale);
    this.view.offsetY = screenY - (screenY - this.view.offsetY) * (newScale / this.view.scale);
    this.view.scale = newScale;
    this.redraw();
  }

  public fitToContent(padding = 50): void {
    if (!this.canvas || this.shapes.length === 0) {
      this.resetView();
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const shape of this.shapes) {
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

    const w = maxX - minX;
    const h = maxY - minY;
    if (w <= 0 || h <= 0) return;

    const availW = Math.max(this.canvas.width - padding * 2, 100);
    const availH = Math.max(this.canvas.height - padding * 2, 100);
    const scale = Math.min(Math.max(Math.min(availW / w, availH / h), 0.2), 1.5);

    this.view.scale = scale;
    this.view.offsetX = (this.canvas.width - w * scale) / 2 - minX * scale;
    this.view.offsetY = (this.canvas.height - h * scale) / 2 - minY * scale;
    this.redraw();
  }

  public getShapes(): Canvas2dShape[] {
    return [...this.shapes];
  }

  public setShapes(shapes: Canvas2dShape[]): void {
    this.shapes = sanitizeCanvas2dShapes(shapes);
    this.redraw();
  }

  public appendShapes(shapes: Canvas2dShape[]): number {
    const sanitized = sanitizeCanvas2dShapes(shapes);
    this.shapes.push(...sanitized);
    this.fitToContent();
    return sanitized.length;
  }

  public modifyShape(
    nodeIdQuery: string,
    patch: Partial<Canvas2dShape>
  ): { modifiedCount: number; message: string } {
    const query = (nodeIdQuery || '').trim().toLowerCase();
    if (!query) return { modifiedCount: 0, message: 'nodeId query is required' };

    let modifiedCount = 0;
    this.shapes = this.shapes.map((s) => {
      const id = (s.id || '').toLowerCase();
      const text = (s.text || '').toLowerCase();
      const match = id === query || (text.length > 0 && (text.includes(query) || query.includes(text)));
      if (!match) return s;

      modifiedCount++;
      return {
        ...s,
        ...patch,
        x: typeof patch.x === 'number' ? patch.x : s.x,
        y: typeof patch.y === 'number' ? patch.y : s.y,
        text: patch.text !== undefined ? patch.text : s.text,
        fillColor: patch.fillColor !== undefined ? patch.fillColor : s.fillColor,
        strokeColor: patch.strokeColor !== undefined ? patch.strokeColor : s.strokeColor,
      };
    });

    if (modifiedCount > 0) {
      this.redraw();
    }
    return {
      modifiedCount,
      message:
        modifiedCount > 0
          ? `Updated shape matching '${nodeIdQuery}' in-place.`
          : `No shape found matching '${nodeIdQuery}'.`,
    };
  }

  public clear(): void {
    this.shapes = [];
    this.legacyCommands = [];
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  public hasContent(): boolean {
    return this.shapes.length > 0 || this.legacyCommands.length > 0;
  }

  public execute(command: CanvasCommand): void {
    if (command.type === 'clear') {
      this.clear();
      return;
    }
    this.legacyCommands.push(command);
    if (this.ctx) {
      this.renderLegacyCommand(command);
    }
  }

  public executeBatch(commands: CanvasCommand[]): void {
    for (const cmd of commands) {
      this.execute(cmd);
    }
  }

  public getHistory(): CanvasCommand[] {
    return [...this.legacyCommands];
  }

  public getTopologySummary(): { summary: string; asciiGraph: string; nodeCount: number; edgeCount: number } {
    const isConnector = (s: Canvas2dShape) => s.type === 'arrow' || s.type === 'line';
    const nodes = this.shapes.filter((s) => !isConnector(s));
    const connectors = this.shapes.filter(isConnector);

    const labelOf = new Map(nodes.map((n) => [n.id, n.text || n.id]));
    const graphLines: string[] = [];

    if (connectors.length > 0) {
      connectors.forEach((c, idx) => {
        const from = c.startId ? labelOf.get(c.startId) || `Node(${c.startId})` : 'Ingress/Source';
        const to = c.endId ? labelOf.get(c.endId) || `Node(${c.endId})` : 'Egress/Target';
        const edge = c.text ? ` --[${c.text}]--> ` : ' --> ';
        graphLines.push(`${idx + 1}. [${from}]${edge}[${to}]`);
      });
    } else if (nodes.length > 0) {
      nodes.forEach((n, idx) => {
        graphLines.push(`${idx + 1}. [${n.text || n.id}] (${n.type}) at (${Math.round(n.x)}, ${Math.round(n.y)})`);
      });
    }

    return {
      summary: `${nodes.length} nodes, ${connectors.length} connectors on active canvas.`,
      asciiGraph: graphLines.length > 0 ? graphLines.join('\n') : 'Canvas scene is currently empty.',
      nodeCount: nodes.length,
      edgeCount: connectors.length,
    };
  }

  public getSnapshotDataUrl(): string | null {
    if (!this.canvas) return null;
    if (this.shapes.length === 0 && this.legacyCommands.length === 0) {
      return this.canvas.toDataURL('image/png');
    }

    try {
      const padding = 40;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const s of this.shapes) {
        const b = getShapeBounds(s);
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.width);
        maxY = Math.max(maxY, b.y + b.height);
        if (typeof s.startX === 'number') {
          minX = Math.min(minX, s.startX);
          maxX = Math.max(maxX, s.startX);
        }
        if (typeof s.startY === 'number') {
          minY = Math.min(minY, s.startY);
          maxY = Math.max(maxY, s.startY);
        }
        if (typeof s.endX === 'number') {
          minX = Math.min(minX, s.endX);
          maxX = Math.max(maxX, s.endX);
        }
        if (typeof s.endY === 'number') {
          minY = Math.min(minY, s.endY);
          maxY = Math.max(maxY, s.endY);
        }
      }

      if (minX === Infinity || maxX === -Infinity) {
        return this.canvas.toDataURL('image/png');
      }

      const contentW = Math.max(maxX - minX, 100);
      const contentH = Math.max(maxY - minY, 100);
      const offCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
      if (!offCanvas) return this.canvas.toDataURL('image/png');

      offCanvas.width = contentW + padding * 2;
      offCanvas.height = contentH + padding * 2;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return this.canvas.toDataURL('image/png');

      offCtx.fillStyle = this.theme === 'light' ? '#ffffff' : '#09090b';
      offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

      offCtx.save();
      offCtx.translate(padding - minX, padding - minY);

      const byId = new Map(this.shapes.map((s) => [s.id, s]));
      for (const shape of this.shapes) {
        if (shape.type !== 'arrow' && shape.type !== 'line') {
          this.renderShape(offCtx, shape);
        }
      }
      for (const shape of this.shapes) {
        if (shape.type === 'arrow' || shape.type === 'line') {
          this.renderConnector(offCtx, shape, byId);
        }
      }
      offCtx.restore();

      return offCanvas.toDataURL('image/png');
    } catch {
      return this.canvas.toDataURL('image/png');
    }
  }

  public redraw(): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.view.scale, 0, 0, this.view.scale, this.view.offsetX, this.view.offsetY);

    // 1. Render Scene Graph Shapes
    if (this.shapes.length > 0) {
      const byId = new Map(this.shapes.map((s) => [s.id, s]));

      // Pass 1: Render Nodes & Containers
      for (const shape of this.shapes) {
        if (shape.type !== 'arrow' && shape.type !== 'line') {
          this.renderShape(ctx, shape);
        }
      }

      // Pass 2: Render Connectors with edge-to-edge docking and pill labels
      for (const shape of this.shapes) {
        if (shape.type === 'arrow' || shape.type === 'line') {
          this.renderConnector(ctx, shape, byId);
        }
      }
    }

    // 2. Render Legacy Commands if any
    for (const cmd of this.legacyCommands) {
      this.renderLegacyCommand(cmd);
    }

    ctx.restore();
  }

  private renderShape(
    ctx: CanvasRenderingContext2D,
    shape: Canvas2dShape
  ): void {
    ctx.save();
    ctx.strokeStyle = shape.strokeColor || (this.theme === 'light' ? '#475569' : '#94a3b8');
    ctx.lineWidth = typeof shape.strokeWidth === 'number' ? shape.strokeWidth : DEFAULT_STROKE_WIDTH;

    const effectiveFill = applyThemeAlpha(shape.fillColor, this.theme);

    switch (shape.type) {
      case 'rectangle': {
        const w = shape.width ?? DEFAULT_WIDTH;
        const h = shape.height ?? DEFAULT_HEIGHT;
        roundedRectPath(ctx, shape.x, shape.y, w, h, 10);
        if (effectiveFill && effectiveFill !== 'transparent') {
          applyShadow(ctx, this.theme);
          ctx.fillStyle = effectiveFill;
          ctx.fill();
          clearShadow(ctx);
        }
        ctx.stroke();
        if (shape.text) {
          this.drawLabel(ctx, shape.text, shape.x + w / 2, shape.y + h / 2, w - 16, shape, 'center');
        }
        break;
      }
      case 'ellipse': {
        const w = shape.width ?? 150;
        const h = shape.height ?? 90;
        ctx.beginPath();
        ctx.ellipse(shape.x + w / 2, shape.y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        if (effectiveFill && effectiveFill !== 'transparent') {
          applyShadow(ctx, this.theme);
          ctx.fillStyle = effectiveFill;
          ctx.fill();
          clearShadow(ctx);
        }
        ctx.stroke();
        if (shape.text) {
          this.drawLabel(ctx, shape.text, shape.x + w / 2, shape.y + h / 2, w - 24, shape, 'center');
        }
        break;
      }
      case 'diamond': {
        const w = shape.width ?? DEFAULT_WIDTH;
        const h = shape.height ?? DEFAULT_HEIGHT;
        const cx = shape.x + w / 2;
        const cy = shape.y + h / 2;
        ctx.beginPath();
        ctx.moveTo(cx, shape.y);
        ctx.lineTo(shape.x + w, cy);
        ctx.lineTo(cx, shape.y + h);
        ctx.lineTo(shape.x, cy);
        ctx.closePath();
        if (effectiveFill && effectiveFill !== 'transparent') {
          applyShadow(ctx, this.theme);
          ctx.fillStyle = effectiveFill;
          ctx.fill();
          clearShadow(ctx);
        }
        ctx.stroke();
        if (shape.text) {
          this.drawLabel(ctx, shape.text, cx, cy, w * 0.7, shape, 'center');
        }
        break;
      }
      case 'sticker': {
        const w = shape.width ?? 160;
        const h = shape.height ?? 90;
        const color = shape.stickerColor || 'yellow';
        const fills: Record<string, string> = {
          yellow: 'rgba(254, 240, 138, 0.95)',
          mint: 'rgba(167, 243, 208, 0.95)',
          rose: 'rgba(254, 205, 211, 0.95)',
        };
        applyShadow(ctx, this.theme);
        ctx.fillStyle = fills[color] || fills.yellow;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        roundedRectPath(ctx, shape.x, shape.y, w, h, 6);
        ctx.fill();
        clearShadow(ctx);
        ctx.stroke();

        let display = shape.text || '';
        if (shape.emoji) display = `${shape.emoji} ${display}`;
        this.drawLabel(ctx, display, shape.x + 12, shape.y + 12, w - 24, { ...shape, textColor: '#1f2937' }, 'topLeft');
        break;
      }
      case 'text': {
        if (shape.text) {
          this.drawLabel(ctx, shape.text, shape.x, shape.y, 400, shape, 'topLeft');
        }
        break;
      }
    }
    ctx.restore();
  }

  private renderConnector(
    ctx: CanvasRenderingContext2D,
    shape: Canvas2dShape,
    byId: Map<string, Canvas2dShape>
  ): void {
    ctx.save();
    let x1 = shape.startX ?? shape.x;
    let y1 = shape.startY ?? shape.y;
    let x2 = shape.endX ?? shape.x + 160;
    let y2 = shape.endY ?? shape.y;

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

    ctx.strokeStyle = shape.strokeColor || (this.theme === 'light' ? '#64748b' : '#94a3b8');
    ctx.lineWidth = typeof shape.strokeWidth === 'number' ? shape.strokeWidth : 1.5;

    // Line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Arrowhead
    if (shape.type === 'arrow') {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const size = 10;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }

    // Label with backdrop pill
    if (shape.text) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      this.drawLabel(ctx, shape.text, mx, my, 220, shape, 'center', true);
    }

    ctx.restore();
  }

  private drawLabel(
    ctx: CanvasRenderingContext2D,
    text: string,
    cx: number,
    cy: number,
    maxWidth: number,
    shape: Canvas2dShape,
    anchor: 'center' | 'topLeft',
    withPill: boolean = false
  ): void {
    const fontSize = typeof shape.fontSize === 'number' && shape.fontSize > 0 ? shape.fontSize : DEFAULT_FONT_SIZE;
    ctx.font = `${fontSize}px ${CANVAS_FONT_STACK}`;

    const lines = this.wrapText(ctx, text, maxWidth);
    const lineHeight = fontSize * 1.35;

    if (withPill && lines.length > 0) {
      let maxLineWidth = 0;
      for (const line of lines) {
        const w = ctx.measureText(line).width;
        if (w > maxLineWidth) maxLineWidth = w;
      }
      const padX = 8;
      const padY = 3;
      const badgeW = maxLineWidth + padX * 2;
      const badgeH = lines.length * lineHeight + padY * 2;
      const badgeX = anchor === 'center' ? cx - badgeW / 2 : cx - padX;
      const badgeY = anchor === 'center' ? cy - badgeH / 2 : cy - padY;

      ctx.save();
      roundedRectPath(ctx, badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fillStyle = this.theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(24, 24, 27, 0.95)';
      ctx.fill();
      ctx.strokeStyle = this.theme === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle =
      shape.textColor || (this.theme === 'light' ? '#0f172a' : DEFAULT_TEXT_COLOR);

    if (anchor === 'center') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const startY = cy - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((line, i) => ctx.fillText(line, cx, startY + i * lineHeight));
    } else {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      lines.forEach((line, i) => ctx.fillText(line, cx, cy + i * lineHeight));
    }
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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

  private renderLegacyCommand(cmd: CanvasCommand): void {
    const ctx = this.ctx;
    if (!ctx) return;

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
        ctx.strokeStyle = cmd.color || '#94a3b8';
        ctx.lineWidth = cmd.lineWidth || 2;
        ctx.beginPath();
        ctx.moveTo(cmd.x1, cmd.y1);
        ctx.lineTo(cmd.x2, cmd.y2);
        ctx.stroke();
        break;
      }
      case 'text': {
        ctx.fillStyle = cmd.color || '#f8fafc';
        ctx.font = `${cmd.fontSize || 14}px ${CANVAS_FONT_STACK}`;
        ctx.fillText(cmd.text, cmd.x, cmd.y);
        break;
      }
      case 'graph': {
        for (const edge of cmd.edges) {
          const fromNode = cmd.nodes.find((n) => n.id === edge.from);
          const toNode = cmd.nodes.find((n) => n.id === edge.to);
          if (fromNode && toNode) {
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(toNode.x, toNode.y);
            ctx.stroke();

            if (edge.label) {
              const midX = (fromNode.x + toNode.x) / 2;
              const midY = (fromNode.y + toNode.y) / 2;
              ctx.fillStyle = '#94a3b8';
              ctx.font = `11px ${CANVAS_FONT_STACK}`;
              ctx.fillText(edge.label, midX + 5, midY - 5);
            }
          }
        }
        for (const node of cmd.nodes) {
          ctx.fillStyle = node.color || '#0284c7';
          ctx.beginPath();
          ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = `12px ${CANVAS_FONT_STACK}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(node.label, node.x, node.y);
        }
        break;
      }
    }
    ctx.restore();
  }
}

export const globalCanvasEngine = new CanvasEngine();
