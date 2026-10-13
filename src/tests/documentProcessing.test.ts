import { describe, it, expect } from 'vitest';
import { LiteParseService } from '../lib/liteparseService';

describe('Document Processing and Validation', () => {
  it('parses text files into structured pages using fallback parser', async () => {
    const service = new LiteParseService();
    const content = 'First paragraph about browser WebMCP standards.\nSecond paragraph discussing LiteParse WASM.';
    const file = new File([content], 'report.doc', { type: 'application/msword' });

    const result = await service.parseFile(file);
    expect(result.fileName).toBe('report.doc');
    expect(result.pages.length).toBeGreaterThanOrEqual(1);
    expect(result.pages[0].text).toContain('WebMCP');
  });

  it('correctly reports file metadata', async () => {
    const service = new LiteParseService();
    const mockPdfBytes = new TextEncoder().encode('%PDF-1.4 sample content for parsing');
    const file = new File([mockPdfBytes], 'whitepaper.pdf', { type: 'application/pdf' });

    const result = await service.parseFile(file);
    expect(result.fileName).toBe('whitepaper.pdf');
    expect(result.fileSize).toBe(mockPdfBytes.byteLength);
    expect(result.pages.length).toBe(1);
  });
});
