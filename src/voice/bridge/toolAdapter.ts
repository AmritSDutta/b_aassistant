import { ToolDeclaration } from '../types/provider';

export function getVoiceToolDeclarations(): ToolDeclaration[] {
  return [
    {
      name: 'generate_diagram_and_explanation',
      description:
        'Asynchronously dispatches the visual subagent to design an architectural diagram on the visual canvas and write a technical breakdown in chat. Returns immediately so you can confirm to the user while drawing happens in the background.',
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
      name: 'get_background_task_status',
      description:
        'Checks the execution status and progress of an asynchronous background task (e.g. diagram generation). Use this when the user asks if their diagram or task is finished or in progress.',
      parameters: {
        type: 'OBJECT',
        properties: {
          taskId: {
            type: 'STRING',
            description: 'Optional ID of the background task to inspect. If omitted, checks the latest task.',
          },
        },
      },
    },
    {
      name: 'search_web',
      description: 'Searches the web for live information and current facts.',
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
      description: 'Searches uploaded documents for keywords and topics.',
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
      name: 'search_research',
      description: 'Searches scientific research papers and preprints for a query.',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: {
            type: 'STRING',
            description: 'The research query or keywords to look up in scientific papers.',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_reference_url',
      description: 'Retrieves the external documentation and reference URLs stored in the current session.',
      parameters: {
        type: 'OBJECT',
        properties: {},
      },
    },
    {
      name: 'clean_document',
      description: 'Deletes the uploaded document and its search index from the current workspace.',
      parameters: {
        type: 'OBJECT',
        properties: {},
      },
    },
    {
      name: 'chat_post',
      description: 'Posts a message into the persistent chat stream for the user to read.',
      parameters: {
        type: 'OBJECT',
        properties: {
          text: {
            type: 'STRING',
            description: 'The message text to post into the chat stream.',
          },
        },
        required: ['text'],
      },
    },
    {
      name: 'get_chat_history',
      description: 'Reads the recent chat conversation history.',
      parameters: {
        type: 'OBJECT',
        properties: {},
      },
    },
    {
      name: 'get_tool_usage_prompt',
      description: 'Reads the operating guide for all available tools.',
      parameters: {
        type: 'OBJECT',
        properties: {},
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
