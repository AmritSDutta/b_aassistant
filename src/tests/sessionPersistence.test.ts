import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBStorage, SessionTurnRecord } from '../lib/idbStorage';

// Hermetic in-memory IndexedDB mock for Vitest
function createMockIndexedDB() {
  const stores: Record<string, Map<string, any>> = {
    documents: new Map(),
    chunks: new Map(),
    bm25_index: new Map(),
    session_turns: new Map(),
    session_meta: new Map(),
  };

  const mockDB = {
    objectStoreNames: {
      contains: (name: string) => Object.prototype.hasOwnProperty.call(stores, name),
    },
    createObjectStore: (name: string, _opts?: any) => {
      if (!stores[name]) stores[name] = new Map();
      return {
        createIndex: vi.fn(),
      };
    },
    transaction: (_storeNames: string | string[], _mode?: string) => {
      let oncomplete: (() => void) | null = null;

      const tx = {
        get oncomplete() {
          return oncomplete;
        },
        set oncomplete(fn: (() => void) | null) {
          oncomplete = fn;
          setTimeout(() => fn && fn(), 0);
        },
        onerror: null as any,
        objectStore: (name: string) => {
          const map = stores[name] || new Map();
          return {
            put: (value: any) => {
              const key = value.key || value.id || 'default_key';
              map.set(key, value);
              const req = { onsuccess: null as any, onerror: null as any };
              setTimeout(() => req.onsuccess && req.onsuccess({ target: { result: key } }), 0);
              return req;
            },
            get: (key: string) => {
              const result = map.get(key);
              const req = { result, onsuccess: null as any, onerror: null as any };
              setTimeout(() => req.onsuccess && req.onsuccess({ target: { result } }), 0);
              return req;
            },
            getAll: () => {
              const result = Array.from(map.values());
              const req = { result, onsuccess: null as any, onerror: null as any };
              setTimeout(() => req.onsuccess && req.onsuccess({ target: { result } }), 0);
              return req;
            },
            delete: (key: any) => {
              map.delete(key);
              const req = { onsuccess: null as any, onerror: null as any };
              setTimeout(() => req.onsuccess && req.onsuccess({ target: { result: undefined } }), 0);
              return req;
            },
            clear: () => {
              map.clear();
              const req = { onsuccess: null as any, onerror: null as any };
              setTimeout(() => req.onsuccess && req.onsuccess({ target: { result: undefined } }), 0);
              return req;
            },
            index: (indexName: string) => {
              return {
                getAll: (query?: any) => {
                  let result = Array.from(map.values());
                  if (query !== undefined && indexName === 'sessionId') {
                    result = result.filter((item: any) => item.sessionId === query);
                  }
                  const req = { result, onsuccess: null as any, onerror: null as any };
                  setTimeout(() => req.onsuccess && req.onsuccess({ target: { result } }), 0);
                  return req;
                },
              };
            },
          };
        },
      };

      return tx;
    },
  };

  return {
    open: (_name: string, _version?: number) => {
      const req = {
        result: mockDB,
        onsuccess: null as any,
        onerror: null as any,
        onupgradeneeded: null as any,
      };
      setTimeout(() => {
        if (req.onupgradeneeded) {
          req.onupgradeneeded({ target: { result: mockDB } });
        }
        if (req.onsuccess) {
          req.onsuccess({ target: { result: mockDB } });
        }
      }, 0);
      return req;
    },
    _stores: stores,
  };
}

