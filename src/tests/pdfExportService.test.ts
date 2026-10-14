import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportSessionPdf,
  stripInlineMarkdown,
  readPngDimensions,
  fitContain,
  renderHumanizedMarkdown,
} from '../lib/pdfExportService';
import { ChatMessage } from '../components/ChatArea';

const mockSave = vi.fn();
const mockText = vi.fn();
const mockSetFont = vi.fn();

vi.mock('jspdf', () => {
  return {
    jsPDF: vi.fn().mockImplementation(() => ({
      setFont: mockSetFont,
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      setDrawColor: vi.fn(),
      setFillColor: vi.fn(),
      setLineWidth: vi.fn(),
      text: mockText,
      rect: vi.fn(),
      roundedRect: vi.fn(),
      line: vi.fn(),
      addImage: vi.fn(),
      addPage: vi.fn(),
      splitTextToSize: vi.fn((text: string) => [text]),
      save: mockSave,
    })),
  };
});

describe('PDF Export Service & Markdown Humanizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Blank Session Validation', () => {
    it('rejects export when both canvas and dialogue are blank', () => {
      const result = exportSessionPdf(null, [], undefined, false);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot export an empty session');
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('rejects export when messages contain only whitespace and canvas is blank', () => {
      const emptyMessages: ChatMessage[] = [
        { id: '1', sender: 'user', text: '   \n  \t ', timestamp: 1000 },
      ];
      const result = exportSessionPdf(null, emptyMessages, undefined, false);
      expect(result.success).toBe(false);
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('allows export when canvas has content even if dialogue is empty', () => {
      const result = exportSessionPdf(null, [], 'Architecture.pdf', true);
      expect(result.success).toBe(true);
      expect(mockSave).toHaveBeenCalled();
    });

    it('allows export when dialogue has messages even if canvas is blank', () => {
      const messages: ChatMessage[] = [
        { id: '1', sender: 'user', text: 'Explain the system architecture', timestamp: 1000 },
      ];
      const result = exportSessionPdf(null, messages, undefined, false);
      expect(result.success).toBe(true);
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('Inline Markdown Humanizer', () => {
    it('strips bold and italic markdown markers', () => {
      const input = 'This is **bold text** and *italicized text* and __another bold__.';
      const output = stripInlineMarkdown(input);
      expect(output).toBe('This is bold text and italicized text and another bold.');
    });

    it('converts inline code backticks to quoted terms', () => {
      const input = 'Call `calculateMath(expression)` to evaluate `42 * 2`.';
      const output = stripInlineMarkdown(input);
      expect(output).toBe("Call 'calculateMath(expression)' to evaluate '42 * 2'.");
    });

    it('cleans markdown links and images into human readable text', () => {
      const linkInput = 'Check the [documentation](https://example.com/docs) for details.';
      expect(stripInlineMarkdown(linkInput)).toBe('Check the documentation for details.');

      const imgInput = 'See the flowchart: ![System Flow](https://example.com/flow.png)';
      expect(stripInlineMarkdown(imgInput)).toBe('See the flowchart: [Image: System Flow]');
    });

    it('cleans HTML tags and entities', () => {
      const input = 'Line 1<br/>Line 2 &amp; &lt;tag&gt;';
      const output = stripInlineMarkdown(input);
      expect(output).toBe('Line 1\nLine 2 & <tag>');
    });
  });

  describe('Block-level Markdown Rendering', () => {
    it('renders complex LLM markdown with headings, lists, quotes, and code blocks without throwing', () => {
      const complexLLMMarkdown = `
# Executive Overview
This is a summary of the **microservices architecture**.

## Core Components
- Ingress Gateway: handles \`HTTPS\` termination
- Auth Service: verifies JWT tokens
- PostgreSQL Database: multi-region read replicas

### Key Decisions
1. Use client-side BM25 index for privacy
2. Utilize WebMCP for tool discovery

> "Zero-backend architecture ensures 100% data confidentiality."

---

\`\`\`typescript
interface Config {
  port: number;
  host: string;
}
\`\`\`
`.trim();

      const ensureSpace = vi.fn();
      const mockDoc: any = {
        setFont: mockSetFont,
        setFontSize: vi.fn(),
        setTextColor: vi.fn(),
        setDrawColor: vi.fn(),
        setFillColor: vi.fn(),
        setLineWidth: vi.fn(),
        text: mockText,
        rect: vi.fn(),
        line: vi.fn(),
        splitTextToSize: vi.fn((text: string) => [text]),
      };

      const endY = renderHumanizedMarkdown(mockDoc, complexLLMMarkdown, 16, 178, 20, ensureSpace);

      expect(endY).toBeGreaterThan(20);
      expect(mockText).toHaveBeenCalled();
    });
  });

  describe('Dimensions & Scaling Utilities', () => {
    it('fitContain preserves aspect ratio within maximum bounds', () => {
      const fitted = fitContain(1000, 500, 200, 100);
      expect(fitted.width).toBe(200);
      expect(fitted.height).toBe(100);

      const fittedNarrow = fitContain(1000, 500, 100, 100);
      expect(fittedNarrow.width).toBe(100);
      expect(fittedNarrow.height).toBe(50);
    });

    it('readPngDimensions returns null for invalid data URLs gracefully', () => {
      expect(readPngDimensions('')).toBeNull();
      expect(readPngDimensions('data:text/plain;base64,invalid')).toBeNull();
    });
  });
});
