import { WebMCPTool } from './types';
import { globalCanvasEngine, CanvasCommand } from '../lib/canvasEngine';
import { Canvas2dShape } from '../types/canvas2d';

export interface ToolContext {
  getMessages: () => Array<{ sender: 'user' | 'agent'; text: string; timestamp: number }>;
  postMessage: (text: string) => void;
  searchDocument?: (query: string) => Promise<Array<{ pageNumber: number; text: string; score: number }>>;
  cleanDocument?: () => Promise<void>;
  searchWeb?: (query: string) => Promise<Array<{ title: string; snippet: string; url: string }>>;
  searchResearch?: (query: string) => Promise<Array<{ title: string; summary: string; authors: string[]; id: string }>>;
  calculate?: (expression: string) => number;
  exportPdf?: () => void;
}

export const TOOL_DEFINITIONS: WebMCPTool[] = [
  {
    name: 'chat_post',
    description: 'Posts a response, answer, or status message to the bottom chat dialogue stream on behalf of the AI assistant.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The textual message or markdown content to display in the chat area.',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'canvas2d_draw_shapes',
    description:
      'Appends new structured Canvas2D shapes (rectangle, ellipse, diamond, text, arrow, line, sticker) onto the HTML canvas scene graph. Arrows attach dynamically to node boundaries via startId/endId and stay attached when shapes move. Supports soft-translucent colors: client "rgba(99,102,241,0.18)" (#818cf8), gateway "rgba(16,185,129,0.16)" (#34d399), db "rgba(168,85,247,0.18)" (#c084fc), queue "rgba(251,146,60,0.18)" (#fb923c), decision "rgba(250,204,21,0.16)" (#fbbf24), or sticker (stickerColor: "yellow"|"mint"|"rose", emoji: "⚠️"|"💡").',
    inputSchema: {
      type: 'object',
      properties: {
        shapes: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of Canvas2D shape objects to append to the canvas scene graph.',
        },
      },
      required: ['shapes'],
    },
  },
  {
    name: 'canvas2d_inspect_shapes',
    description:
      'Inspects the active Canvas2D scene graph: returns summary metrics, active node objects, and an ASCII topology graph (e.g. [Client] --[1. HTTPS]--> [Gateway]) so you can inspect existing layout before modifying it.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'canvas2d_modify_shape',
    description:
      'Performs a targeted in-place modification on an existing Canvas2D shape (renaming text label, updating fill/stroke colors, or repositioning via x/y) without clearing other shapes. Arrows stay attached automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: {
          type: 'string',
          description: 'The unique ID or text label of the shape to modify (e.g. "api" or "Web Client").',
        },
        newLabel: {
          type: 'string',
          description: 'Optional new label text for the shape.',
        },
        fillColor: {
          type: 'string',
          description: 'Optional new background fill color (rgba or hex).',
        },
        strokeColor: {
          type: 'string',
          description: 'Optional new stroke border color.',
        },
        x: {
          type: 'number',
          description: 'Optional new X coordinate.',
        },
        y: {
          type: 'number',
          description: 'Optional new Y coordinate.',
        },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'canvas2d_clear',
    description: 'Resets and clears all shapes from the Canvas2D scene graph and canvas viewport.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'export_pdf',
    description: 'Generates and downloads a publication-quality session PDF report containing the canvas diagram snapshot fitted at the top and the complete dialogue transcript beneath.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'canvas_draw',
    description: 'Draws single or batch shapes, lines, or annotations onto the top HTML canvas. Accepts commands like rect, circle, line, text, or graph.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'object',
          description: 'A drawing command object with "type" ("rect" | "circle" | "line" | "text" | "graph") and coordinates.',
        },
        commands: {
          type: 'array',
          items: { type: 'object' },
          description: 'Optional batch of multiple drawing commands to render sequentially.',
        },
      },
    },
  },
  {
    name: 'draw_diagram',
    description: 'Draws a connected architecture diagram, flowchart, or concept graph on the HTML canvas with nodes and directional edges.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Optional diagram title displayed at the top.',
        },
        nodes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              x: { type: 'number' },
              y: { type: 'number' },
              color: { type: 'string' },
            },
            required: ['id', 'label', 'x', 'y'],
          },
          description: 'List of graph nodes with id, label, x, y coordinates.',
        },
        edges: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              label: { type: 'string' },
            },
            required: ['from', 'to'],
          },
          description: 'List of connecting edges between node IDs with optional relationship labels.',
        },
        clearFirst: {
          type: 'boolean',
          description: 'Whether to clear existing canvas drawings before rendering this diagram (default: false).',
        },
      },
      required: ['nodes', 'edges'],
    },
  },
  {
    name: 'canvas_clear',
    description: 'Clears all drawings, diagrams, and shapes from the HTML canvas.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_chat_history',
    description: 'Returns the list of recent messages in the dialogue stream, with user prompts prefixed by "user:".',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'search_document',
    description: 'Searches uploaded document chunks in in-browser IndexedDB using a lexical BM25 index. Returns top 3 relevant pages. For best results, use targeted keywords or topic entities (e.g. "architecture", "revenue", "authentication", "pricing") rather than conversational questions.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search keywords or topic terms to query. Provide specific keywords rather than conversational sentences.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'clean_document',
    description: 'Deletes all stored document chunks and BM25 index from IndexedDB, resetting the file upload box.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'search_web',
    description: 'Searches the web using DuckDuckGo.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to look up on the web.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_research',
    description: 'Searches academic papers and preprints on ArXiv.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The scientific research query.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'calculate',
    description: 'Evaluates decimal math expressions accurately.',
    inputSchema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The decimal math expression to evaluate (e.g., "12.5 * 4.2 + 3.1").',
        },
      },
      required: ['expression'],
    },
  },
];

