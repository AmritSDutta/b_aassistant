import { describe, it, expect, beforeEach } from 'vitest';
import { CanvasEngine, CanvasCommand } from '../lib/canvasEngine';

describe('CanvasEngine', () => {
  let engine: CanvasEngine;

  beforeEach(() => {
    engine = new CanvasEngine();
  });

  it('records commands in history and preserves execution order', () => {
    const rectCmd: CanvasCommand = {
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      color: '#38bdf8',
    };

    const textCmd: CanvasCommand = {
      type: 'text',
      x: 15,
      y: 35,
      text: 'Test Node',
      fontSize: 14,
    };

    engine.execute(rectCmd);
    engine.execute(textCmd);

    const history = engine.getHistory();
    expect(history.length).toBe(2);
    expect(history[0]).toEqual(rectCmd);
    expect(history[1]).toEqual(textCmd);
  });

  it('clears command history on clear command', () => {
    engine.execute({
      type: 'circle',
      x: 50,
      y: 50,
      radius: 25,
    });

    expect(engine.getHistory().length).toBe(1);

    engine.clear();
    expect(engine.getHistory().length).toBe(0);
  });

  it('executes batch commands accurately', () => {
    const commands: CanvasCommand[] = [
      { type: 'line', x1: 0, y1: 0, x2: 100, y2: 100 },
      {
        type: 'graph',
        nodes: [
          { id: '1', label: 'Start', x: 20, y: 20 },
          { id: '2', label: 'End', x: 80, y: 80 },
        ],
        edges: [{ from: '1', to: '2', label: 'next' }],
      },
    ];

    engine.executeBatch(commands);
    expect(engine.getHistory().length).toBe(2);
  });
});
