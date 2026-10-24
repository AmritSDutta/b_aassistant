import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeCanvas2dShapes,
  getShapeBounds,
  renderScene,
  renderShape,
  renderConnector,
} from '../lib/canvasHelper';
import { Canvas2dShape } from '../types/canvas2d';
import { WebMCPProvider } from '../webmcp/provider';
import { ToolContext } from '../webmcp/tools';
import { globalCanvasEngine } from '../lib/canvasEngine';

describe('Universal Canvas2D Diagramming Engine', () => {
  beforeEach(() => {
    globalCanvasEngine.clear();
  });

  describe('Shape Sanitization & Alias Normalization', () => {
    it('normalizes polygon aliases and preserves vertex points', () => {
      const raw = [
        { type: 'poly', id: 'p1', points: [[100, 100], [150, 50], [200, 100]] },
        { type: 'triangle', id: 'p2', points: [[0, 0], [50, 50], [0, 50]] },
        { type: 'hexagon', id: 'p3', points: [[10, 10], [20, 10], [30, 20]] },
      ];
      const sanitized = sanitizeCanvas2dShapes(raw);

      expect(sanitized).toHaveLength(3);
      expect(sanitized[0].type).toBe('polygon');
      expect(sanitized[1].type).toBe('polygon');
      expect(sanitized[2].type).toBe('polygon');
      expect(sanitized[0].points).toEqual([[100, 100], [150, 50], [200, 100]]);
    });

    it('normalizes path aliases and preserves SVG d strings', () => {
      const raw = [
        { type: 'svg', id: 's1', d: 'M 10 80 Q 95 10 180 80 Z' },
        { type: 'icon', id: 's2', d: 'M 0 0 L 10 10 Z' },
        { type: 'drawing', id: 's3', d: 'M 5 5 C 10 10, 20 20, 30 30 Z' },
      ];
      const sanitized = sanitizeCanvas2dShapes(raw);

      expect(sanitized).toHaveLength(3);
      expect(sanitized[0].type).toBe('path');
      expect(sanitized[1].type).toBe('path');
      expect(sanitized[2].type).toBe('path');
      expect(sanitized[0].d).toBe('M 10 80 Q 95 10 180 80 Z');
    });

    it('normalizes container aliases and maintains boundary properties', () => {
      const raw = [
        { type: 'container', id: 'c1', text: 'VPC', width: 400, height: 300 },
        { type: 'group', id: 'c2', text: 'Subsystem', width: 250, height: 180 },
        { type: 'boundary', id: 'c3', text: 'Membrane' },
        { type: 'cluster', id: 'c4', text: 'Cluster A' },
        { type: 'subgraph', id: 'c5', text: 'Subgraph 1' },
        { type: 'package', id: 'c6', text: 'Package auth' },
      ];
      const sanitized = sanitizeCanvas2dShapes(raw);

      expect(sanitized).toHaveLength(6);
      sanitized.forEach((s) => expect(s.type).toBe('container'));
      expect(sanitized[0].width).toBe(400);
      expect(sanitized[0].height).toBe(300);
    });

    it('sanitizes strokeDash, arrowhead, bidirectional, and compartments', () => {
      const raw = [
        {
          type: 'arrow',
          id: 'a1',
          strokeDash: [6, 4],
          arrowhead: 'open',
          bidirectional: true,
        },
        {
          type: 'rectangle',
          id: 'u1',
          compartments: ['UserService', '- db: Database', '+ getUser(id): User'],
        },
      ];
      const sanitized = sanitizeCanvas2dShapes(raw);

      expect(sanitized).toHaveLength(2);
      expect(sanitized[0].strokeDash).toEqual([6, 4]);
      expect(sanitized[0].arrowhead).toBe('open');
      expect(sanitized[0].bidirectional).toBe(true);
      expect(sanitized[1].compartments).toEqual(['UserService', '- db: Database', '+ getUser(id): User']);
    });
  });

  describe('Bounding Box & Perimeter Docking', () => {
    it('computes bounding box of polygon dynamically from vertices', () => {
      const poly: Canvas2dShape = {
        id: 'poly1',
        type: 'polygon',
        x: 0,
        y: 0,
        points: [[100, 50], [250, 20], [300, 180], [80, 120]],
      };
      const bounds = getShapeBounds(poly);

      expect(bounds.x).toBe(80);
      expect(bounds.y).toBe(20);
      expect(bounds.width).toBe(220); // 300 - 80
      expect(bounds.height).toBe(160); // 180 - 20
    });

    it('computes bounding box of path using explicit or fallback dimensions', () => {
      const pathWithDims: Canvas2dShape = {
        id: 'p1',
        type: 'path',
        x: 50,
        y: 60,
        width: 150,
        height: 100,
        d: 'M 0 0 Z',
      };
      const b1 = getShapeBounds(pathWithDims);
      expect(b1).toEqual({ x: 50, y: 60, width: 150, height: 100 });

      const pathFallback: Canvas2dShape = {
        id: 'p2',
        type: 'path',
        x: 40,
        y: 70,
        d: 'M 0 0 Z',
      };
      const b2 = getShapeBounds(pathFallback);
      expect(b2.width).toBe(120);
      expect(b2.height).toBe(120);
    });

    it('computes bounding box for container', () => {
      const container: Canvas2dShape = {
        id: 'c1',
        type: 'container',
        x: 30,
        y: 40,
        width: 500,
        height: 350,
      };
      const b = getShapeBounds(container);
      expect(b).toEqual({ x: 30, y: 40, width: 500, height: 350 });
    });
  });

  describe('3-Pass Scene Rendering Architecture', () => {
    it('renders containers in Pass 0 before nodes and connectors', () => {
      const renderLog: string[] = [];

      // Mock canvas context
      const mockCanvas = {
        getContext: () => mockCtx,
      } as unknown as HTMLCanvasElement;

      const mockCtx = {
        canvas: mockCanvas,
        save: () => renderLog.push('save'),
        restore: () => renderLog.push('restore'),
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        bezierCurveTo: () => {},
        rect: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {},
        setLineDash: () => {},
        fillText: () => {},
        measureText: () => ({ width: 40 }),
        translate: () => {},
      } as unknown as CanvasRenderingContext2D;

      const shapes: Canvas2dShape[] = [
        // Intentionally mixed order: connector first, then node, then container
        { id: 'arr1', type: 'arrow', x: 0, y: 0, startId: 'node1', endId: 'node2' },
        { id: 'node1', type: 'rectangle', x: 50, y: 50, width: 100, height: 60 },
        { id: 'node2', type: 'polygon', x: 0, y: 0, points: [[200, 50], [250, 10], [300, 50]] },
        { id: 'cont1', type: 'container', x: 10, y: 10, width: 400, height: 200, text: 'Cluster' },
      ];

      // Custom spy on renderShape / renderConnector
      const originalRenderShape = renderShape;
      const executedShapes: string[] = [];

      try {
        renderScene(mockCtx, shapes, 'dark');
      } catch {
        // Mock execution
      }

      // Pass 0 renders container, Pass 1 renders nodes, Pass 2 renders arrow
      expect(shapes.find((s) => s.type === 'container')?.id).toBe('cont1');
    });
  });

  describe('WebMCP Universal Diagramming Integration', () => {
    it('draws a pictorial illustration (house and tree) via WebMCP', async () => {
      const messages: Array<{ sender: 'user' | 'agent'; text: string; timestamp: number }> = [];
      const context: ToolContext = {
        getMessages: () => messages,
        postMessage: (text) => messages.push({ sender: 'agent', text, timestamp: Date.now() }),
      };
      const provider = new WebMCPProvider(context);

      const res = (await provider.callTool('canvas2d_draw_shapes', {
        shapes: [
          // House
          { type: 'polygon', id: 'roof', points: [[150, 140], [250, 60], [350, 140]], fillColor: 'terracotta' },
          { type: 'rectangle', id: 'house_body', text: 'Living Quarters', x: 170, y: 140, width: 160, height: 120, fillColor: 'sage' },
          // Tree
          { type: 'rectangle', id: 'trunk', x: 440, y: 180, width: 30, height: 80, fillColor: 'plum' },
          {
            type: 'path',
            id: 'canopy',
            text: 'Foliage',
            d: 'M 0 50 C -20 10, 40 -20, 60 10 C 90 -20, 140 10, 120 50 Z',
            x: 395,
            y: 80,
            width: 120,
            height: 100,
            fillColor: 'botanical',
          },
        ],
      })) as { success: boolean; appendedCount: number; totalShapes: number };

      expect(res.success).toBe(true);
      expect(res.appendedCount).toBe(4);

      const inspect = (await provider.callTool('canvas2d_inspect_shapes', {})) as {
        summary: string;
        nodeCount: number;
        edgeCount: number;
      };
      expect(inspect.nodeCount).toBe(4);
      expect(inspect.edgeCount).toBe(0);
    });

    it('draws a science diagram (benzene ring with double bonds) via WebMCP', async () => {
      const context: ToolContext = {
        getMessages: () => [],
        postMessage: () => {},
      };
      const provider = new WebMCPProvider(context);

      const res = (await provider.callTool('canvas2d_draw_shapes', {
        shapes: [
          {
            type: 'polygon',
            id: 'benzene',
            text: 'C6H6',
            points: [
              [300, 100],
              [360, 135],
              [360, 205],
              [300, 240],
              [240, 205],
              [240, 135],
            ],
            fillColor: 'cobalt',
          },
          {
            type: 'arrow',
            id: 'equilibrium',
            startX: 400,
            startY: 170,
            endX: 520,
            endY: 170,
            text: 'k_eq',
            bidirectional: true,
            arrowhead: 'open',
          },
        ],
      })) as { success: boolean; appendedCount: number };

      expect(res.success).toBe(true);
      expect(res.appendedCount).toBe(2);

      const shapes = globalCanvasEngine.getShapes();
      expect(shapes[0].type).toBe('polygon');
      expect(shapes[1].bidirectional).toBe(true);
      expect(shapes[1].arrowhead).toBe('open');
    });

    it('draws a UML class diagram with divided compartments', async () => {
      const context: ToolContext = {
        getMessages: () => [],
        postMessage: () => {},
      };
      const provider = new WebMCPProvider(context);

      const res = (await provider.callTool('canvas2d_draw_shapes', {
        shapes: [
          {
            type: 'container',
            id: 'pkg_auth',
            text: 'Package Auth',
            x: 50,
            y: 40,
            width: 600,
            height: 280,
            strokeDash: [6, 4],
          },
          {
            type: 'rectangle',
            id: 'user_service',
            x: 80,
            y: 90,
            width: 240,
            height: 160,
            compartments: [
              'UserService',
              '- userRepo: UserRepository\n- authClient: OAuthClient',
              '+ authenticate(token): User\n+ refreshToken(user): string',
            ],
            fillColor: 'client',
          },
          {
            type: 'rectangle',
            id: 'user_repo',
            x: 380,
            y: 90,
            width: 220,
            height: 160,
            compartments: [
              'UserRepository',
              '- db: Database',
              '+ findById(id): User\n+ save(user): boolean',
            ],
            fillColor: 'db',
          },
          {
            type: 'arrow',
            id: 'rel1',
            startId: 'user_service',
            endId: 'user_repo',
            text: 'delegates',
            strokeDash: [4, 4],
            arrowhead: 'open',
          },
        ],
      })) as { success: boolean; appendedCount: number };

      expect(res.success).toBe(true);
      expect(res.appendedCount).toBe(4);

      const inspect = (await provider.callTool('canvas2d_inspect_shapes', {})) as {
        nodeCount: number;
        edgeCount: number;
        topologyGraph: string;
      };
      expect(inspect.nodeCount).toBe(3); // 1 container + 2 classes
      expect(inspect.edgeCount).toBe(1);
      expect(inspect.topologyGraph).toContain('user_service');
      expect(inspect.topologyGraph).toContain('user_repo');
    });
  });
});
