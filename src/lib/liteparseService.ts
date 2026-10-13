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
      this.liteparseModule = lp;
      this.wasmLoaded = true;
    } catch {
      // Module may not be available or environment lacks WebAssembly; fallback text extractor will be used
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

    // If LiteParse WASM is loaded, use it
    if (this.wasmLoaded && this.liteparseModule) {
      try {
        const parser = new this.liteparseModule.DocumentParser();
        const pagesData = await parser.parse(new Uint8Array(arrayBuffer));
        const pages: ParsedPage[] = pagesData.map((p: any, idx: number) => ({
          pageNumber: p.pageNumber || idx + 1,
          text: p.text || '',
        }));
        return {
          fileName: file.name,
          fileSize: file.size,
          pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: '' }],
        };
      } catch {
        // Fall back to client-side buffer parser below
      }
    }

    // High-performance client-side fallback extractor for PDF and text/word docs
    const pages = await this.fallbackExtract(arrayBuffer, file.name);
    return {
      fileName: file.name,
      fileSize: file.size,
      pages,
    };
  }

  private async fallbackExtract(buffer: ArrayBuffer, fileName: string): Promise<ParsedPage[]> {
    const uint8 = new Uint8Array(buffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawText = decoder.decode(uint8);

    // If it's a PDF, extract text streams /BT ... /ET or /Contents blocks
    if (fileName.toLowerCase().endsWith('.pdf')) {
      const pageBlocks = rawText.split(/\/Type\s*\/Page[^s]/i);
      if (pageBlocks.length > 1) {
        const pages: ParsedPage[] = [];
        for (let i = 1; i < pageBlocks.length; i++) {
          const block = pageBlocks[i];
          const textMatches = Array.from(block.matchAll(/\(([^)]+)\)\s*Tj/g)).map((m) => m[1]);
          const tjMatches = Array.from(block.matchAll(/\[([^\]]+)\]\s*TJ/g)).map((m) => {
            return Array.from(m[1].matchAll(/\(([^)]+)\)/g)).map((sub) => sub[1]).join(' ');
          });
          const combined = [...textMatches, ...tjMatches].join(' ').trim();
          pages.push({
            pageNumber: i,
            text: combined.length > 0 ? combined : `Page ${i} Content`,
          });
        }
        return pages;
      }
    }

    // Default: clean printable text into 1 or more logical pages (approx 1500 chars/page)
    const sanitized = rawText.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
    const pageSize = 1500;
    const pages: ParsedPage[] = [];

    if (sanitized.length === 0) {
      return [{ pageNumber: 1, text: `Empty document: ${fileName}` }];
    }

    let cursor = 0;
    let pageNum = 1;
    while (cursor < sanitized.length) {
      pages.push({
        pageNumber: pageNum++,
        text: sanitized.slice(cursor, cursor + pageSize).trim(),
      });
      cursor += pageSize;
    }

    return pages;
  }
}

export const globalLiteParseService = new LiteParseService();
