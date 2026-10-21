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
    })) as { status: string; asynchronous: boolean; taskId: string; message: string };

    expect(result.status).toBe('dispatched');
    expect(result.asynchronous).toBe(true);
    expect(result.taskId).toMatch(/^bassistant_task_/);
    expect(result.message).toContain('Visual subagent has been dispatched');

    // Wait for asynchronous background generation to finish
    await bridge.getActiveDiagramTask();

    // Check task status in browser cache / TaskManager
    const task = bridge.getTaskManager().getTask(result.taskId);
    expect(task?.status).toBe('completed');
    expect(task?.shapesCount).toBe(3);

    // Verify subagent called with date-anchored prompt and WebMCP tools catalog
    expect(mockSubagent.generateText).toHaveBeenCalledWith(
      expect.stringContaining('Design an API Gateway with Auth Service'),
      expect.stringContaining('You are working as of:')
    );
    expect(mockSubagent.generateText).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Available WebMCP Tools:')
    );

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

  it('handles background subagent failure gracefully without throwing', async () => {
    (mockSubagent.generateText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Subagent quota exceeded'));

    const bridge = new VoiceBridge({
      subagent: mockSubagent,
      postChatMessage: (msg: string) => postedMessages.push(msg),
    });

    const result = (await bridge.handleToolCall('generate_diagram_and_explanation', {
      prompt: 'Design an unavailable flow',
    })) as { status: string; asynchronous: boolean };

    expect(result.status).toBe('dispatched');
    expect(result.asynchronous).toBe(true);

    await bridge.getActiveDiagramTask();

    expect(postedMessages.some((msg) => msg.includes('Diagram Generation Notice'))).toBe(true);
  });

  it('serializes concurrent diagram dispatches so the newer diagram is never wiped', async () => {
    let resolveFirst: (value: string) => void = () => {};
    const firstCall = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });
    const generateText = mockSubagent.generateText as ReturnType<typeof vi.fn>;

    const bridge = new VoiceBridge({
      subagent: mockSubagent,
      postChatMessage: (msg: string) => postedMessages.push(msg),
    });

    const shapesJson = (label: string): string =>
      `\`\`\`json\n{"shapes":[{"type":"rectangle","id":"node_${label}","text":"${label}","x":80,"y":200,"width":170,"height":90}]}\n\`\`\`\n${label} analysis`;

    generateText.mockReturnValueOnce(firstCall);
    generateText.mockReturnValueOnce(Promise.resolve(shapesJson('Second')));

    const first = (await bridge.handleToolCall('generate_diagram_and_explanation', {
      prompt: 'First diagram',
    })) as { taskId: string };
    const second = (await bridge.handleToolCall('generate_diagram_and_explanation', {
      prompt: 'Second diagram',
    })) as { taskId: string };

    // While the first subagent call is still pending, the second task stays queued
    expect(bridge.getTaskManager().getTask(second.taskId)?.status).toBe('queued');

    resolveFirst(shapesJson('First'));
    await bridge.getActiveDiagramTask();

    // Both complete in dispatch order — canvas holds the latest diagram
    expect(bridge.getTaskManager().getTask(first.taskId)?.status).toBe('completed');
    expect(bridge.getTaskManager().getTask(second.taskId)?.status).toBe('completed');
    const shapes = globalCanvasEngine.getShapes();
    expect(shapes.length).toBe(1);
    expect(shapes[0].text).toBe('Second');
  });

  it('retrieves background task status via get_background_task_status tool', async () => {
    const bridge = new VoiceBridge({
      subagent: mockSubagent,
      postChatMessage: (msg: string) => postedMessages.push(msg),
    });

    bridge.getTaskManager().clearTasks();
    const emptyResult = (await bridge.handleToolCall('get_background_task_status', {})) as { found: boolean };
    expect(emptyResult.found).toBe(false);

    (mockSubagent.generateText as ReturnType<typeof vi.fn>).mockResolvedValue(
      '```json\n{"shapes":[]}\n```\nMinimal explanation'
    );
    const dispatch = (await bridge.handleToolCall('generate_diagram_and_explanation', {
      prompt: 'Quick pipeline check',
    })) as { taskId: string };

    await bridge.getActiveDiagramTask();

    const queryResult = (await bridge.handleToolCall('get_background_task_status', {
      taskId: dispatch.taskId,
    })) as { found: boolean; status: string; taskId: string };

    expect(queryResult.found).toBe(true);
    expect(queryResult.status).toBe('completed');
    expect(queryResult.taskId).toBe(dispatch.taskId);
  });
});
