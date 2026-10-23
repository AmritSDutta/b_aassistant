import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionController } from '../hooks/useSessionController';
import { useDocumentController } from '../hooks/useDocumentController';
import { useVoiceOrchestrator } from '../hooks/useVoiceOrchestrator';
import { globalIDBStorage } from '../lib/idbStorage';
import { globalCanvasEngine } from '../lib/canvasEngine';

describe('useSessionController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalCanvasEngine.clear();
  });

  it('initializes with a fresh session and empty state', () => {
    const { result } = renderHook(() => useSessionController());

    expect(result.current.sessionId).toMatch(/^sess_/);
    expect(result.current.messages).toEqual([]);
    expect(result.current.turns).toEqual([]);
    expect(result.current.highlights).toEqual([]);
    expect(result.current.showHistory).toBe(false);
  });

  it('appends user message and turn when sending a message', async () => {
    const saveTurnSpy = vi.spyOn(globalIDBStorage, 'saveSessionTurn').mockResolvedValue(undefined);
    const { result } = renderHook(() => useSessionController());

    act(() => {
      result.current.handleSendMessage('Hello assistant');
    });

    expect(result.current.messages.length).toBe(1);
    expect(result.current.messages[0].sender).toBe('user');
    expect(result.current.messages[0].text).toBe('Hello assistant');
    expect(result.current.turns.length).toBe(1);
    expect(result.current.turns[0].userPrompt).toBe('Hello assistant');
    expect(saveTurnSpy).toHaveBeenCalled();
  });

  it('appends and completes agent turns', async () => {
    vi.spyOn(globalIDBStorage, 'saveSessionTurn').mockResolvedValue(undefined);
    const { result } = renderHook(() => useSessionController());

    act(() => {
      result.current.handleSendMessage('User prompt');
    });

    act(() => {
      result.current.handlePostAgentMessage('Agent response');
    });

    expect(result.current.messages.length).toBe(2);
    expect(result.current.messages[1].sender).toBe('agent');
    expect(result.current.messages[1].text).toBe('Agent response');
    expect(result.current.turns.length).toBe(1);
    expect(result.current.turns[0].agentMessage).toBe('Agent response');
  });

  it('toggles message highlight', () => {
    const { result } = renderHook(() => useSessionController());

    act(() => {
      result.current.handleSendMessage('Important note');
    });

    const msgId = result.current.messages[0].id;
    expect(result.current.highlights.length).toBe(0);

    act(() => {
      result.current.handleToggleHighlight(msgId);
    });

    expect(result.current.highlights.length).toBe(1);
    expect(result.current.highlights[0].id).toBe(msgId);

    act(() => {
      result.current.handleToggleHighlight(msgId);
    });

    expect(result.current.highlights.length).toBe(0);
  });

  it('blocks PDF export on an empty session with error callback', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useSessionController({ onError }));

    let exportRes: any;
    act(() => {
      exportRes = result.current.handleExportPdf();
    });

    expect(exportRes.success).toBe(false);
    expect(onError).toHaveBeenCalledWith(
      'Cannot Export Empty Session',
      expect.stringContaining('blank')
    );
  });
});

describe('useDocumentController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects files strictly >= 2MB', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useDocumentController({ onError }));

    const oversizedFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.pdf', {
      type: 'application/pdf',
    });

    await act(async () => {
      await result.current.handleFileSelect(oversizedFile);
    });

    expect(onError).toHaveBeenCalledWith(
      'File Size Exceeded',
      expect.stringContaining('strictly under 2MB')
    );
    expect(result.current.activeDoc).toBeNull();
  });

  it('rejects unsupported file extensions', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useDocumentController({ onError }));

    const invalidFile = new File(['test'], 'image.png', { type: 'image/png' });

    await act(async () => {
      await result.current.handleFileSelect(invalidFile);
    });

    expect(onError).toHaveBeenCalledWith(
      'Unsupported File Type',
      expect.stringContaining('not supported')
    );
    expect(result.current.activeDoc).toBeNull();
  });

  it('accepts and indexes .txt and .md files under 2MB', async () => {
    const onError = vi.fn();
    const onIndexed = vi.fn();
    vi.spyOn(globalIDBStorage, 'saveDocument').mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDocumentController({ onError, onDocumentIndexed: onIndexed })
    );

    const mdFile = new File(['# Personal Goals\n\nDaily workout and reading plans.'], 'goals.md', {
      type: 'text/markdown',
    });

    await act(async () => {
      await result.current.handleFileSelect(mdFile);
    });

    expect(onError).not.toHaveBeenCalled();
    expect(result.current.activeDoc).not.toBeNull();
    expect(result.current.activeDoc?.name).toBe('goals.md');
    expect(result.current.activeDoc?.status).toBe('indexed');
    expect(onIndexed).toHaveBeenCalled();
  });

  it('returns empty array when search is performed with no indexed documents', async () => {
    vi.spyOn(globalIDBStorage, 'getChunks').mockResolvedValue([]);
    vi.spyOn(globalIDBStorage, 'getBM25Index').mockResolvedValue(null);

    const { result } = renderHook(() => useDocumentController());

    let searchRes: any;
    await act(async () => {
      searchRes = await result.current.handleSearchDocument('architecture');
    });

    expect(searchRes).toEqual([]);
  });

  it('clears active document and IDB state on cleanDocument', async () => {
    const clearSpy = vi.spyOn(globalIDBStorage, 'clearAll').mockResolvedValue(undefined);
    const { result } = renderHook(() => useDocumentController());

    await act(async () => {
      await result.current.handleCleanDocument();
    });

    expect(clearSpy).toHaveBeenCalled();
    expect(result.current.activeDoc).toBeNull();
    expect(result.current.chunksRef.current).toEqual([]);
  });
});

describe('useVoiceOrchestrator', () => {
  it('initializes voice agent and modal states correctly', () => {
    const { result } = renderHook(() =>
      useVoiceOrchestrator({
        getMessages: () => [],
        postMessage: vi.fn(),
        searchDocument: async () => [],
        cleanDocument: async () => {},
        searchWeb: async () => ({ results: [] }),
        searchResearch: async () => ({ results: [] }),
        calculate: () => 42,
        exportPdf: () => ({ success: true }),
        getReferenceUrls: () => [],
      })
    );

    expect(result.current.showVoiceSettings).toBe(false);
    expect(result.current.showPreflight).toBe(false);
    expect(result.current.isPreflightApproved).toBe(false);
    expect(result.current.voiceAgent).toBeDefined();
    expect(result.current.voiceAgent.status).toBe('standby');
  });
});
