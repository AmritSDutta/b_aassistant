import { describe, it, expect } from 'vitest';
import { BM25Index, tokenize } from '../lib/bm25';

describe('BM25 Lexical Indexer and Scorer', () => {
  it('tokenizes text correctly removing punctuation and short terms', () => {
    const tokens = tokenize('Hello, world! This is a test document with LiteParse-WASM.');
    expect(tokens).toContain('hello');
    expect(tokens).toContain('world');
    expect(tokens).toContain('this');
    expect(tokens).toContain('document');
    expect(tokens).toContain('liteparse');
    expect(tokens).toContain('wasm');
    expect(tokens).not.toContain('a');
  });

  it('ranks documents correctly based on term frequency and inverted index', () => {
    const bm25 = new BM25Index();
    bm25.buildIndex([
      { id: 'doc1', text: 'Cloudflare Pages deployment with static Vite bundle' },
      { id: 'doc2', text: 'Quantum entanglement and particle physics simulation' },
      { id: 'doc3', text: 'Cloudflare Workers and Pages edge network' },
    ]);

    const results = bm25.search('Cloudflare Pages');
    expect(results.length).toBeGreaterThan(0);
    expect(['doc1', 'doc3']).toContain(results[0].chunkId);
    expect(results.find((r) => r.chunkId === 'doc2')).toBeUndefined();
  });

  it('exports and reloads index data seamlessly', () => {
    const bm25 = new BM25Index();
    bm25.buildIndex([
      { id: 'page1', text: 'Machine learning transformers and neural networks' },
      { id: 'page2', text: 'Database indexing with B-trees and inverted indexes' },
    ]);

    const exported = bm25.exportData();
    expect(exported.docCount).toBe(2);

    const reloaded = new BM25Index();
    reloaded.loadData(exported);

    const searchRes = reloaded.search('transformers');
    expect(searchRes.length).toBe(1);
    expect(searchRes[0].chunkId).toBe('page1');
  });
});