export async function executeToolCall(
  name: string,
  args: Record<string, unknown> | undefined,
  context: ToolContext
): Promise<unknown> {
  switch (name) {
    case 'canvas2d_draw_shapes': {
      let rawShapes: unknown[] = [];
      if (Array.isArray(args?.shapes)) {
        rawShapes = args.shapes;
      } else if (typeof args?.shapes === 'string') {
        try {
          rawShapes = JSON.parse(args.shapes);
        } catch (e: any) {
          throw new Error(`Failed to parse shapes JSON: ${e.message}`);
        }
      }
      if (!Array.isArray(rawShapes)) {
        throw new Error('"shapes" argument must be an array of shape objects');
      }
      const appended = globalCanvasEngine.appendShapes(rawShapes as Canvas2dShape[]);
      const total = globalCanvasEngine.getShapes().length;
      return { success: true, appendedCount: appended, totalShapes: total };
    }

    case 'canvas2d_inspect_shapes': {
      const summary = globalCanvasEngine.getTopologySummary();
      const shapes = globalCanvasEngine.getShapes();
      return {
        summary: summary.summary,
        topologyGraph: summary.asciiGraph,
        nodeCount: summary.nodeCount,
        edgeCount: summary.edgeCount,
        shapes,
      };
    }

    case 'canvas2d_modify_shape': {
      const nodeId = String(args?.nodeId || '');
      if (!nodeId) throw new Error('"nodeId" argument is required');

      const patch: Partial<Canvas2dShape> = {};
      if (args?.newLabel) patch.text = String(args.newLabel);
      if (args?.fillColor) patch.fillColor = String(args.fillColor);
      if (args?.strokeColor) patch.strokeColor = String(args.strokeColor);
      if (typeof args?.x === 'number') patch.x = args.x;
      if (typeof args?.y === 'number') patch.y = args.y;

      const res = globalCanvasEngine.modifyShape(nodeId, patch);
      return { success: res.modifiedCount > 0, ...res };
    }

    case 'canvas2d_clear': {
      globalCanvasEngine.clear();
      return { success: true, message: 'Canvas2D scene cleared' };
    }

    case 'export_pdf': {
      if (context.exportPdf) {
        context.exportPdf();
        return { success: true, message: 'PDF report generated and download initiated.' };
      }
      throw new Error('PDF export capability not available');
    }

    case 'canvas_draw': {
      if (Array.isArray(args?.commands)) {
        globalCanvasEngine.executeBatch(args.commands as CanvasCommand[]);
        return { success: true, message: `Rendered ${args.commands.length} commands on canvas` };
      }
      const command = (args?.command as CanvasCommand) || (args as unknown as CanvasCommand);
      if (!command || !command.type) {
        throw new Error('Invalid canvas command object. Expected command with type (rect, circle, line, text, graph).');
      }
      globalCanvasEngine.execute(command);
      return { success: true, message: `Rendered ${command.type} on canvas` };
    }

    case 'draw_diagram': {
      if (args?.clearFirst) {
        globalCanvasEngine.clear();
      }
      const nodes = Array.isArray(args?.nodes) ? args.nodes : [];
      const edges = Array.isArray(args?.edges) ? args.edges : [];
      const title = typeof args?.title === 'string' ? args.title : undefined;

      if (title) {
        globalCanvasEngine.execute({
          type: 'text',
          x: 20,
          y: 30,
          text: title,
          color: '#38bdf8',
          fontSize: 16,
        });
      }

      globalCanvasEngine.execute({
        type: 'graph',
        nodes: nodes as any,
        edges: edges as any,
      });

      return {
        success: true,
        message: `Diagram rendered with ${nodes.length} nodes and ${edges.length} edges`,
      };
    }

    case 'canvas_clear': {
      globalCanvasEngine.clear();
      return { success: true, message: 'Canvas cleared' };
    }

    case 'get_chat_history': {
      const msgs = context.getMessages();
      return {
        messages: msgs.map((m) => ({
          formatted: `${m.sender === 'user' ? 'user:' : 'agent:'} ${m.text}`,
          sender: m.sender,
          text: m.text,
          timestamp: m.timestamp,
        })),
      };
    }

    case 'chat_post': {
      const text = String(args?.text || '');
      if (!text) throw new Error('Missing "text" argument');
      context.postMessage(text);
      return { success: true, message: 'Message posted to chat' };
    }

    case 'search_document': {
      const query = String(args?.query || '');
      if (!context.searchDocument) {
        return { results: [], message: 'Document search service not available yet' };
      }
      const results = await context.searchDocument(query);
      return { results };
    }

    case 'clean_document': {
      if (context.cleanDocument) {
        await context.cleanDocument();
      }
      return { success: true, message: 'Document storage cleaned' };
    }

    case 'search_web': {
      const query = String(args?.query || '');
      if (!context.searchWeb) {
        return { results: [], message: 'Web search not available' };
      }
      const results = await context.searchWeb(query);
      return { results };
    }

    case 'search_research': {
      const query = String(args?.query || '');
      if (!context.searchResearch) {
        return { results: [], message: 'Research search not available' };
      }
      const results = await context.searchResearch(query);
      return { results };
    }

    case 'calculate': {
      const expression = String(args?.expression || '');
      if (!context.calculate) {
        throw new Error('Calculator service not available');
      }
      const result = context.calculate(expression);
      return { expression, result };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
