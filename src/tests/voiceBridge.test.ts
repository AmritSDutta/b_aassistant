import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceBridge } from '../voice/bridge/voiceBridge';
import { ISubagentProvider } from '../voice/types/provider';
import { globalCanvasEngine } from '../lib/canvasEngine';

describe('VoiceBridge', () => {
  let mockSubagent: ISubagentProvider;
  let postedMessages: string[];

  beforeEach(() => {
    postedMessages = [];
    globalCanvasEngine.clear();

    mockSubagent = {
      id: 'mock-subagent',
      name: 'Mock Subagent',
      generateText: vi.fn(),
    };
  });

  it('delegates diagram generation to subagent, updates canvas, and posts substantive explanation to chat', async () => {
    const subagentResponse = `Here is the architecture:
\`\`\`json
{
  "shapes": [
    {
      "type": "rectangle",
      "id": "node_api",
      "text": "API Gateway",
      "x": 80,
      "y": 200,
      "width": 170,
      "height": 90,
      "fillColor": "gateway"
    },
    {
      "type": "rectangle",
      "id": "node_auth",
      "text": "Auth Service",
      "x": 300,
      "y": 200,
      "width": 170,
      "height": 90,
      "fillColor": "logic"
    },
    {
      "type": "arrow",
      "id": "conn_1",
      "startId": "node_api",
      "endId": "node_auth",
      "text": "verify"
    }
  ]
}
\`\`\`
### Architecture Analysis
The API gateway terminates incoming HTTPS requests and delegates authentication to the Auth Service before forwarding downstream.`;

    (mockSubagent.generateText as ReturnType<typeof vi.fn>).mockResolvedValue(subagentResponse);

    const bridge = new VoiceBridge({
      subagent: mockSubagent,
      postChatMessage: (msg: string) => postedMessages.push(msg),
    });

    const result = (await bridge.handleToolCall('generate_diagram_and_explanation', {
      prompt: 'Design an API Gateway with Auth Service',
      clearCanvasFirst: true,
    })) as { status: string; shapesRendered: number; summary: string };

    expect(result.status).toBe('success');
    expect(result.shapesRendered).toBe(3);
    expect(result.summary).toContain('Rendered 3 architecture elements');

    // Verify canvas scene contains the shapes
    const shapes = globalCanvasEngine.getShapes();
    expect(shapes.length).toBe(3);
    expect(shapes.find((s) => s.id === 'node_api')).toBeDefined();
    expect(shapes.find((s) => s.id === 'conn_1')).toBeDefined();

    // Verify substantive text posted to chat area (stripped of raw JSON)
    expect(postedMessages.length).toBe(1);
    expect(postedMessages[0]).toContain('### Architecture Analysis');
    expect(postedMessages[0]).not.toContain('```json');
  });

  it('executes calculate tool correctly through the bridge', async () => {
    const bridge = new VoiceBridge({
      subagent: mockSubagent,
      postChatMessage: (msg: string) => postedMessages.push(msg),
      toolContext: {
        calculate: (expr: string) => (expr === '2 + 2' ? 4 : 0),
      },
    });

    const result = (await bridge.handleToolCall('calculate', {
      expression: '2 + 2',
    })) as { expression: string; result: number };

    expect(result.expression).toBe('2 + 2');
    expect(result.result).toBe(4);
  });

  it('clears canvas when canvas2d_clear tool is called', async () => {
    globalCanvasEngine.appendShapes([
      { type: 'rectangle', id: 'temp1', text: 'Temp', x: 0, y: 0, width: 100, height: 100 },
    ]);
    expect(globalCanvasEngine.getShapes().length).toBe(1);

    const bridge = new VoiceBridge({
      subagent: mockSubagent,
      postChatMessage: (msg: string) => postedMessages.push(msg),
    });

    const res = (await bridge.handleToolCall('canvas2d_clear', {})) as { success: boolean };
    expect(res.success).toBe(true);
    expect(globalCanvasEngine.getShapes().length).toBe(0);
  });
});
