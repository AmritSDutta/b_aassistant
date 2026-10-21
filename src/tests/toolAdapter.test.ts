import { describe, it, expect } from 'vitest';
import { getVoiceToolDeclarations } from '../voice/bridge/toolAdapter';

describe('toolAdapter', () => {
  it('provides the required set of voice tool declarations', () => {
    const tools = getVoiceToolDeclarations();
    const names = tools.map((t) => t.name);

    expect(names).toContain('generate_diagram_and_explanation');
    expect(names).toContain('search_web');
    expect(names).toContain('search_document');
    expect(names).toContain('calculate');
    expect(names).toContain('canvas2d_clear');
    expect(names).toContain('export_pdf');
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
