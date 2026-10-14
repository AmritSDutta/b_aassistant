import { describe, it, expect, beforeEach } from 'vitest';
import { CanvasEngine, perimeterEdgeToEdge, sanitizeCanvas2dShapes, applyThemeAlpha } from '../lib/canvasEngine';
import { Canvas2dShape } from '../types/canvas2d';

describe('Canvas2D Advanced Engine & Scene Graph', () => {
  let engine: CanvasEngine;

  beforeEach(() => {
    engine = new CanvasEngine();
  });

  it('calculates perimeter edge-to-edge docking for facing shape boundaries', () => {
    // Node A (100, 200, 160x80) center is (180, 240)
    // Node B (400, 200, 160x80) center is (480, 240)
    // Primary flow is along X-axis (dx > dy), facing edge is A's right border (x = 260) to B's left border (x = 400)
    const boundsA = { x: 100, y: 200, width: 160, height: 80 };
    const boundsB = { x: 400, y: 200, width: 160, height: 80 };

    const [x1, y1, x2, y2] = perimeterEdgeToEdge(boundsA, boundsB);
    expect(x1).toBe(260);
    expect(y1).toBe(240);
    expect(x2).toBe(400);
    expect(y2).toBe(240);
  });

  it('sanitizes incoming LLM shape payloads accurately', () => {
    const raw = [
      { type: 'rectangle', label: 'API Gateway', x: 200, y: 150 },
      { type: 'ellipse', text: 'Database', x: 500, y: 150 },
      { junk: 'discard' },
    ];

    const sanitized = sanitizeCanvas2dShapes(raw);
    expect(sanitized.length).toBe(2);
    expect(sanitized[0].text).toBe('API Gateway');
    expect(sanitized[0].id).toBeDefined();
    expect(sanitized[1].text).toBe('Database');
  });

  it('manages scene graph state and appends shapes seamlessly', () => {
    const shapes: Canvas2dShape[] = [
      { id: 'client', type: 'rectangle', x: 100, y: 100, text: 'Client' },
      { id: 'server', type: 'rectangle', x: 400, y: 100, text: 'Server' },
      { id: 'arr1', type: 'arrow', x: 0, y: 0, startId: 'client', endId: 'server', text: 'HTTP GET' },
    ];

    const count = engine.appendShapes(shapes);
    expect(count).toBe(3);
    expect(engine.getShapes().length).toBe(3);

    const summary = engine.getTopologySummary();
    expect(summary.nodeCount).toBe(2);
    expect(summary.edgeCount).toBe(1);
    expect(summary.asciiGraph).toContain('[Client] --[HTTP GET]--> [Server]');
  });

  it('modifies shapes in-place without corrupting the scene graph', () => {
    const shapes: Canvas2dShape[] = [
      { id: 'redis', type: 'rectangle', x: 100, y: 100, text: 'Redis Cache', fillColor: 'rgba(251,146,60,0.18)' },
    ];
    engine.appendShapes(shapes);

    const res = engine.modifyShape('redis', {
      text: 'Redis Cluster v7',
      strokeColor: '#f97316',
      x: 120,
    });

    expect(res.modifiedCount).toBe(1);
    const updated = engine.getShapes();
    expect(updated[0].text).toBe('Redis Cluster v7');
    expect(updated[0].strokeColor).toBe('#f97316');
    expect(updated[0].x).toBe(120);
  });

  it('manages 2D viewport pan, zoomAtPoint, and resetView', () => {
    expect(engine.getView()).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });

    engine.pan(50, -30);
    expect(engine.getView()).toEqual({ scale: 1, offsetX: 50, offsetY: -30 });

    // Zoom in pinned around point (100, 100)
    engine.zoomAtPoint(-100, 100, 100);
    const viewAfterZoom = engine.getView();
    expect(viewAfterZoom.scale).toBeCloseTo(1.1, 2);

    engine.resetView();
    expect(engine.getView()).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
  });

  it('boosts contrast alpha in light theme while preserving dark theme fills', () => {
    const fill = 'rgba(99, 102, 241, 0.18)';

    const lightBoosted = applyThemeAlpha(fill, 'light');
    expect(lightBoosted).toContain('0.324'); // 0.18 * 1.8

    const darkPreserved = applyThemeAlpha(fill, 'dark');
    expect(darkPreserved).toBe(fill);
  });
});
