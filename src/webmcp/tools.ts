import { WebMCPTool } from './types';
import { globalCanvasEngine, CanvasCommand } from '../lib/canvasEngine';

export interface ToolContext {
  getMessages: () => Array<{ sender: 'user' | 'agent'; text: string; timestamp: number }>;
  postMessage: (text: string) => void;
  searchDocument?: (query: string) => Promise<Array<{ pageNumber: number; text: string; score: number }>>;
  cleanDocument?: () => Promise<void>;
  searchWeb?: (query: string) => Promise<Array<{ title: string; snippet: string; url: string }>>;
  searchResearch?: (query: string) => Promise<Array<{ title: string; summary: string; authors: string[]; id: string }>>;
  calculate?: (expression: string) => number;
}

export const TOOL_DEFINITIONS: WebMCPTool[] = [
  {
    name: 'canvas_draw',
    description: 'Renders drawing primitives (rect, circle, line, text, graph) onto the top HTML canvas.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'object',
          description: 'A canvas drawing command: rect, circle, line, text, or graph.',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'canvas_clear',
    description: 'Clears all drawings from the HTML canvas.',
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
    name: 'chat_post',
    description: 'Appends an explanatory textual message to the bottom chat dialogue area.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The textual content to post to the chat.',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'search_document',
    description: 'Searches uploaded document chunks in in-browser IndexedDB using the BM25 index.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query keyword(s).',
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
    case 'canvas_draw': {
      const command = (args?.command as CanvasCommand) || (args as unknown as CanvasCommand);
      if (!command || !command.type) {
        throw new Error('Invalid canvas command object');
      }
      globalCanvasEngine.execute(command);
      return { success: true, message: `Rendered ${command.type} on canvas` };
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
