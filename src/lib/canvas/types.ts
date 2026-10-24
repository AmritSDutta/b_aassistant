import { Canvas2dShape, ShapeBounds, Canvas2dShapeType } from '../../types/canvas2d';

export type { Canvas2dShape, ShapeBounds, Canvas2dShapeType };

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

export interface ContentBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
