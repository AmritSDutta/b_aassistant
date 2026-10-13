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
    expect(result.pages[0].text).toContain('sample content');
  });

  it('never outputs generic placeholder strings like "Page X Content"', async () => {
    const service = new LiteParseService();
    const pdfContent = '%PDF-1.4\n1 0 obj\n<< /Length 50 >>\nstream\n(Executive Summary of Q3 Financial Performance) Tj\nendstream\nendobj\n';
    const file = new File([new TextEncoder().encode(pdfContent)], 'quarterly.pdf', { type: 'application/pdf' });

    const result = await service.parseFile(file);
    expect(result.pages.length).toBeGreaterThan(0);
    for (const page of result.pages) {
      expect(page.text).not.toMatch(/^Page \d+ Content$/);
      expect(page.text).not.toContain('[Page');
    }
  });
});
