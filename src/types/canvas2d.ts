export type Canvas2dShapeType =
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'text'
  | 'arrow'
  | 'line'
  | 'freedraw'
  | 'sticker';

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

  // Sticker attributes
  stickerColor?: 'yellow' | 'mint' | 'rose';
  emoji?: string;
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
