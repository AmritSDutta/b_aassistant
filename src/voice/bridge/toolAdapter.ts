import { ToolDeclaration } from '../types/provider';

export function getVoiceToolDeclarations(): ToolDeclaration[] {
  return [
    {
      name: 'generate_diagram_and_explanation',
      description:
        'Generates an architectural diagram on the visual canvas and writes a substantive technical explanation into the chat area. Call this whenever the user asks to draw, diagram, design an architecture, or visualize a system.',
      parameters: {
        type: 'OBJECT',
        properties: {
          prompt: {
            type: 'STRING',
            description: 'The architectural, business process, or system design prompt to visualize and document.',
          },
          clearCanvasFirst: {
            type: 'BOOLEAN',
            description: 'Whether to clear existing canvas drawings before rendering this diagram (default: true).',
          },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'search_web',
      description:
        'Searches the web using Tavily AI keyless search with automatic DuckDuckGo fallback for fresh information.',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: {
            type: 'STRING',
            description: 'The search query or keywords to look up on the web.',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'search_document',
      description:
        'Searches the uploaded PDF/document chunks in IndexedDB using BM25 index. Pass specific keywords.',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: {
            type: 'STRING',
            description: 'The topic keywords to search inside the uploaded document.',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'calculate',
      description: 'Calculates a mathematical expression safely.',
      parameters: {
        type: 'OBJECT',
        properties: {
          expression: {
            type: 'STRING',
            description: 'The math expression to evaluate, e.g. "12 * 4.5".',
          },
        },
        required: ['expression'],
      },
    },
    {
      name: 'canvas2d_clear',
      description: 'Clears all drawings, diagrams, and shapes from the visual canvas scene.',
      parameters: {
        type: 'OBJECT',
        properties: {},
      },
    },
    {
      name: 'export_pdf',
      description: 'Generates and downloads the session PDF report containing canvas snapshot and transcript.',
      parameters: {
        type: 'OBJECT',
        properties: {},
      },
    },
  ];
}
