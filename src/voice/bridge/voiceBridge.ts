import { ISubagentProvider } from '../types/provider';
import { globalCanvasEngine } from '../../lib/canvasEngine';
import { Canvas2dShape } from '../../types/canvas2d';
import { executeToolCall, ToolContext } from '../../webmcp/tools';
import { getSubagentSystemPrompt } from '../prompts';
import { TaskManager, globalTaskManager } from '../tasks/taskManager';

export interface VoiceBridgeOptions {
  subagent: ISubagentProvider;
  postChatMessage: (text: string) => void;
  toolContext?: Partial<ToolContext>;
  taskManager?: TaskManager;
}

export class VoiceBridge {
  private subagent: ISubagentProvider;
  private postChatMessage: (text: string) => void;
  private toolContext: Partial<ToolContext>;
  private taskManager: TaskManager;
  private activeDiagramTask: Promise<void> | null = null;

  constructor(options: VoiceBridgeOptions) {
    this.subagent = options.subagent;
    this.postChatMessage = options.postChatMessage;
    this.toolContext = options.toolContext || {};
    this.taskManager = options.taskManager || globalTaskManager;
  }

  getTaskManager(): TaskManager {
    return this.taskManager;
  }

  getActiveDiagramTask(): Promise<void> | null {
    return this.activeDiagramTask;
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

    if (name === 'get_background_task_status') {
      return this.handleGetBackgroundTaskStatus(args);
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

  private handleDiagramAndExplanation(args: Record<string, unknown>): Record<string, unknown> {
    const prompt = String(args.prompt || '');
    const clearFirst = args.clearCanvasFirst !== false;
    const systemInstruction = getSubagentSystemPrompt();

    const task = this.taskManager.createTask('diagram_and_explanation', prompt);

    // Serialize background dispatches: a second request waits for the first to
    // finish so two concurrent clearCanvasFirst runs cannot wipe the newer diagram.
    const run = async (): Promise<void> => {
      this.taskManager.updateTask(task.id, { status: 'in_progress' });
      try {
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

        const count = shapes ? shapes.length : 0;
        this.taskManager.updateTask(task.id, {
          status: 'completed',
          shapesCount: count,
          resultSummary: `Rendered ${count} architecture elements and posted analysis.`,
          completedAt: Date.now(),
        });
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : String(err);
        console.error('Asynchronous diagram subagent execution failed:', err);
        this.taskManager.updateTask(task.id, {
          status: 'failed',
          error: errMessage,
          completedAt: Date.now(),
        });
        this.postChatMessage(
          `**Diagram Generation Notice**: Unable to generate visual diagram: ${errMessage}`
        );
      }
    };

    const previous = this.activeDiagramTask;
    this.activeDiagramTask = (previous ?? Promise.resolve())
      .then(run)
      .catch(() => {
        // run() handles its own errors; this only guards the error path itself.
      });

    return {
      status: 'dispatched',
      asynchronous: true,
      taskId: task.id,
      message:
        'Visual subagent has been dispatched in the background to render the diagram on the visual canvas and post the technical analysis to chat.',
    };
  }

  private handleGetBackgroundTaskStatus(args: Record<string, unknown>): Record<string, unknown> {
    const taskId = typeof args.taskId === 'string' ? args.taskId : undefined;
    const task = taskId ? this.taskManager.getTask(taskId) : this.taskManager.getLatestTask();

    if (!task) {
      return {
        found: false,
        message: 'No background tasks found in browser cache.',
      };
    }

    const elapsedSeconds = Math.round((Date.now() - task.createdAt) / 1000);

    if (task.status === 'completed') {
      return {
        found: true,
        taskId: task.id,
        status: 'completed',
        prompt: task.prompt,
        elapsedSeconds,
        shapesRendered: task.shapesCount || 0,
        message: `Task ${task.id} completed. ${task.shapesCount || 0} architecture elements rendered on the canvas.`,
      };
    }

    if (task.status === 'in_progress' || task.status === 'queued') {
      return {
        found: true,
        taskId: task.id,
        status: task.status,
        prompt: task.prompt,
        elapsedSeconds,
        message: `Task ${task.id} is currently ${task.status} (${elapsedSeconds}s elapsed). Still working in the background.`,
      };
    }

    return {
      found: true,
      taskId: task.id,
      status: 'failed',
      prompt: task.prompt,
      elapsedSeconds,
      error: task.error || 'Unknown error',
      message: `Task ${task.id} failed: ${task.error}`,
    };
  }

  private extractShapesAndExplanation(text: string): { shapes: Canvas2dShape[] | null; explanation: string } {
    let shapes: Canvas2dShape[] | null = null;
    let explanation = text;

    const toolCallRegex = /<(?:toolcall|tool_call)>[\s\S]*?<argvalue>([\s\S]*?)<\/argvalue>[\s\S]*?<\/(?:toolcall|tool_call)>/i;
    const toolCallMatch = text.match(toolCallRegex);
    if (toolCallMatch) {
      try {
        const parsed = JSON.parse(toolCallMatch[1].trim());
        if (parsed && Array.isArray(parsed.shapes)) {
          shapes = parsed.shapes as Canvas2dShape[];
          explanation = text.replace(toolCallMatch[0], '').trim();
          return { shapes, explanation };
        }
      } catch {
        // Fall back to subsequent strategies
      }
    }

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
