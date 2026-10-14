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
          const isRealBrowser = typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http');
          if (isRealBrowser) {
            await lp.default({ module_or_path: '/liteparse_wasm_bg.wasm' });
            this.wasmLoaded = true;
          } else {
            // Node / Vitest testing environment (fallback to high-fidelity stream & zip decompressors)
            this.wasmLoaded = false;
          }
        } catch {
          this.wasmLoaded = false;
        }
      }
      this.liteparseModule = lp;
    } catch {
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
    const lowerName = file.name.toLowerCase();

    // 1. Primary: Official LiteParse WASM Parser (for PDF)
    if (lowerName.endsWith('.pdf')) {
      if (!this.wasmLoaded) {
        await this.init();
      }
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
          console.warn('LiteParse WASM parse encountered an issue, falling back to stream decompressor:', err);
        }
      }

      // 2. High-performance browser stream decompressor fallback for PDF
      const decompressedPages = await this.extractPdfViaDecompression(uint8);
      if (decompressedPages.length > 0) {
        return {
          fileName: file.name,
          fileSize: file.size,
          pages: decompressedPages,
        };
      }
    }

    // 3. Fast DOCX ZIP XML extractor for Word documents
    if (lowerName.endsWith('.docx')) {
      const docxPages = await this.extractDocxViaZip(uint8);
      if (docxPages.length > 0) {
        return {
          fileName: file.name,
          fileSize: file.size,
          pages: docxPages,
        };
      }
    }

    // 4. Clean raw text / unstructured fallback
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

    try {
      const ds = new DecompressionStream('deflate-raw');
      const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer]);
      const stream = blob.stream().pipeThrough(ds);
      const text = await new Response(stream).text();
      if (text && text.trim().length > 0) return text;
    } catch {
      // Fallback to zlib-wrapped deflate
    }

    try {
      const ds = new DecompressionStream('deflate');
      const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer]);
      const stream = blob.stream().pipeThrough(ds);
      const text = await new Response(stream).text();
      if (text && text.trim().length > 0) return text;
    } catch {
      // Fallback to raw text
    }

    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }

  private async extractPdfViaDecompression(uint8: Uint8Array): Promise<ParsedPage[]> {
    const rawPdf = new TextDecoder('latin1').decode(uint8);
    const pages: ParsedPage[] = [];

    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let streamMatch: RegExpExecArray | null;
    let pageNum = 1;

    while ((streamMatch = streamRegex.exec(rawPdf)) !== null) {
      const streamContent = streamMatch[1];
      const streamBytes = new Uint8Array(streamContent.length);
      for (let i = 0; i < streamContent.length; i++) {
        streamBytes[i] = streamContent.charCodeAt(i);
      }

      const decompressed = await this.decompressFlate(streamBytes);
      const extracted = this.extractPdfTokens(decompressed);

      if (extracted.trim().length > 0) {
        pages.push({
          pageNumber: pageNum++,
          text: extracted.trim(),
        });
      }
    }

    return pages;
  }

  private decodeHexPdf(hex: string): string {
    let clean = hex.replace(/\s+/g, '');
    if (clean.length % 2 !== 0) clean += '0';
    let str = '';
    for (let i = 0; i < clean.length; i += 2) {
      const code = parseInt(clean.substring(i, i + 2), 16);
      if (!isNaN(code) && code >= 32 && code <= 126) {
        str += String.fromCharCode(code);
      } else if (code === 10 || code === 13 || code === 9) {
        str += ' ';
      }
    }
    return str;
  }

  private extractPdfTokens(text: string): string {
    const textPieces: string[] = [];

    // 1. Literal string (...) Tj
    const tjMatches = Array.from(text.matchAll(/\(([^)]+)\)\s*Tj/g)).map((m) => m[1]);
    textPieces.push(...tjMatches);

    // 2. Hex string <...> Tj
    const hexTjMatches = Array.from(text.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g)).map((m) => this.decodeHexPdf(m[1]));
    textPieces.push(...hexTjMatches);

    // 3. Array string [...] TJ (both literal and hex items)
    const arrayMatches = Array.from(text.matchAll(/\[([^\]]+)\]\s*TJ/g));
    for (const arr of arrayMatches) {
      const subLiterals = Array.from(arr[1].matchAll(/\(([^)]+)\)/g)).map((m) => m[1]);
      textPieces.push(...subLiterals);

      const subHex = Array.from(arr[1].matchAll(/<([0-9A-Fa-f\s]+)>/g)).map((m) => this.decodeHexPdf(m[1]));
      textPieces.push(...subHex);
    }

    if (textPieces.length > 0) {
      return textPieces.join(' ').replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Direct printable string fallback
    const allParen = Array.from(text.matchAll(/\(([A-Za-z0-9\s.,!?:;'-]{3,})\)/g)).map((m) => m[1]);
    return allParen.join(' ').replace(/\s+/g, ' ').trim();
  }

  private async extractDocxViaZip(uint8: Uint8Array): Promise<ParsedPage[]> {
    let offset = 0;
    const view = new DataView(uint8.buffer, uint8.byteOffset, uint8.byteLength);

    while (offset + 30 <= uint8.length) {
      // Local file header signature: 0x04034b50 ('PK\x03\x04')
      if (view.getUint32(offset, true) !== 0x04034b50) {
        break;
      }

      const compMethod = view.getUint16(offset + 8, true);
      const compSize = view.getUint32(offset + 18, true);
      const fnLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);

      const fnBytes = uint8.subarray(offset + 30, offset + 30 + fnLen);
      const entryName = new TextDecoder('utf-8', { fatal: false }).decode(fnBytes);

      const dataStart = offset + 30 + fnLen + extraLen;
      const dataEnd = dataStart + compSize;

      if (entryName === 'word/document.xml' && dataEnd <= uint8.length) {
        const compData = uint8.subarray(dataStart, dataEnd);
        let xmlText = '';
        if (compMethod === 8) {
          xmlText = await this.decompressFlate(compData);
        } else {
          xmlText = new TextDecoder('utf-8', { fatal: false }).decode(compData);
        }

        // Clean XML tags and normalize document text
        const cleanedText = xmlText
          .replace(/<w:p\b[^>]*>/gi, '\n')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/[^\x20-\x7E\n]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (cleanedText.length > 0) {
          return [{ pageNumber: 1, text: cleanedText }];
        }
      }

      offset = dataEnd;
    }

    return [];
  }

  private async extractTextFallback(uint8: Uint8Array, fileName: string): Promise<ParsedPage[]> {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const raw = decoder.decode(uint8);

    const rawParts = raw.split(/\f|\n(?=--- Page \d+ ---)|\n(?=Page \d+ of \d+)/i);
    const validParts = rawParts
      .map((part) => part.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim())
      .filter((p) => p.length > 0);

    if (validParts.length > 1) {
      return validParts.map((text, idx) => ({
        pageNumber: idx + 1,
        text,
      }));
    }

    const printable = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
    if (printable.length === 0) {
      return [{ pageNumber: 1, text: `Document "${fileName}" was uploaded and indexed.` }];
    }

    return [{ pageNumber: 1, text: printable }];
  }
}

export const globalLiteParseService = new LiteParseService();
