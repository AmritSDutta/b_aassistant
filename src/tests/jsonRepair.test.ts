import { describe, it, expect } from 'vitest';
import {
  cleanJsonString,
  repairTruncatedJson,
  repairAndParseJson,
  stripMarkdownFences,
  extractShapesAndExplanationFromJson,
} from '../voice/utils/jsonRepair';
import { Canvas2dShape } from '../types/canvas2d';

describe('jsonRepair Utility', () => {
  describe('cleanJsonString', () => {
    it('strips markdown code blocks', () => {
      const input = '```json\n{"key": "value"}\n```';
      expect(cleanJsonString(input)).toBe('{"key": "value"}');
    });

    it('strips markdown code blocks labeled as markdown', () => {
      const input = '```markdown\n{"key": "value"}\n```';
      expect(cleanJsonString(input)).toBe('{"key": "value"}');
    });

    it('removes trailing commas before closing braces and brackets', () => {
      const input = '{"a": 1, "b": [1, 2, ], }';
      expect(cleanJsonString(input)).toBe('{"a": 1, "b": [1, 2]}');
    });
  });

  describe('stripMarkdownFences', () => {
    it('strips single outer markdown code block', () => {
      const input = '```markdown\n### Architecture\nDetailed text\n```';
      expect(stripMarkdownFences(input)).toBe('### Architecture\nDetailed text');
    });

    it('strips multiple nested layers of markdown code blocks', () => {
      const input = '```markdown\n```markdown\n### Architecture\nDetailed text\n```\n```';
      expect(stripMarkdownFences(input)).toBe('### Architecture\nDetailed text');
    });

    it('preserves inner code blocks when unwrapping outer markdown wrapper', () => {
      const input = '```markdown\n### Architecture\n```sql\nSELECT 1;\n```\nConclusive remarks.\n```';
      expect(stripMarkdownFences(input)).toBe(
        '### Architecture\n```sql\nSELECT 1;\n```\nConclusive remarks.'
      );
    });

    it('leaves text without outer fences untouched', () => {
      const input = '### Architecture\nNormal text without wrapping';
      expect(stripMarkdownFences(input)).toBe(input);
    });
  });

  describe('repairTruncatedJson', () => {
    it('closes unclosed string and braces', () => {
      const input = '{"message": "hello wor';
      expect(repairTruncatedJson(input)).toBe('{"message": "hello wor"}');
    });

    it('closes unclosed array and parent object', () => {
      const input = '{"shapes": [{"id": "s1", "type": "rectangle"';
      expect(repairTruncatedJson(input)).toBe('{"shapes": [{"id": "s1", "type": "rectangle"}]}');
    });
  });

  describe('repairAndParseJson', () => {
    it('parses valid JSON directly', () => {
      const data = repairAndParseJson<{ ok: boolean }>('{"ok": true}');
      expect(data).toEqual({ ok: true });
    });

    it('parses JSON containing trailing commas', () => {
      const data = repairAndParseJson<{ items: number[] }>('{"items": [10, 20,],}');
      expect(data).toEqual({ items: [10, 20] });
    });

    it('parses truncated JSON by completing tokens', () => {
      const data = repairAndParseJson<{ shapes: Array<{ id: string }> }>(
        '{"shapes": [{"id": "rect1"'
      );
      expect(data.shapes).toHaveLength(1);
      expect(data.shapes[0].id).toBe('rect1');
    });
  });

  describe('extractShapesAndExplanationFromJson', () => {
    it('extracts from direct structured root JSON object', () => {
      const payload = JSON.stringify({
        shapes: [
          { id: 'n1', type: 'rectangle', x: 80, y: 200, width: 170, height: 90, text: 'Client' },
        ],
        explanation: 'The client sends an authenticated request to the gateway.',
      });

      const result = extractShapesAndExplanationFromJson(payload);
      expect(result.shapes).toHaveLength(1);
      expect(result.shapes![0].id).toBe('n1');
      expect(result.explanation).toBe('The client sends an authenticated request to the gateway.');
    });

    it('extracts from structured JSON when explanation comes before shapes', () => {
      const payload = JSON.stringify({
        explanation: 'Detailed microservice analysis.',
        shapes: [
          { id: 'n2', type: 'ellipse', x: 200, y: 200, text: 'Database' },
        ],
      });

      const result = extractShapesAndExplanationFromJson(payload);
      expect(result.shapes).toHaveLength(1);
      expect(result.shapes![0].text).toBe('Database');
      expect(result.explanation).toBe('Detailed microservice analysis.');
    });

    it('extracts from legacy markdown fenced JSON code block', () => {
      const raw = `Here is the architecture:
\`\`\`json
{
  "shapes": [
    { "id": "gw", "type": "rectangle", "text": "Gateway", "x": 100, "y": 100 }
  ]
}
\`\`\`
The gateway proxies traffic.`;

      const result = extractShapesAndExplanationFromJson(raw);
      expect(result.shapes).toHaveLength(1);
      expect(result.shapes![0].id).toBe('gw');
      expect(result.explanation).toContain('The gateway proxies traffic.');
    });

    it('extracts from legacy <toolcall> tags', () => {
      const raw = `<toolcall><argvalue>{"shapes":[{"id":"s3","type":"diamond","x":50,"y":50}]}</argvalue></toolcall>\nDecision engine details.`;

      const result = extractShapesAndExplanationFromJson(raw);
      expect(result.shapes).toHaveLength(1);
      expect(result.shapes![0].id).toBe('s3');
      expect(result.explanation).toBe('Decision engine details.');
    });

    it('unwraps markdown fences nested inside parsed explanation property', () => {
      const payload = JSON.stringify({
        shapes: [
          { id: 'm1', type: 'rectangle', text: 'Mistral Service', x: 50, y: 50 },
        ],
        explanation: '```markdown\n### Mistral Architecture\nNested markdown wrapper.\n```',
      });

      const result = extractShapesAndExplanationFromJson(payload);
      expect(result.shapes).toHaveLength(1);
      expect(result.explanation).toBe('### Mistral Architecture\nNested markdown wrapper.');
    });

    it('unwraps multiple layers of markdown fences inside explanation', () => {
      const payload = JSON.stringify({
        shapes: [
          { id: 'm2', type: 'rectangle', text: 'Mistral Service 2', x: 50, y: 50 },
        ],
        explanation:
          '```markdown\n```markdown\n### Deep Mistral\nTwo layers of markdown.\n```\n```',
      });

      const result = extractShapesAndExplanationFromJson(payload);
      expect(result.shapes).toHaveLength(1);
      expect(result.explanation).toBe('### Deep Mistral\nTwo layers of markdown.');
    });

    it('returns shapes null when no shapes are present in plain text', () => {
      const raw = 'Just a regular text answer about architectures.';
      const result = extractShapesAndExplanationFromJson(raw);
      expect(result.shapes).toBeNull();
      expect(result.explanation).toBe(raw);
    });
  });
});
