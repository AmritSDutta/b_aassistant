import { describe, it, expect, beforeEach } from 'vitest';
import { WebMCPProvider } from '../webmcp/provider';
import { ToolContext } from '../webmcp/tools';
import { globalCanvasEngine } from '../lib/canvasEngine';

describe('WebMCP Provider & Tools', () => {
  let messages: Array<{ sender: 'user' | 'agent'; text: string; timestamp: number }>;
  let context: ToolContext;
  let provider: WebMCPProvider;

  beforeEach(() => {
    messages = [
      { sender: 'user', text: 'Hello, draw an architecture diagram', timestamp: 1000 },
    ];
    context = {
      getMessages: () => messages,
      postMessage: (text: string) => {
        messages.push({ sender: 'agent', text, timestamp: Date.now() });
      },
    };
    provider = new WebMCPProvider(context);
    globalCanvasEngine.clear();
  });

  it('lists all required WebMCP tools with schemas', () => {
    const tools = provider.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain('canvas_draw');
    expect(names).toContain('canvas_clear');
    expect(names).toContain('get_chat_history');
    expect(names).toContain('chat_post');
    expect(names).toContain('search_document');
    expect(names).toContain('clean_document');
    expect(names).toContain('search_web');
    expect(names).toContain('search_research');
    expect(names).toContain('calculate');
  });

  it('executes canvas_draw and updates canvas history', async () => {
    const result = await provider.callTool('canvas_draw', {
      command: {
        type: 'rect',
        x: 10,
        y: 10,
        width: 100,
        height: 60,
      },
    });

    expect(result).toHaveProperty('success', true);
    expect(globalCanvasEngine.getHistory().length).toBe(1);
    expect(globalCanvasEngine.getHistory()[0].type).toBe('rect');
  });

  it('executes get_chat_history and chat_post', async () => {
    // 1. Get initial history
    const history1 = (await provider.callTool('get_chat_history')) as {
      messages: Array<{ formatted: string; sender: string }>;
    };
    expect(history1.messages.length).toBe(1);
    expect(history1.messages[0].formatted).toBe('user: Hello, draw an architecture diagram');

    // 2. Post agent message
    await provider.callTool('chat_post', { text: 'Drawing diagram now!' });

    // 3. Get updated history
    const history2 = (await provider.callTool('get_chat_history')) as {
      messages: Array<{ formatted: string; sender: string }>;
    };
    expect(history2.messages.length).toBe(2);
    expect(history2.messages[1].formatted).toBe('agent: Drawing diagram now!');
  });

  it('executes canvas_clear and empties history', async () => {
    await provider.callTool('canvas_draw', {
      command: { type: 'circle', x: 20, y: 20, radius: 10 },
    });
    expect(globalCanvasEngine.getHistory().length).toBe(1);

    await provider.callTool('canvas_clear');
    expect(globalCanvasEngine.getHistory().length).toBe(0);
  });
});
