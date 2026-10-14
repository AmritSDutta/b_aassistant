import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportSessionPdf,
  stripInlineMarkdown,
  readPngDimensions,
  fitContain,
  renderHumanizedMarkdown,
  containsIndicScript,
  wrapIndicText,
  renderIndicTextStrip,
} from '../lib/pdfExportService';
import { ChatMessage } from '../components/ChatArea';

const mockSave = vi.fn();
const mockText = vi.fn();
const mockSetFont = vi.fn();
const mockAddPage = vi.fn();
const mockSetPage = vi.fn();
const mockAddImage = vi.fn();
const mockGetNumberOfPages = vi.fn().mockReturnValue(1);

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
      addImage: mockAddImage,
      addPage: mockAddPage,
      setPage: mockSetPage,
      getNumberOfPages: mockGetNumberOfPages,
      splitTextToSize: vi.fn((text: string) => [text]),
      save: mockSave,
    })),
  };
});

describe('PDF Export Service & Markdown Humanizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof HTMLCanvasElement !== 'undefined') {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
        fillText: vi.fn(),
        font: '',
        fillStyle: '',
        textBaseline: '',
      }) as any;
      HTMLCanvasElement.prototype.toDataURL = vi
        .fn()
        .mockReturnValue('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    }
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

  describe('Multilingual Indic Script (Bengali & Hindi) Support', () => {
    it('detects Bengali and Hindi text correctly via containsIndicScript', () => {
      // Bengali
      expect(containsIndicScript('বাংলা ভাষা')).toBe(true);
      expect(containsIndicScript('স্বাগতম')).toBe(true);
      expect(containsIndicScript('নমস্কার')).toBe(true);

      // Hindi / Devanagari
      expect(containsIndicScript('नमस्ते')).toBe(true);
      expect(containsIndicScript('हिन्दी')).toBe(true);
      expect(containsIndicScript('सिस्टम आर्किटेक्चर')).toBe(true);

      // Latin / English only
      expect(containsIndicScript('Hello World')).toBe(false);
      expect(containsIndicScript('Microservices Architecture 123')).toBe(false);
    });

    it('wraps Indic sentences into words accurately', () => {
      const bengaliText = 'এটি একটি পরীক্ষামূলক বাক্য যা সঠিকভাবে মোড়ানো হচ্ছে';
      const lines = wrapIndicText(bengaliText, 10, 50);
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.join(' ')).toBe(bengaliText);
    });

    it('renders Indic text strip to dataUrl with valid dimensions', () => {
      const strip = renderIndicTextStrip('বাংলা', 12, '#0f172a', true);
      expect(strip).not.toBeNull();
      expect(strip?.dataUrl).toContain('data:image/png');
      expect(strip?.widthMm).toBeGreaterThan(0);
      expect(strip?.heightMm).toBeGreaterThan(0);
    });

    it('renders and exports sessions containing mixed Bengali and Hindi messages without error', () => {
      const multilingualMessages: ChatMessage[] = [
        {
          id: 'b1',
          sender: 'user',
          text: '# বাংলা সারসংক্ষেপ\nএটি একটি **গুরুত্বপূর্ণ** নথি।\n- প্রথম ধাপ: যাচাইকরণ\n- দ্বিতীয় ধাপ: প্রক্রিয়াকরণ',
          timestamp: 1000,
        },
        {
          id: 'h1',
          sender: 'agent',
          text: '## हिन्दी सारांश\nनमस्ते! यह **सिस्टम आर्किटेक्चर** है।\n1. डेटाबेस कनेक्ट करें\n2. रिस्पॉन्स भेजें',
          timestamp: 2000,
        },
      ];

      const res = exportSessionPdf(null, multilingualMessages, 'Multilingual-Report.pdf', false);
      expect(res.success).toBe(true);
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('Multipage Pagination & Disclaimer Footer', () => {
    it('stamps the exact AI generated disclaimer footer and page counter across all pages', () => {
      mockGetNumberOfPages.mockReturnValue(3);

      const messages: ChatMessage[] = [
        { id: '1', sender: 'user', text: 'Hello', timestamp: 1000 },
      ];

      const res = exportSessionPdf(null, messages, undefined, false);
      expect(res.success).toBe(true);

      expect(mockSetPage).toHaveBeenCalledWith(1);
      expect(mockSetPage).toHaveBeenCalledWith(2);
      expect(mockSetPage).toHaveBeenCalledWith(3);

      expect(mockText).toHaveBeenCalledWith(
        'AI generated analysis, verify before applying.',
        expect.any(Number),
        expect.any(Number),
        { align: 'center' }
      );

      expect(mockText).toHaveBeenCalledWith('Page 1 of 3', expect.any(Number), expect.any(Number), {
        align: 'right',
      });
      expect(mockText).toHaveBeenCalledWith('Page 2 of 3', expect.any(Number), expect.any(Number), {
        align: 'right',
      });
      expect(mockText).toHaveBeenCalledWith('Page 3 of 3', expect.any(Number), expect.any(Number), {
        align: 'right',
      });
    });

    it('triggers addPage for long multi-line message transcripts', () => {
      mockGetNumberOfPages.mockReturnValue(2);

      const longText = Array.from({ length: 150 }, (_, i) => `Paragraph line ${i + 1} detailing system architecture.`).join('\n');
      const messages: ChatMessage[] = [
        { id: '1', sender: 'agent', text: longText, timestamp: 1000 },
      ];

      const res = exportSessionPdf(null, messages, undefined, false);
      expect(res.success).toBe(true);
      expect(mockAddPage).toHaveBeenCalled();
    });

    it('renders the top-left branding logo in the header and the new title', () => {
      const messages: ChatMessage[] = [
        { id: '1', sender: 'user', text: 'Hello', timestamp: 1000 },
      ];

      const res = exportSessionPdf(null, messages, undefined, false);
      expect(res.success).toBe(true);
      expect(mockAddImage).toHaveBeenCalledWith(
        expect.stringMatching(/^data:image\/jpeg;base64,/),
        'JPEG',
        16,
        expect.any(Number),
        10,
        10
      );
      expect(mockText).toHaveBeenCalledWith(
        'bAssistant Deliberation Session',
        30,
        expect.any(Number)
      );
    });

    it('renders sequential turn-by-turn records with turn badges and inquiry/deliberation headers', () => {
      const turns = [
        {
          id: 'turn_1',
          sessionId: 'sess_123',
          turnNumber: 1,
          userPrompt: 'How does the architecture work?',
          agentMessage: 'It consists of three tiers: client, gateway, and database.',
          timestamp: 1728994500000,
        },
        {
          id: 'turn_2',
          sessionId: 'sess_123',
          turnNumber: 2,
          userPrompt: undefined, // user prompt absent
          agentMessage: 'Agent autonomously added Redis cache.',
          canvasSnapshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          timestamp: 1728994600000,
        },
      ];

      const res = exportSessionPdf({
        sessionId: 'sess_123',
        turns,
      });

      expect(res.success).toBe(true);
      expect(mockText).toHaveBeenCalledWith(expect.stringContaining('TURN 1'), expect.any(Number), expect.any(Number));
      expect(mockText).toHaveBeenCalledWith('USER INQUIRY', expect.any(Number), expect.any(Number));
      expect(mockText).toHaveBeenCalledWith('AI DELIBERATION', expect.any(Number), expect.any(Number));
      expect(mockText).toHaveBeenCalledWith(expect.stringContaining('TURN 2'), expect.any(Number), expect.any(Number));
      expect(mockAddImage).toHaveBeenCalledWith(
        expect.stringMatching(/^data:image\/png;base64,/),
        'PNG',
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });
});
