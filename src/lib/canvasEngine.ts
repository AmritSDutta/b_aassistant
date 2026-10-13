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

export class CanvasEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private commandHistory: CanvasCommand[] = [];

  public attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.redraw();
  }

  public detach(): void {
    this.canvas = null;
    this.ctx = null;
  }

  public clear(): void {
    this.commandHistory = [];
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  public execute(command: CanvasCommand): void {
    if (command.type === 'clear') {
      this.clear();
      return;
    }

    this.commandHistory.push(command);
    if (this.ctx) {
      this.renderCommand(command);
    }
  }

  public executeBatch(commands: CanvasCommand[]): void {
    for (const cmd of commands) {
      this.execute(cmd);
    }
  }

  public getHistory(): CanvasCommand[] {
    return [...this.commandHistory];
  }

  public redraw(): void {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const cmd of this.commandHistory) {
      this.renderCommand(cmd);
    }
  }

  private renderCommand(cmd: CanvasCommand): void {
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
        ctx.beginPath();
        ctx.arc(cmd.x, cmd.y, cmd.radius, 0, Math.PI * 2);
        ctx.strokeStyle = cmd.color || '#34d399';
        ctx.fillStyle = cmd.color || '#34d399';
        if (cmd.fill) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
        break;
      }
      case 'line': {
        ctx.beginPath();
        ctx.moveTo(cmd.x1, cmd.y1);
        ctx.lineTo(cmd.x2, cmd.y2);
        ctx.strokeStyle = cmd.color || '#94a3b8';
        ctx.lineWidth = cmd.lineWidth || 2;
        ctx.stroke();
        break;
      }
      case 'text': {
        ctx.fillStyle = cmd.color || '#f8fafc';
        ctx.font = `${cmd.fontSize || 14}px monospace`;
        ctx.fillText(cmd.text, cmd.x, cmd.y);
        break;
      }
      case 'graph': {
        const nodeMap = new Map<string, GraphNode>();
        for (const node of cmd.nodes) {
          nodeMap.set(node.id, node);
        }

        // Draw edges
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        for (const edge of cmd.edges) {
          const fromNode = nodeMap.get(edge.from);
          const toNode = nodeMap.get(edge.to);
          if (fromNode && toNode) {
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(toNode.x, toNode.y);
            ctx.stroke();

            if (edge.label) {
              const midX = (fromNode.x + toNode.x) / 2;
              const midY = (fromNode.y + toNode.y) / 2;
              ctx.fillStyle = '#94a3b8';
              ctx.font = '10px monospace';
              ctx.fillText(edge.label, midX + 4, midY - 4);
            }
          }
        }

        // Draw nodes
        for (const node of cmd.nodes) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
          ctx.fillStyle = node.color || '#1e293b';
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#f8fafc';
          ctx.font = '11px sans-serif';
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
