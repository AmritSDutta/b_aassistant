export interface BM25Doc {
  id: string;
  tokens: string[];
}

export interface BM25Posting {
  chunkId: string;
  tf: number;
}

export interface BM25IndexData {
  id: string;
  docCount: number;
  avgDocLength: number;
  docLengths: Record<string, number>;
  invertedIndex: Record<string, BM25Posting[]>;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

export class BM25Index {
  private k1: number;
  private b: number;
  private docCount: number = 0;
  private avgDocLength: number = 0;
  private docLengths: Map<string, number> = new Map();
  private invertedIndex: Map<string, BM25Posting[]> = new Map();

  constructor(k1: number = 1.5, b: number = 0.75) {
    this.k1 = k1;
    this.b = b;
  }

  public buildIndex(docs: Array<{ id: string; text: string }>): void {
    this.clear();
    this.docCount = docs.length;
    if (this.docCount === 0) return;

    let totalLength = 0;

    for (const doc of docs) {
      const tokens = tokenize(doc.text);
      const docLen = tokens.length;
      this.docLengths.set(doc.id, docLen);
      totalLength += docLen;

      const termCounts = new Map<string, number>();
      for (const token of tokens) {
        termCounts.set(token, (termCounts.get(token) || 0) + 1);
      }

      for (const [term, count] of termCounts.entries()) {
        const postings = this.invertedIndex.get(term) || [];
        postings.push({ chunkId: doc.id, tf: count });
        this.invertedIndex.set(term, postings);
      }
    }

    this.avgDocLength = totalLength / this.docCount;
  }

  public search(query: string, topK: number = 5): Array<{ chunkId: string; score: number }> {
    if (this.docCount === 0) return [];

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const scores = new Map<string, number>();

    for (const token of queryTokens) {
      const postings = this.invertedIndex.get(token);
      if (!postings || postings.length === 0) continue;

      const df = postings.length;
      const idf = Math.log(1 + (this.docCount - df + 0.5) / (df + 0.5));

      for (const posting of postings) {
        const docLen = this.docLengths.get(posting.chunkId) || this.avgDocLength;
        const normLen = 1 - this.b + this.b * (docLen / (this.avgDocLength || 1));
        const score = (idf * (posting.tf * (this.k1 + 1))) / (posting.tf + this.k1 * normLen);

        scores.set(posting.chunkId, (scores.get(posting.chunkId) || 0) + score);
      }
    }

    return Array.from(scores.entries())
      .map(([chunkId, score]) => ({ chunkId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  public exportData(): BM25IndexData {
    const docLengthsObj: Record<string, number> = {};
    for (const [k, v] of this.docLengths.entries()) {
      docLengthsObj[k] = v;
    }

    const invertedIndexObj: Record<string, BM25Posting[]> = {};
    for (const [k, v] of this.invertedIndex.entries()) {
      invertedIndexObj[k] = v;
    }

    return {
      id: 'default_index',
      docCount: this.docCount,
      avgDocLength: this.avgDocLength,
      docLengths: docLengthsObj,
      invertedIndex: invertedIndexObj,
    };
  }

  public loadData(data: BM25IndexData): void {
    this.docCount = data.docCount;
    this.avgDocLength = data.avgDocLength;
    this.docLengths = new Map(Object.entries(data.docLengths));
    this.invertedIndex = new Map(Object.entries(data.invertedIndex));
  }

  public clear(): void {
    this.docCount = 0;
    this.avgDocLength = 0;
    this.docLengths.clear();
    this.invertedIndex.clear();
  }
}
