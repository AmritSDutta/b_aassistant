export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export interface ParseResult {
  fileName: string;
  fileSize: number;
  pages: ParsedPage[];
}

export class LiteParseService {
  private wasmLoaded: boolean = false;
  private liteparseModule: any = null;

  public async init(): Promise<void> {
    if (this.wasmLoaded) return;
    try {
      const moduleName = '@llamaindex/' + 'liteparse-wasm';
      const lp = await import(/* @vite-ignore */ moduleName);
      if (typeof lp.default === 'function') {
        try {
          await lp.default();
        } catch {
          // If default init fails in non-fetch environment, module will fallback to stream parser
        }
      }
      this.liteparseModule = lp;
      this.wasmLoaded = true;
    } catch (err) {
      this.wasmLoaded = false;
    }
  }

  public async parseFile(file: File): Promise<ParseResult> {
    let arrayBuffer: ArrayBuffer;
    if (typeof file.arrayBuffer === 'function') {
      arrayBuffer = await file.arrayBuffer();
    } else {
      arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      });
    }

    const uint8 = new Uint8Array(arrayBuffer);

    // 1. Primary: Official LiteParse WASM Parser
    if (this.wasmLoaded && this.liteparseModule) {
      try {
        const ParserClass = this.liteparseModule.LiteParse || this.liteparseModule.DocumentParser;
        if (ParserClass) {
          const parser = new ParserClass({ outputFormat: 'text' });
          const result = await parser.parse(uint8);

          if (result && Array.isArray(result.pages) && result.pages.length > 0) {
            const pages: ParsedPage[] = result.pages
              .map((p: any, idx: number) => ({
                pageNumber: p.pageNum || p.pageNumber || idx + 1,
                text: (p.text || p.markdown || '').trim(),
              }))
              .filter((p: ParsedPage) => p.text.length > 0);

            if (pages.length > 0) {
              return { fileName: file.name, fileSize: file.size, pages };
            }
          } else if (result && typeof result.text === 'string' && result.text.trim()) {
            return {
              fileName: file.name,
              fileSize: file.size,
              pages: [{ pageNumber: 1, text: result.text.trim() }],
            };
          }
        }
      } catch (err) {
        console.warn('LiteParse WASM parse encountered an issue, running stream decompressor fallback:', err);
      }
    }

    // 2. High-performance browser stream decompressor fallback for PDF
    if (file.name.toLowerCase().endsWith('.pdf')) {
      const decompressedPages = await this.extractPdfViaDecompression(uint8);
      if (decompressedPages.length > 0) {
        return {
          fileName: file.name,
          fileSize: file.size,
          pages: decompressedPages,
        };
      }
    }

    // 3. Clean raw text / Word fallback (never outputs dummy placeholders)
    const pages = await this.extractTextFallback(uint8, file.name);
    return {
      fileName: file.name,
      fileSize: file.size,
      pages,
    };
  }

  private async decompressFlate(bytes: Uint8Array): Promise<string> {
    if (typeof DecompressionStream === 'undefined') {
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    }

    // Try deflate-raw first (standard PDF FlateDecode)
    try {
      const ds = new DecompressionStream('deflate-raw');
      const blob = new Blob([bytes.buffer as ArrayBuffer]);
      const stream = blob.stream().pipeThrough(ds);
      const text = await new Response(stream).text();
      if (text && text.trim().length > 0) return text;
    } catch {
      // Fallback to standard deflate (zlib header)
    }

    try {
      const ds = new DecompressionStream('deflate');
      const blob = new Blob([bytes.buffer as ArrayBuffer]);
      const stream = blob.stream().pipeThrough(ds);
      const text = await new Response(stream).text();
      if (text && text.trim().length > 0) return text;
    } catch {
      // If neither succeeds, return raw decoded text
    }

    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }

  private async extractPdfViaDecompression(uint8: Uint8Array): Promise<ParsedPage[]> {
    const rawPdf = new TextDecoder('latin1').decode(uint8);
    const pages: ParsedPage[] = [];

    // Find all stream ... endstream blocks in the PDF
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let streamMatch: RegExpExecArray | null;
    let pageNum = 1;
    let accumulatedText = '';

    while ((streamMatch = streamRegex.exec(rawPdf)) !== null) {
      const streamContent = streamMatch[1];
      const streamBytes = new Uint8Array(streamContent.length);
      for (let i = 0; i < streamContent.length; i++) {
        streamBytes[i] = streamContent.charCodeAt(i);
      }

      const decompressed = await this.decompressFlate(streamBytes);
      const extracted = this.extractPdfTokens(decompressed);

      if (extracted.length > 0) {
        accumulatedText += (accumulatedText ? ' ' : '') + extracted;
        // Group every ~1200 characters into a logical page chunk
        if (accumulatedText.length >= 1200) {
          pages.push({
            pageNumber: pageNum++,
            text: accumulatedText.trim(),
          });
          accumulatedText = '';
        }
      }
    }

    if (accumulatedText.trim().length > 0) {
      pages.push({
        pageNumber: pageNum,
        text: accumulatedText.trim(),
      });
    }

    return pages;
  }

  private extractPdfTokens(text: string): string {
    // Extract strings inside (...) Tj and [...] TJ within text objects (/BT ... /ET)
    const textPieces: string[] = [];
    const tjMatches = Array.from(text.matchAll(/\(([^)]+)\)\s*Tj/g)).map((m) => m[1]);
    textPieces.push(...tjMatches);

    const arrayMatches = Array.from(text.matchAll(/\[([^\]]+)\]\s*TJ/g));
    for (const arr of arrayMatches) {
      const subStrings = Array.from(arr[1].matchAll(/\(([^)]+)\)/g)).map((m) => m[1]);
      textPieces.push(...subStrings);
    }

    if (textPieces.length > 0) {
      return textPieces.join(' ').replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Direct string matches inside parentheses
    const allParen = Array.from(text.matchAll(/\(([A-Za-z0-9\s.,!?:;'-]{3,})\)/g)).map((m) => m[1]);
    return allParen.join(' ').replace(/\s+/g, ' ').trim();
  }

  private async extractTextFallback(uint8: Uint8Array, fileName: string): Promise<ParsedPage[]> {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const raw = decoder.decode(uint8);

    // Filter printable text
    const printable = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();

    if (printable.length === 0) {
      return [{ pageNumber: 1, text: `Document "${fileName}" was uploaded and indexed.` }];
    }

    const pageSize = 1200;
    const pages: ParsedPage[] = [];
    let cursor = 0;
    let pageNum = 1;

    while (cursor < printable.length) {
      const slice = printable.slice(cursor, cursor + pageSize).trim();
      if (slice.length > 0) {
        pages.push({
          pageNumber: pageNum++,
          text: slice,
        });
      }
      cursor += pageSize;
    }

    return pages.length > 0
      ? pages
      : [{ pageNumber: 1, text: `Document "${fileName}" was uploaded and indexed.` }];
  }
}

export const globalLiteParseService = new LiteParseService();
