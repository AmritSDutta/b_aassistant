import { WebMCPTool, JsonRpcRequest, JsonRpcResponse } from './types';
import { TOOL_DEFINITIONS, ToolContext, executeToolCall } from './tools';

export class WebMCPProvider {
  private context: ToolContext;
  private messageListener: ((event: MessageEvent) => void) | null = null;

  constructor(context: ToolContext) {
    this.context = context;
  }

  public updateContext(context: ToolContext): void {
    this.context = context;
  }

  public listTools(): WebMCPTool[] {
    return [...TOOL_DEFINITIONS];
  }

  public async callTool(name: string, args?: Record<string, unknown>): Promise<unknown> {
    return await executeToolCall(name, args, this.context);
  }

  public register(): void {
    const globalWin = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : null;
    if (!globalWin) return;

    // 1. window.webmcp standard bridge
    globalWin.webmcp = {
      listTools: () => this.listTools(),
      callTool: (name: string, args?: Record<string, unknown>) => this.callTool(name, args),
      tools: this.listTools(),
    };

    // 2. navigator.modelContext standard
    if (typeof navigator !== 'undefined') {
      try {
        Object.defineProperty(navigator, 'modelContext', {
          value: {
            listTools: () => this.listTools(),
            callTool: (name: string, args?: Record<string, unknown>) => this.callTool(name, args),
            tools: this.listTools(),
          },
          configurable: true,
          writable: true,
        });
      } catch {
        // Fallback if read-only
      }
    }

    // 3. postMessage JSON-RPC 2.0 event bridge
    this.messageListener = async (event: MessageEvent) => {
      const data = event.data as JsonRpcRequest;
      if (!data || typeof data !== 'object' || data.jsonrpc !== '2.0') {
        return;
      }

      if (data.method === 'tools/list' || data.method === 'listTools') {
        const response: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: data.id ?? null,
          result: { tools: this.listTools() },
        };
        this.reply(event, response);
      } else if (data.method === 'tools/call' || data.method === 'callTool') {
        const toolName = (data.params?.name as string) || (data.params?.tool as string);
        const args = (data.params?.arguments as Record<string, unknown>) || data.params?.args;
        try {
          const result = await this.callTool(toolName, args);
          const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            id: data.id ?? null,
            result,
          };
          this.reply(event, response);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            id: data.id ?? null,
            error: {
              code: -32603,
              message,
            },
          };
          this.reply(event, response);
        }
      }
    };

    window.addEventListener('message', this.messageListener);

    // 4. Custom DOM Event
    window.dispatchEvent(
      new CustomEvent('webmcp:ready', {
        detail: { tools: this.listTools() },
      })
    );
  }

  public unregister(): void {
    if (this.messageListener && typeof window !== 'undefined') {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
  }

  private reply(event: MessageEvent, response: JsonRpcResponse): void {
    if (event.source && typeof (event.source as Window).postMessage === 'function') {
      (event.source as Window).postMessage(response, '*');
    } else if (typeof window !== 'undefined') {
      window.postMessage(response, '*');
    }
  }
}
