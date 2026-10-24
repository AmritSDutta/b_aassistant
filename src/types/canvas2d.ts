export type Canvas2dShapeType =
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'text'
  | 'arrow'
  | 'line'
  | 'freedraw'
  | 'sticker'
  | 'polygon'
  | 'path'
  | 'container';

export interface Canvas2dShape {
  id: string;
  type: Canvas2dShapeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  textColor?: string;
  fontSize?: number;

  // Arrow / connector topology bindings
  startId?: string;
  endId?: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  points?: Array<[number, number]>;

  // Arbitrary geometry & SVG path
  d?: string;

  // Technical & UML diagramming
  strokeDash?: number[];
  arrowhead?: 'filled' | 'open' | 'diamond' | 'none';
  bidirectional?: boolean;
  compartments?: string[];

  // Sticker attributes
  stickerColor?: 'yellow' | 'mint' | 'rose';
  emoji?: string;

  // Artistic & Rough.js parameters
  roughness?: number;
  bowing?: number;
  fillStyle?: 'hachure' | 'solid' | 'zigzag' | 'cross-hatch' | 'dots';
  hachureAngle?: number;
  hachureGap?: number;
  curved?: boolean;
  palette?: 'risograph' | 'editorial' | 'botanical' | 'cyberpunk';
  subtitle?: string;
}

export interface ShapeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Canvas2dView {
  scale: number;
  offsetX: number;
  offsetY: number;
}
