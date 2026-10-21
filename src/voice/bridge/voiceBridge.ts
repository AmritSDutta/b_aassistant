import { ISubagentProvider } from '../types/provider';
import { globalCanvasEngine } from '../../lib/canvasEngine';
import { Canvas2dShape } from '../../types/canvas2d';
import { executeToolCall, ToolContext } from '../../webmcp/tools';

export interface VoiceBridgeOptions {
  subagent: ISubagentProvider;
  postChatMessage: (text: string) => void;
  toolContext?: Partial<ToolContext>;
}

export class VoiceBridge {
  private subagent: ISubagentProvider;
  private postChatMessage: (text: string) => void;
  private toolContext: Partial<ToolContext>;

  constructor(options: VoiceBridgeOptions) {
    this.subagent = options.subagent;
    this.postChatMessage = options.postChatMessage;
    this.toolContext = options.toolContext || {};
  }

  setSubagent(subagent: ISubagentProvider): void {
    this.subagent = subagent;
  }

  setPostChatMessage(postChatMessage: (text: string) => void): void {
    this.postChatMessage = postChatMessage;
  }

  setToolContext(context: Partial<ToolContext>): void {
    this.toolContext = { ...this.toolContext, ...context };
  }

  async handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (name === 'generate_diagram_and_explanation') {
      return this.handleDiagramAndExplanation(args);
    }

    const fullContext: ToolContext = {
      getMessages: this.toolContext.getMessages || (() => []),
      postMessage: this.postChatMessage,
      searchDocument: this.toolContext.searchDocument,
      cleanDocument: this.toolContext.cleanDocument,
      searchWeb: this.toolContext.searchWeb,
      searchResearch: this.toolContext.searchResearch,
      calculate: this.toolContext.calculate,
      exportPdf: this.toolContext.exportPdf,
      getReferenceUrls: this.toolContext.getReferenceUrls,
    };

    return executeToolCall(name, args, fullContext);
  }

  private async handleDiagramAndExplanation(args: Record<string, unknown>): Promise<unknown> {
    const prompt = String(args.prompt || '');
    const clearFirst = args.clearCanvasFirst !== false;

    const systemInstruction = `You are an expert system architect and visual designer for bAssistant.
When requested to design, diagram, or explain a system, you must provide:
1. A JSON code block labeled "json" containing {"shapes": [...]}.
   Every shape MUST adhere strictly to:
   - Nodes: {"type": "rectangle" | "ellipse" | "diamond" | "sticker" | "text", "id": "...", "text": "...", "subtitle": "...", "x": number, "y": number, "width": number, "height": number, "fillColor": "...", "strokeColor": "..."}
   - Connectors: {"type": "arrow" | "line", "id": "...", "startId": "...", "endId": "...", "text": "..."}
   - Layout: distribute nodes horizontally left-to-right (e.g. x = 80, 300, 520, 740; y = 200, width = 170, height = 90). Connectors must reference valid node IDs in startId and endId.
2. A comprehensive, technical markdown explanation answering the user's architectural questions in depth.`;

    const subagentResponse = await this.subagent.generateText(
      `Design and explain the following system architecture on the visual canvas: ${prompt}`,
      systemInstruction
    );

    const { shapes, explanation } = this.extractShapesAndExplanation(subagentResponse);

    if (shapes && shapes.length > 0) {
      if (clearFirst) {
        globalCanvasEngine.clear();
      }
      globalCanvasEngine.appendShapes(shapes);
      globalCanvasEngine.fitToContent();
    }

    const substantiveMessage = explanation.trim() || subagentResponse.trim();
    if (substantiveMessage) {
      this.postChatMessage(substantiveMessage);
    }

    const shapeCount = shapes ? shapes.length : 0;
    return {
      status: 'success',
      shapesRendered: shapeCount,
      summary: shapeCount > 0
        ? `Rendered ${shapeCount} architecture elements on the visual canvas and posted the complete technical specification to the chat area.`
        : 'Detailed technical analysis generated and posted to the chat area.',
    };
  }

  private extractShapesAndExplanation(text: string): { shapes: Canvas2dShape[] | null; explanation: string } {
    let shapes: Canvas2dShape[] | null = null;
    let explanation = text;

    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
    let match: RegExpExecArray | null;

    while ((match = jsonBlockRegex.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed && Array.isArray(parsed.shapes)) {
          shapes = parsed.shapes as Canvas2dShape[];
          explanation = text.replace(match[0], '').trim();
          break;
        }
      } catch {
        // Not a JSON shapes block, continue looking
      }
    }

    if (!shapes) {
      const inlineJsonMatch = text.match(/\{[\s\r\n]*"shapes"[\s\r\n]*:[\s\S]*?\}(?=[\r\n\s]*$|[#\w])/);
      if (inlineJsonMatch) {
        try {
          const parsed = JSON.parse(inlineJsonMatch[0]);
          if (parsed && Array.isArray(parsed.shapes)) {
            shapes = parsed.shapes as Canvas2dShape[];
            explanation = text.replace(inlineJsonMatch[0], '').trim();
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    return { shapes, explanation };
  }
}
