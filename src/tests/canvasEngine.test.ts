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

  it('correctly identifies light and dark colors', async () => {
    const { isLightColor, isDarkColor } = await import('../lib/canvasEngine');
    expect(isLightColor('white')).toBe(true);
    expect(isLightColor('#ffffff')).toBe(true);
    expect(isLightColor('#e5e7eb')).toBe(true);
    expect(isLightColor('#94a3b8')).toBe(true);
    expect(isLightColor('#0f172a')).toBe(false);

    expect(isDarkColor('black')).toBe(true);
    expect(isDarkColor('#000000')).toBe(true);
    expect(isDarkColor('#0f172a')).toBe(true);
    expect(isDarkColor('#ffffff')).toBe(false);
  });

  it('resolves universal medium dark yellow for element labels across both light and dark modes', async () => {
    const { resolveThemeTextColor, MEDIUM_DARK_YELLOW } = await import('../lib/canvasEngine');

    expect(MEDIUM_DARK_YELLOW).toBe('#d97706');

    // Default text color is medium dark yellow in both modes
    expect(resolveThemeTextColor(undefined, 'light')).toBe(MEDIUM_DARK_YELLOW);
    expect(resolveThemeTextColor(undefined, 'dark')).toBe(MEDIUM_DARK_YELLOW);

    // Generic light/white colors adapt to medium dark yellow
    expect(resolveThemeTextColor('white', 'light')).toBe(MEDIUM_DARK_YELLOW);
    expect(resolveThemeTextColor('#ffffff', 'light')).toBe(MEDIUM_DARK_YELLOW);
    expect(resolveThemeTextColor('#e5e7eb', 'light')).toBe(MEDIUM_DARK_YELLOW);
    expect(resolveThemeTextColor('#94a3b8', 'light')).toBe(MEDIUM_DARK_YELLOW);

    // Generic dark/black colors adapt to medium dark yellow
    expect(resolveThemeTextColor('#000000', 'dark')).toBe(MEDIUM_DARK_YELLOW);
    expect(resolveThemeTextColor('#0f172a', 'dark')).toBe(MEDIUM_DARK_YELLOW);

    // Universal medium dark yellow across light and dark modes
    expect(resolveThemeTextColor(MEDIUM_DARK_YELLOW, 'light')).toBe(MEDIUM_DARK_YELLOW);
    expect(resolveThemeTextColor(MEDIUM_DARK_YELLOW, 'dark')).toBe(MEDIUM_DARK_YELLOW);

    // Connector pill badges resolve to medium dark yellow
    expect(resolveThemeTextColor('white', 'light', true)).toBe(MEDIUM_DARK_YELLOW);
    expect(resolveThemeTextColor('#0f172a', 'dark', true)).toBe(MEDIUM_DARK_YELLOW);

    // Translucent and opaque fills with generic text adapt to medium dark yellow
    expect(resolveThemeTextColor(undefined, 'light', false, 'rgba(99, 102, 241, 0.18)')).toBe(MEDIUM_DARK_YELLOW);
    expect(resolveThemeTextColor('#ffffff', 'light', false, 'rgba(16, 185, 129, 0.16)')).toBe(MEDIUM_DARK_YELLOW);
  });

  it('resolves theme-conducive stroke colors for connector lines', async () => {
    const { resolveThemeStrokeColor } = await import('../lib/canvasEngine');

    // In light mode: default or light strokes become Slate 700 (#334155)
    expect(resolveThemeStrokeColor(undefined, 'light')).toBe('#334155');
    expect(resolveThemeStrokeColor('#94a3b8', 'light')).toBe('#334155');
    expect(resolveThemeStrokeColor('#cbd5e1', 'light')).toBe('#334155');
    expect(resolveThemeStrokeColor('white', 'light')).toBe('#334155');

    // In dark mode: default or dark strokes become Slate 400 (#94a3b8)
    expect(resolveThemeStrokeColor(undefined, 'dark')).toBe('#94a3b8');
    expect(resolveThemeStrokeColor('#0f172a', 'dark')).toBe('#94a3b8');
    expect(resolveThemeStrokeColor('#38bdf8', 'dark')).toBe('#38bdf8');
  });

  it('tracks theme via getTheme() and updates on setTheme()', () => {
    engine.setTheme('light');
    expect(engine.getTheme()).toBe('light');

    engine.setTheme('dark');
    expect(engine.getTheme()).toBe('dark');
  });
});
