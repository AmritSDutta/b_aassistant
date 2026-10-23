import { describe, it, expect } from 'vitest';
import { getVoiceToolDeclarations } from '../voice/bridge/toolAdapter';

describe('toolAdapter', () => {
  it('provides the required set of voice tool declarations', () => {
    const tools = getVoiceToolDeclarations();
    const names = tools.map((t) => t.name);

    expect(names).toContain('generate_diagram_and_explanation');
    expect(names).toContain('get_background_task_status');
    expect(names).toContain('search_web');
    expect(names).toContain('search_research');
    expect(names).toContain('search_document');
    expect(names).toContain('get_reference_url');
    expect(names).toContain('clean_document');
    expect(names).toContain('calculate');
    expect(names).toContain('canvas2d_clear');
    expect(names).toContain('export_pdf');
    expect(names).toContain('chat_post');
    expect(names).toContain('get_chat_history');
    expect(names).toContain('get_tool_usage_prompt');
    expect(names).toContain('canvas2d_inspect_shapes');
    expect(names).toContain('get_user_preferences');
  });

  it('keeps shape drawing and modification tools out of the voice declarations (subagent-only)', () => {
    const names = getVoiceToolDeclarations().map((t) => t.name);
    expect(names).not.toContain('canvas2d_draw_shapes');
    expect(names).not.toContain('canvas2d_modify_shape');
  });

  it('declares chat_post with required text parameter', () => {
    const tools = getVoiceToolDeclarations();
    const chatTool = tools.find((t) => t.name === 'chat_post');
    expect(chatTool).toBeDefined();

    const params = chatTool?.parameters as {
      properties: Record<string, unknown>;
      required: string[];
    };
    expect(params.properties.text).toBeDefined();
    expect(params.required).toContain('text');
  });

  it('declares valid parameter schemas for diagram generation', () => {
    const tools = getVoiceToolDeclarations();
    const diagramTool = tools.find((t) => t.name === 'generate_diagram_and_explanation');
    expect(diagramTool).toBeDefined();

    const params = diagramTool?.parameters as {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };
    expect(params.type).toBe('OBJECT');
    expect(params.properties.prompt).toBeDefined();
    expect(params.required).toContain('prompt');
  });

  it('declares search_web with query parameter', () => {
    const tools = getVoiceToolDeclarations();
    const searchTool = tools.find((t) => t.name === 'search_web');
    expect(searchTool).toBeDefined();

    const params = searchTool?.parameters as {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };
    expect(params.required).toContain('query');
  });
});