describe('IDBStorage - Active Session & Sequential Turn Persistence', () => {
  let storage: IDBStorage;
  let mockIndexedDB: ReturnType<typeof createMockIndexedDB>;

  beforeEach(() => {
    mockIndexedDB = createMockIndexedDB();
    (globalThis as any).indexedDB = mockIndexedDB;
    storage = new IDBStorage();
  });

  it('saves and retrieves active session ID', async () => {
    const testSid = 'sess_test_12345';
    await storage.setActiveSessionId(testSid);
    const retrieved = await storage.getActiveSessionId();
    expect(retrieved).toBe(testSid);
  });

  it('saves sequential turns and retrieves them sorted chronologically', async () => {
    const sid = 'sess_chronological_test';

    const turn1: SessionTurnRecord = {
      id: 'turn_1',
      sessionId: sid,
      turnNumber: 1,
      userPrompt: 'What is this system?',
      agentMessage: 'It is a reactive system.',
      timestamp: 1000,
    };

    const turn2: SessionTurnRecord = {
      id: 'turn_2',
      sessionId: sid,
      turnNumber: 2,
      userPrompt: undefined, // user prompt absent
      agentMessage: 'Agent autonomously drew a diagram.',
      canvasSnapshot: 'data:image/png;base64,sample',
      timestamp: 2000,
    };

    await storage.saveSessionTurn(turn2);
    await storage.saveSessionTurn(turn1);

    const retrieved = await storage.getActiveSessionTurns(sid);
    expect(retrieved.length).toBe(2);
    expect(retrieved[0].id).toBe('turn_1');
    expect(retrieved[1].id).toBe('turn_2');
    expect(retrieved[1].userPrompt).toBeUndefined();
    expect(retrieved[1].agentMessage).toBe('Agent autonomously drew a diagram.');
  });

  it('clears session turns for a specific session on reset', async () => {
    const sid1 = 'sess_to_clear';
    const sid2 = 'sess_to_keep';

    await storage.saveSessionTurn({
      id: 'turn_s1',
      sessionId: sid1,
      turnNumber: 1,
      userPrompt: 'Hello 1',
      timestamp: 1000,
    });

    await storage.saveSessionTurn({
      id: 'turn_s2',
      sessionId: sid2,
      turnNumber: 1,
      userPrompt: 'Hello 2',
      timestamp: 1000,
    });

    await storage.clearSessionTurns(sid1);

    const turns1 = await storage.getActiveSessionTurns(sid1);
    const turns2 = await storage.getActiveSessionTurns(sid2);

    expect(turns1.length).toBe(0);
    expect(turns2.length).toBe(1);
    expect(turns2[0].id).toBe('turn_s2');
  });

  it('aggregates all session summaries and sorts by latest activity', async () => {
    await storage.saveSessionTurn({
      id: 't1',
      sessionId: 'sess_older',
      turnNumber: 1,
      userPrompt: 'First Older Prompt',
      timestamp: 1000,
    });
    await storage.saveSessionTurn({
      id: 't2',
      sessionId: 'sess_older',
      turnNumber: 2,
      agentMessage: 'Older Turn 2',
      timestamp: 2000,
    });
    await storage.saveSessionTurn({
      id: 't3',
      sessionId: 'sess_newer',
      turnNumber: 1,
      userPrompt: 'Brand New Prompt',
      timestamp: 5000,
    });

    const summaries = await storage.getAllSessionsSummary();
    expect(summaries.length).toBe(2);
    expect(summaries[0].sessionId).toBe('sess_newer');
    expect(summaries[0].firstPrompt).toBe('Brand New Prompt');
    expect(summaries[0].turnCount).toBe(1);

    expect(summaries[1].sessionId).toBe('sess_older');
    expect(summaries[1].firstPrompt).toBe('First Older Prompt');
    expect(summaries[1].turnCount).toBe(2);
  });

  it('deletes session turns and clears active_session_id if active', async () => {
    const sid = 'sess_to_delete';
    await storage.setActiveSessionId(sid);
    await storage.saveSessionTurn({
      id: 't_del',
      sessionId: sid,
      turnNumber: 1,
      userPrompt: 'Will be deleted',
      timestamp: 1000,
    });

    expect(await storage.getActiveSessionId()).toBe(sid);
    await storage.deleteSession(sid);

    const turns = await storage.getActiveSessionTurns(sid);
    expect(turns.length).toBe(0);
    expect(await storage.getActiveSessionId()).toBeNull();
  });
});
