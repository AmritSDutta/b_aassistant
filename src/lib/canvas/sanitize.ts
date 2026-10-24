import { Canvas2dShape } from './types';
import { toFiniteNumber } from './geometry';

export function sanitizeCanvas2dShapes(raw: unknown[]): Canvas2dShape[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => item && typeof item === 'object' && typeof (item as any).type === 'string')
    .map((item, index) => {
      const el = { ...(item as any) } as Canvas2dShape & { label?: unknown };
      if (!el.id) {
        el.id = `c2d_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`;
      }

      // Normalize shape type aliases from external LLMs and diagrams
      const rawType = String(el.type).trim().toLowerCase();
      if (['container', 'group', 'boundary', 'cluster', 'subgraph', 'package'].includes(rawType)) {
        el.type = 'container';
      } else if (['poly', 'polygon', 'triangle', 'hexagon'].includes(rawType)) {
        el.type = 'polygon';
      } else if (['path', 'svg', 'icon', 'drawing'].includes(rawType)) {
        el.type = 'path';
      } else if (['rect', 'rectangle', 'box', 'card', 'node', 'square'].includes(rawType)) {
        el.type = 'rectangle';
      } else if (['ellipse', 'circle', 'oval', 'database', 'cylinder', 'db'].includes(rawType)) {
        el.type = 'ellipse';
      } else if (['diamond', 'rhombus', 'decision'].includes(rawType)) {
        el.type = 'diamond';
      } else if (['sticker', 'note', 'sticky', 'postit'].includes(rawType)) {
        el.type = 'sticker';
      } else if (['arrow', 'edge', 'connector'].includes(rawType)) {
        el.type = 'arrow';
      } else if (['line', 'segment'].includes(rawType)) {
        el.type = 'line';
      } else if (['text', 'label'].includes(rawType)) {
        el.type = 'text';
      } else if (['freedraw', 'draw', 'sketch'].includes(rawType)) {
        el.type = 'freedraw';
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
      const subtitleText =
        typeof el.subtitle === 'string' && el.subtitle.trim()
          ? el.subtitle
          : typeof (el as any).sublabel === 'string' && (el as any).sublabel.trim()
          ? (el as any).sublabel
          : typeof (el as any).description === 'string' && (el as any).description.trim()
          ? (el as any).description
          : undefined;
      delete (el as any).sublabel;
      delete (el as any).description;
      if (subtitleText && subtitleText.trim()) {
        el.subtitle = subtitleText.trim();
      }
      el.x = toFiniteNumber(el.x) ?? 80 * (index + 1);
      el.y = toFiniteNumber(el.y) ?? 80 * (index + 1);

      // SVG path string
      if (typeof el.d === 'string' && el.d.trim()) {
        el.d = el.d.trim();
      } else {
        delete el.d;
      }

      // Vertices array for polygon / freedraw
      if (Array.isArray(el.points)) {
        const validPoints: Array<[number, number]> = [];
        for (const pt of el.points) {
          if (Array.isArray(pt) && pt.length >= 2) {
            const px = toFiniteNumber(pt[0]);
            const py = toFiniteNumber(pt[1]);
            if (px !== undefined && py !== undefined) {
              validPoints.push([px, py]);
            }
          }
        }
        if (validPoints.length > 0) {
          el.points = validPoints;
        } else {
          delete el.points;
        }
      }

      // Stroke dash array
      if (Array.isArray(el.strokeDash)) {
        const validDashes = el.strokeDash
          .map((n) => toFiniteNumber(n))
          .filter((n): n is number => n !== undefined && n >= 0);
        if (validDashes.length > 0) {
          el.strokeDash = validDashes;
        } else {
          delete el.strokeDash;
        }
      }

      // Arrowhead style
      if (typeof el.arrowhead === 'string') {
        const ah = el.arrowhead.trim().toLowerCase();
        if (['filled', 'open', 'diamond', 'none'].includes(ah)) {
          el.arrowhead = ah as any;
        } else {
          delete el.arrowhead;
        }
      }

      // Bidirectional connector
      if (typeof el.bidirectional === 'boolean') {
        el.bidirectional = el.bidirectional;
      } else {
        delete el.bidirectional;
      }

      // UML class compartments
      if (Array.isArray(el.compartments)) {
        const validComps = el.compartments
          .map((c) => (typeof c === 'string' ? c.trim() : ''))
          .filter(Boolean);
        if (validComps.length > 0) {
          el.compartments = validComps;
        } else {
          delete el.compartments;
        }
      }

      const numericFields = [
        'width',
        'height',
        'strokeWidth',
        'fontSize',
        'roughness',
        'bowing',
        'hachureAngle',
        'hachureGap',
        'startX',
        'startY',
        'endX',
        'endY',
      ] as const;
      for (const field of numericFields) {
        const coerced = toFiniteNumber((el as any)[field]);
        if (coerced === undefined) {
          delete (el as any)[field];
        } else {
          (el as any)[field] = coerced;
        }
      }
      return el;
    });
}
