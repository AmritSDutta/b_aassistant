import { Canvas2dShape, Canvas2dView } from '../types/canvas2d';
import {
  sanitizeCanvas2dShapes,
  computeContentBounds,
  renderScene,
  renderLegacyCommand,
  type CanvasCommand,
} from './canvasHelper';

export type { CanvasCommand } from './canvasHelper';

export class CanvasEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private theme: 'dark' | 'light' = 'dark';
  private shapes: Canvas2dShape[] = [];
  private legacyCommands: CanvasCommand[] = [];
  private view: Canvas2dView = { scale: 1, offsetX: 0, offsetY: 0 };
  private themeObserver: MutationObserver | null = null;

  constructor() {
    this.syncThemeFromDom();
    if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined' && typeof document !== 'undefined' && document.documentElement) {
      this.themeObserver = new MutationObserver(() => {
        this.syncThemeFromDom();
        this.redraw();
      });
      this.themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }
  }

  private syncThemeFromDom(): void {
    if (typeof document !== 'undefined' && document.documentElement) {
      this.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
  }

  public getTheme(): 'dark' | 'light' {
    return this.theme;
  }

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
    if (!this.canvas) {
      this.resetView();
      return;
    }

    const bounds = computeContentBounds(this.shapes);
    if (!bounds) {
      this.resetView();
      return;
    }

    const { minX, minY, maxX, maxY } = bounds;
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
      renderLegacyCommand(this.ctx, command, this.theme);
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
      const bounds = computeContentBounds(this.shapes);
      if (!bounds) return this.canvas.toDataURL('image/png');

      const { minX, minY, maxX, maxY } = bounds;
      const contentW = Math.max(maxX - minX, 100);
      const contentH = Math.max(maxY - minY, 100);
      const offCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
      if (!offCanvas) return this.canvas.toDataURL('image/png');

      offCanvas.width = contentW + padding * 2;
      offCanvas.height = contentH + padding * 2;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return this.canvas.toDataURL('image/png');

      offCtx.fillStyle = this.getTheme() === 'light' ? '#ffffff' : '#09090b';
      offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

      offCtx.save();
      offCtx.translate(padding - minX, padding - minY);
      renderScene(offCtx, this.shapes, this.getTheme());
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
    renderScene(ctx, this.shapes, this.theme);

    // 2. Render Legacy Commands if any
    for (const cmd of this.legacyCommands) {
      renderLegacyCommand(ctx, cmd, this.theme);
    }

    ctx.restore();
  }
}

export const globalCanvasEngine = new CanvasEngine();
