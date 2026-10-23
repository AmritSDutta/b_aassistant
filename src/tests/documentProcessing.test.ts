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
    const mockPdfBytes = new TextEncoder().encode(
      '%PDF-1.4\n1 0 obj\n<< /Length 40 >>\nstream\n(sample content for parsing) Tj\nendstream\nendobj\n'
    );
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

  it('preserves natural page breaks with form feeds rather than arbitrary character slicing', async () => {
    const service = new LiteParseService();
    const docWithPages = 'Page one content about AI agents.\fPage two content about client WebMCP.\fPage three content about IndexedDB.';
    const file = new File([docWithPages], 'multi.txt', { type: 'text/plain' });

    const result = await service.parseFile(file);
    expect(result.pages.length).toBe(3);
    expect(result.pages[0].pageNumber).toBe(1);
    expect(result.pages[0].text).toBe('Page one content about AI agents.');
    expect(result.pages[1].pageNumber).toBe(2);
    expect(result.pages[1].text).toBe('Page two content about client WebMCP.');
    expect(result.pages[2].pageNumber).toBe(3);
    expect(result.pages[2].text).toBe('Page three content about IndexedDB.');
  });

  it('correctly extracts and decodes hex string PDF tokens (<...> Tj and [...] TJ)', async () => {
    const service = new LiteParseService();
    // 48656c6c6f20576f726c64 -> 'Hello World'
    const pdfHex = '%PDF-1.4\n1 0 obj\n<< /Length 60 >>\nstream\n<48656c6c6f20576f726c64> Tj\nendstream\nendobj\n';
    const file = new File([new TextEncoder().encode(pdfHex)], 'hex-encoded.pdf', { type: 'application/pdf' });

    const result = await service.parseFile(file);
    expect(result.pages.length).toBeGreaterThan(0);
    expect(result.pages[0].text).toContain('Hello World');
  });

  it('extracts text from Word .docx documents via in-browser zip/xml decompression', async () => {
    const service = new LiteParseService();
    const xmlContent = '<?xml version="1.0" encoding="UTF-8"?><w:document><w:body><w:p><w:r><w:t>Architecture Review: Browser WebMCP &amp; LiteParse.</w:t></w:r></w:p></w:body></w:document>';
    const xmlBytes = new TextEncoder().encode(xmlContent);
    const entryName = 'word/document.xml';
    const fnBytes = new TextEncoder().encode(entryName);

    // Build uncompressed ZIP entry (compression method 0)
    const header = new Uint8Array(30 + fnBytes.length + xmlBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); // PK\x03\x04
    view.setUint16(8, 0, true); // stored (no compression)
    view.setUint32(18, xmlBytes.length, true);
    view.setUint32(22, xmlBytes.length, true);
    view.setUint16(26, fnBytes.length, true);
    view.setUint16(28, 0, true);

    header.set(fnBytes, 30);
    header.set(xmlBytes, 30 + fnBytes.length);

    const file = new File([header], 'specification.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const result = await service.parseFile(file);
    expect(result.fileName).toBe('specification.docx');
    expect(result.pages.length).toBe(1);
    expect(result.pages[0].text).toContain('Architecture Review: Browser WebMCP & LiteParse.');
  });

  it('filters out raw PDF object and stream bytecode from parsed output', async () => {
    const service = new LiteParseService();
    const garbagePdf = `
%PDF-1.4
2 0 obj
<</Type /Page /Resources <</ProcSet [/PDF /Text /ImageB /ImageC] /ExtGState <</G3 3 0 R>>>>
/MediaBox [0 0 595.92 841.92]
/Contents 12 0 R>>
endobj
12 0 obj
<</Filter /FlateDecode /Length 50>>
stream
(Clean Title for Architecture Plan) Tj
endstream
endobj
`;
    const file = new File([new TextEncoder().encode(garbagePdf)], 'messy.pdf', { type: 'application/pdf' });
    const result = await service.parseFile(file);

    expect(result.pages.length).toBeGreaterThan(0);
    for (const page of result.pages) {
      expect(page.text).not.toContain('%PDF');
      expect(page.text).not.toContain('endstream');
      expect(page.text).not.toContain('endobj');
      expect(page.text).not.toContain('/ProcSet');
      expect(page.text).not.toContain('/MediaBox');
      expect(page.text).not.toContain('/FlateDecode');
      expect(page.text).toContain('Clean Title for Architecture Plan');
    }
  });

  it('parses real multi-line PDF documents cleanly via LiteParse', async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.text('Summary Overview of System Architecture', 20, 20);
    doc.text('This document details event driven messaging and PostgreSQL databases.', 20, 30);
    const pdfBytes = new Uint8Array(doc.output('arraybuffer'));

    const service = new LiteParseService();
    const file = new File([pdfBytes], 'architecture.pdf', { type: 'application/pdf' });
    const result = await service.parseFile(file);

    expect(result.fileName).toBe('architecture.pdf');
    expect(result.pages.length).toBeGreaterThanOrEqual(1);
    expect(result.pages[0].text).toContain('Summary Overview of System Architecture');
    expect(result.pages[0].text).toContain('PostgreSQL');
    expect(result.pages[0].text).not.toContain('%PDF');
    expect(result.pages[0].text).not.toContain('endobj');
  });

  it('parses markdown documents and chunks on headings when long', async () => {
    const service = new LiteParseService();
    const section1 = '# Section 1: Weekly Planning\n' + 'Focus on personal wellness and daily routines. '.repeat(40);
    const section2 = '\n# Section 2: Budgeting\n' + 'Track monthly expenses and savings goals. '.repeat(40);
    const mdContent = section1 + section2;

    const file = new File([mdContent], 'weekly_plan.md', { type: 'text/markdown' });
    const result = await service.parseFile(file);

    expect(result.fileName).toBe('weekly_plan.md');
    expect(result.pages.length).toBeGreaterThanOrEqual(2);
    expect(result.pages[0].text).toContain('Weekly Planning');
    expect(result.pages[1].text).toContain('Budgeting');
  });
});
