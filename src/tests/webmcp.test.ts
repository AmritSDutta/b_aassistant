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
    expect(names).toContain('canvas2d_draw_shapes');
    expect(names).toContain('canvas2d_inspect_shapes');
    expect(names).toContain('canvas2d_modify_shape');
    expect(names).toContain('canvas2d_clear');
    expect(names).toContain('export_pdf');
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

  it('executes draw_diagram tool for LLM connected architecture graphs', async () => {
    const res = await provider.callTool('draw_diagram', {
      title: 'Microservices Architecture',
      nodes: [
        { id: 'client', label: 'Web Client', x: 50, y: 100 },
        { id: 'gateway', label: 'API Gateway', x: 200, y: 100 },
        { id: 'service', label: 'Auth Service', x: 350, y: 100 },
      ],
      edges: [
        { from: 'client', to: 'gateway', label: 'HTTPS' },
        { from: 'gateway', to: 'service', label: 'gRPC' },
      ],
      clearFirst: true,
    });

    expect(res).toHaveProperty('success', true);
    // Should have title text + graph command
    const history = globalCanvasEngine.getHistory();
    expect(history.length).toBe(2);
    expect(history[0].type).toBe('text');
    expect(history[1].type).toBe('graph');
  });

  it('supports batch drawing commands via canvas_draw', async () => {
    await provider.callTool('canvas_draw', {
      commands: [
        { type: 'rect', x: 0, y: 0, width: 50, height: 50 },
        { type: 'circle', x: 80, y: 80, radius: 25 },
        { type: 'line', x1: 0, y1: 0, x2: 80, y2: 80 },
      ],
    });

    expect(globalCanvasEngine.getHistory().length).toBe(3);
  });

  it('executes canvas2d_draw_shapes, canvas2d_inspect_shapes, and canvas2d_modify_shape', async () => {
    // 1. Draw shapes
    const drawRes = (await provider.callTool('canvas2d_draw_shapes', {
      shapes: [
        { id: 'web', type: 'rectangle', text: 'Web App', x: 50, y: 50 },
        { id: 'api', type: 'rectangle', text: 'API Gateway', x: 250, y: 50 },
        { type: 'arrow', x: 0, y: 0, startId: 'web', endId: 'api', text: 'REST' },
      ],
    })) as { success: boolean; appendedCount: number; totalShapes: number };

    expect(drawRes.success).toBe(true);
    expect(drawRes.appendedCount).toBe(3);

    // 2. Inspect shapes
    const inspectRes = (await provider.callTool('canvas2d_inspect_shapes', {})) as {
      summary: string;
      nodeCount: number;
      edgeCount: number;
    };
    expect(inspectRes.nodeCount).toBe(2);
    expect(inspectRes.edgeCount).toBe(1);

    // 3. Modify shape
    const modRes = (await provider.callTool('canvas2d_modify_shape', {
      nodeId: 'api',
      newLabel: 'API Gateway v2',
      fillColor: 'rgba(16,185,129,0.16)',
    })) as { success: boolean; modifiedCount: number };
    expect(modRes.success).toBe(true);
    expect(modRes.modifiedCount).toBe(1);

    // 4. Clear Canvas2D scene
    const clearRes = (await provider.callTool('canvas2d_clear', {})) as { success: boolean };
    expect(clearRes.success).toBe(true);
    expect(globalCanvasEngine.getShapes().length).toBe(0);
  });

  it('handles export_pdf tool execution gracefully', async () => {
    let pdfCalled = false;
    const customContext: ToolContext = {
      getMessages: () => [],
      postMessage: () => {},
      exportPdf: () => {
        pdfCalled = true;
        return { success: true };
      },
    };
    const customProvider = new WebMCPProvider(customContext);
    const res = (await customProvider.callTool('export_pdf', {})) as { success: boolean };
    expect(res.success).toBe(true);
    expect(pdfCalled).toBe(true);
  });

  it('rejects export_pdf tool call when session is blank', async () => {
    const customContext: ToolContext = {
      getMessages: () => [],
      postMessage: () => {},
      exportPdf: () => {
        return { success: false, error: 'Cannot export an empty session.' };
      },
    };
    const customProvider = new WebMCPProvider(customContext);
    await expect(customProvider.callTool('export_pdf', {})).rejects.toThrow(
      'Cannot export an empty session.'
    );
  });
});

