import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Branding } from './components/Branding';
import { FileUpload, ActiveDocumentInfo } from './components/FileUpload';
import { ReferenceUrls } from './components/ReferenceUrls';
import { BlankSlot } from './components/BlankSlot';
import { CanvasArea } from './components/CanvasArea';
import { ChatArea, ChatMessage } from './components/ChatArea';
import { NotificationModal } from './components/NotificationModal';
import { WelcomeModal } from './components/WelcomeModal';
import { HistoryModal } from './components/HistoryModal';
import { WebMCPProvider } from './webmcp/provider';
import { ToolContext } from './webmcp/tools';
import { BM25Index, removeStopWords } from './lib/bm25';
import { globalIDBStorage, StoredDocument, StoredChunk, SessionTurnRecord, SessionSummary } from './lib/idbStorage';
import { globalLiteParseService } from './lib/liteparseService';
import { calculateMath } from './lib/mathEvaluator';
import { searchWeb, searchResearch } from './lib/searchService';
import { globalCanvasEngine } from './lib/canvasEngine';
import { exportSessionPdf } from './lib/pdfExportService';
import { initSourceProtection } from './lib/sourceProtection';
import {
  useVoiceSettings,
  useVoiceAgent,
  GeminiSubagentProvider,
  VoiceBridge,
  VoiceLiveController,
  VoiceSettingsModal,
  AudioPreflightModal,
} from './voice';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB strictly
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const ONBOARD_KEY = 'b_onboarded';
const URLS_STORAGE_KEY = 'b_reference_urls';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('b_theme') as 'light' | 'dark') || 'dark';
  });

  const [sessionId, setSessionId] = useState<string>(() => {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  });
  const sessionIdRef = useRef<string>(sessionId);
  sessionIdRef.current = sessionId;

  const [turns, setTurns] = useState<SessionTurnRecord[]>([]);
  const turnsRef = useRef<SessionTurnRecord[]>(turns);
  turnsRef.current = turns;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;

  const [activeDoc, setActiveDoc] = useState<ActiveDocumentInfo | null>(null);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: '',
  });
  const [showWelcome, setShowWelcome] = useState<boolean>(() => !localStorage.getItem(ONBOARD_KEY));
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [savedSessions, setSavedSessions] = useState<SessionSummary[]>([]);
  const [sessionMinutes, setSessionMinutes] = useState(0);

  const refreshSavedSessions = useCallback(async () => {
    try {
      const summaries = await globalIDBStorage.getAllSessionsSummary();
      setSavedSessions(summaries);
    } catch (err) {
      console.warn('Could not load session summaries from IDB:', err);
    }
  }, []);

  const [referenceUrls, setReferenceUrls] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(URLS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const referenceUrlsRef = useRef<string[]>(referenceUrls);
  referenceUrlsRef.current = referenceUrls;

  const bm25Ref = useRef<BM25Index>(new BM25Index());
  const chunksRef = useRef<StoredChunk[]>([]);
  const webmcpRef = useRef<WebMCPProvider | null>(null);

  // Attach source protection against right click, F12, and DevTools/View Source shortcuts
  useEffect(() => {
    const cleanup = initSourceProtection({
      disableContextMenu: true,
      disableDevToolsShortcuts: true,
    });
    return cleanup;
  }, []);

  // Gentle session clock: minutes in session (no countdown pressure)
  useEffect(() => {
    const start = Date.now();
    const tick = () => setSessionMinutes(Math.floor((Date.now() - start) / 60000));
    tick();
    const id = window.setInterval(tick, 60000);
    return () => window.clearInterval(id);
  }, []);

  const handleCloseWelcome = useCallback(() => {
    setShowWelcome(false);
    localStorage.setItem(ONBOARD_KEY, '1');
  }, []);

  // Restore stored document and active session turns on mount
  useEffect(() => {
    (async () => {
      try {
        // 1. Restore document if exists
        const storedDoc = await globalIDBStorage.getActiveDocument();
        const storedIndex = await globalIDBStorage.getBM25Index();
        const storedChunks = await globalIDBStorage.getChunks();

        if (storedDoc && storedIndex) {
          bm25Ref.current.loadData(storedIndex);
          chunksRef.current = storedChunks;
          setActiveDoc({
            name: storedDoc.name,
            size: storedDoc.size,
            pageCount: storedDoc.pageCount,
            status: 'indexed',
          });
        }

        // 2. Restore active session ID
        let activeSid = await globalIDBStorage.getActiveSessionId();
        if (!activeSid) {
          activeSid = sessionIdRef.current;
          await globalIDBStorage.setActiveSessionId(activeSid);
        } else {
          setSessionId(activeSid);
          sessionIdRef.current = activeSid;
        }

        // 3. Restore active session turns
        const storedTurns = await globalIDBStorage.getActiveSessionTurns(activeSid);
        if (storedTurns && storedTurns.length > 0) {
          setTurns(storedTurns);
          turnsRef.current = storedTurns;

          // Reconstruct messages from sequential turns
          const restoredMessages: ChatMessage[] = [];
          for (const turn of storedTurns) {
            if (turn.userPrompt && turn.userPrompt.trim()) {
              restoredMessages.push({
                id: `user-${turn.id}`,
                sender: 'user',
                text: turn.userPrompt,
                timestamp: turn.timestamp,
              });
            }
            if (turn.agentMessage && turn.agentMessage.trim()) {
              restoredMessages.push({
                id: `agent-${turn.id}`,
                sender: 'agent',
                text: turn.agentMessage,
                timestamp: turn.timestamp,
              });
            }
          }
          if (restoredMessages.length > 0) {
            setMessages(restoredMessages);
            messagesRef.current = restoredMessages;
          }

          // Restore latest canvas shapes if saved in any turn
          const turnWithShapes = [...storedTurns]
            .reverse()
            .find((t) => Array.isArray(t.canvasShapes) && t.canvasShapes.length > 0);
          if (turnWithShapes && turnWithShapes.canvasShapes) {
            globalCanvasEngine.setShapes(turnWithShapes.canvasShapes as any);
          }
        }
        await refreshSavedSessions();
      } catch (err) {
        console.warn('Could not restore stored document or session:', err);
      }
    })();
  }, [refreshSavedSessions]);

  const handlePostAgentMessage = useCallback((text: string) => {
    const currentTurnCount = turnsRef.current.length;
    const lastTurn = currentTurnCount > 0 ? turnsRef.current[currentTurnCount - 1] : null;
    const canvasSnapshot = globalCanvasEngine.hasContent()
      ? globalCanvasEngine.getSnapshotDataUrl() || undefined
      : undefined;
    const canvasShapes = globalCanvasEngine.getShapes();

    if (lastTurn && !lastTurn.agentMessage) {
      // Complete existing user turn
      const completedTurn: SessionTurnRecord = {
        ...lastTurn,
        agentMessage: text,
        canvasSnapshot,
        canvasShapes,
      };
      const updatedTurns = turnsRef.current.map((t) => (t.id === lastTurn.id ? completedTurn : t));
      setTurns(updatedTurns);
      turnsRef.current = updatedTurns;
      globalIDBStorage
        .saveSessionTurn(completedTurn)
        .then(() => refreshSavedSessions())
        .catch((e) => console.warn('Failed to save turn to IDB:', e));
    } else {
      // Standalone agent turn (userPrompt is absent/undefined)
      const turnId = `turn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newTurn: SessionTurnRecord = {
        id: turnId,
        sessionId: sessionIdRef.current,
        turnNumber: currentTurnCount + 1,
        userPrompt: undefined,
        agentMessage: text,
        canvasSnapshot,
        canvasShapes,
        timestamp: Date.now(),
      };
      const updatedTurns = [...turnsRef.current, newTurn];
      setTurns(updatedTurns);
      turnsRef.current = updatedTurns;
      globalIDBStorage
        .saveSessionTurn(newTurn)
        .then(() => refreshSavedSessions())
        .catch((e) => console.warn('Failed to save turn to IDB:', e));
    }

    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      sender: 'agent',
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);
  }, [refreshSavedSessions]);

  const handleSearchDocument = useCallback(async (query: string) => {
    // If no document is currently loaded in memory, try loading from IndexedDB
    if (chunksRef.current.length === 0) {
      try {
        const storedChunks = await globalIDBStorage.getChunks();
        const storedIndex = await globalIDBStorage.getBM25Index();
        if (storedChunks && storedChunks.length > 0) {
          chunksRef.current = storedChunks;
          if (storedIndex) {
            bm25Ref.current.loadData(storedIndex);
          } else {
            bm25Ref.current.buildIndex(storedChunks.map((c) => ({ id: c.id, text: c.text })));
          }
        }
      } catch (err) {
        console.warn('Error reading stored chunks from IDB:', err);
      }
    }

    if (chunksRef.current.length === 0) {
      return [];
    }

    const sanitizedQuery = removeStopWords(query) || query;
    const chunkMap = new Map(chunksRef.current.map((c) => [c.id, c]));
    const ranked = bm25Ref.current.search(sanitizedQuery, 3);

    // If BM25 found matches, return top 3
    if (ranked.length > 0) {
      return ranked.slice(0, 3).map((r) => {
        const chunk = chunkMap.get(r.chunkId);
        return {
          pageNumber: chunk?.pageNumber || 1,
          text: chunk?.text || '',
          score: Number(r.score.toFixed(4)),
        };
      });
    }

    // Fallback: If query had no keyword overlap, return top 3 available chunks with baseline preview score
    return chunksRef.current.slice(0, 3).map((chunk) => ({
      pageNumber: chunk.pageNumber,
      text: chunk.text,
      score: 0.1,
    }));
  }, []);

  const handleCleanDocument = useCallback(async () => {
    try {
      await globalIDBStorage.clearAll();
    } catch (e) {
      console.warn('IDB clear error:', e);
    }
    bm25Ref.current.clear();
    chunksRef.current = [];
    setActiveDoc(null);
  }, []);

  const handleExportPdf = useCallback(() => {
    const activeTurns = turnsRef.current;
    const hasCanvas = globalCanvasEngine.hasContent();
    const hasDialogue = messagesRef.current.some((m) => m.text && m.text.trim().length > 0);
    const hasSequentialTurns =
      activeTurns.length > 0 &&
      activeTurns.some(
        (t) =>
          (t.userPrompt && t.userPrompt.trim().length > 0) ||
          (t.agentMessage && t.agentMessage.trim().length > 0) ||
          Boolean(t.canvasSnapshot)
      );

    if (!hasSequentialTurns && !hasCanvas && !hasDialogue) {
      setErrorModal({
        isOpen: true,
        title: 'Cannot Export Empty Session',
        message:
          'The current session is blank. Please create a diagram on the canvas or send a message in the chat before exporting to PDF.',
      });
      return {
        success: false,
        error: 'Cannot export an empty session without canvas diagrams or chat messages.',
      };
    }

    // Attach latest canvas snapshot to latest turn if missing
    const turnsToExport = [...activeTurns];
    if (hasCanvas && turnsToExport.length > 0) {
      const lastIdx = turnsToExport.length - 1;
      if (!turnsToExport[lastIdx].canvasSnapshot) {
        turnsToExport[lastIdx] = {
          ...turnsToExport[lastIdx],
          canvasSnapshot: globalCanvasEngine.getSnapshotDataUrl() || undefined,
        };
      }
    }

    const dataUrl = hasCanvas ? globalCanvasEngine.getSnapshotDataUrl() : null;
    return exportSessionPdf({
      sessionId: sessionIdRef.current,
      turns: turnsToExport,
      canvasDataUrl: dataUrl,
      messages: messagesRef.current,
      docName: activeDoc?.name,
      hasCanvasContent: hasCanvas,
    });
  }, [activeDoc]);

  // Update WebMCP Context
  const updateWebMCPContext = useCallback(() => {
    if (webmcpRef.current) {
      webmcpRef.current.updateContext({
        getMessages: () => messagesRef.current,
        postMessage: (text: string) => handlePostAgentMessage(text),
        searchDocument: handleSearchDocument,
        cleanDocument: handleCleanDocument,
        searchWeb: (query: string) => searchWeb(query),
        searchResearch: (query: string) => searchResearch(query),
        calculate: (expr: string) => calculateMath(expr),
        exportPdf: handleExportPdf,
        getReferenceUrls: () => referenceUrlsRef.current,
      });
    }
  }, [handlePostAgentMessage, handleSearchDocument, handleCleanDocument, handleExportPdf]);

  // Keep latest handlers reachable from the (stable) provider context without re-registering
  const webmcpHandlersRef = useRef({
    handlePostAgentMessage,
    handleSearchDocument,
    handleCleanDocument,
    handleExportPdf,
  });
  webmcpHandlersRef.current = {
    handlePostAgentMessage,
    handleSearchDocument,
    handleCleanDocument,
    handleExportPdf,
  };

  // Initialize WebMCP Provider once. Handlers are proxied through a ref so this
  // never re-registers (and never aborts mid-session on callback identity churn).
  useEffect(() => {
    const context: ToolContext = {
      getMessages: () => messagesRef.current,
      postMessage: (text: string) => webmcpHandlersRef.current.handlePostAgentMessage(text),
      searchDocument: (query: string) => webmcpHandlersRef.current.handleSearchDocument(query),
      cleanDocument: () => webmcpHandlersRef.current.handleCleanDocument(),
      searchWeb: (query: string) => searchWeb(query),
      searchResearch: (query: string) => searchResearch(query),
      calculate: (expr: string) => calculateMath(expr),
      exportPdf: () => webmcpHandlersRef.current.handleExportPdf(),
      getReferenceUrls: () => referenceUrlsRef.current,
    };

    const provider = new WebMCPProvider(context);
    provider.register();
    webmcpRef.current = provider;

    return () => {
      provider.unregister();
    };
  }, []);

  useEffect(() => {
    updateWebMCPContext();
  }, [messages, updateWebMCPContext]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('b_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const {
    apiKey,
    setApiKey,
    liveModel,
    setLiveModel,
    subagentModel,
    setSubagentModel,
    studioVoice,
    setStudioVoice,
  } = useVoiceSettings();

  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [showPreflight, setShowPreflight] = useState(false);
  const [isPreflightApproved, setIsPreflightApproved] = useState(false);

  const voiceBridgeRef = useRef<VoiceBridge | null>(null);
  if (!voiceBridgeRef.current) {
    voiceBridgeRef.current = new VoiceBridge({
      subagent: new GeminiSubagentProvider(apiKey, subagentModel),
      postChatMessage: handlePostAgentMessage,
      toolContext: {
        getMessages: () => messagesRef.current,
        postMessage: (t: string) => handlePostAgentMessage(t),
        searchDocument: (q: string) => handleSearchDocument(q),
        cleanDocument: () => handleCleanDocument(),
        searchWeb: (q: string) => searchWeb(q),
        searchResearch: (q: string) => searchResearch(q),
        calculate: (e: string) => calculateMath(e),
        exportPdf: () => handleExportPdf(),
        getReferenceUrls: () => referenceUrlsRef.current,
      },
    });
  }

  useEffect(() => {
    if (voiceBridgeRef.current) {
      voiceBridgeRef.current.setSubagent(new GeminiSubagentProvider(apiKey, subagentModel));
      voiceBridgeRef.current.setPostChatMessage(handlePostAgentMessage);
      voiceBridgeRef.current.setToolContext({
        getMessages: () => messagesRef.current,
        postMessage: handlePostAgentMessage,
        searchDocument: handleSearchDocument,
        cleanDocument: handleCleanDocument,
        searchWeb: (q: string) => searchWeb(q),
        searchResearch: (q: string) => searchResearch(q),
        calculate: (e: string) => calculateMath(e),
        exportPdf: handleExportPdf,
        getReferenceUrls: () => referenceUrlsRef.current,
      });
    }
  }, [apiKey, subagentModel, handlePostAgentMessage, handleSearchDocument, handleCleanDocument, handleExportPdf]);

  const voiceAgent = useVoiceAgent({
    apiKey,
    liveModel,
    studioVoice,
    voiceBridge: voiceBridgeRef.current,
    onRequireSettings: () => setShowVoiceSettings(true),
    onRequirePreflight: () => setShowPreflight(true),
    isPreflightApproved,
  });

  const handleNewSession = useCallback(async () => {
    const newSid = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setSessionId(newSid);
    sessionIdRef.current = newSid;
    setTurns([]);
    turnsRef.current = [];
    setMessages([]);
    messagesRef.current = [];
    globalCanvasEngine.clear();
    try {
      await globalIDBStorage.setActiveSessionId(newSid);
      await refreshSavedSessions();
    } catch (e) {
      console.warn('Failed to update active session ID in IDB:', e);
    }
  }, [refreshSavedSessions]);

  const handleOpenHistory = useCallback(async () => {
    await refreshSavedSessions();
    setShowHistory(true);
  }, [refreshSavedSessions]);

  const handleRestoreSession = useCallback(async (targetSid: string) => {
    try {
      const storedTurns = await globalIDBStorage.getActiveSessionTurns(targetSid);
      setSessionId(targetSid);
      sessionIdRef.current = targetSid;
      await globalIDBStorage.setActiveSessionId(targetSid);

      setTurns(storedTurns);
      turnsRef.current = storedTurns;

      const restoredMessages: ChatMessage[] = [];
      for (const turn of storedTurns) {
        if (turn.userPrompt && turn.userPrompt.trim()) {
          restoredMessages.push({
            id: `user-${turn.id}`,
            sender: 'user',
            text: turn.userPrompt,
            timestamp: turn.timestamp,
          });
        }
        if (turn.agentMessage && turn.agentMessage.trim()) {
          restoredMessages.push({
            id: `agent-${turn.id}`,
            sender: 'agent',
            text: turn.agentMessage,
            timestamp: turn.timestamp,
          });
        }
      }
      setMessages(restoredMessages);
      messagesRef.current = restoredMessages;

      const turnWithShapes = [...storedTurns]
        .reverse()
        .find((t) => Array.isArray(t.canvasShapes) && t.canvasShapes.length > 0);

      if (turnWithShapes && turnWithShapes.canvasShapes) {
        globalCanvasEngine.setShapes(turnWithShapes.canvasShapes as any);
      } else {
        globalCanvasEngine.clear();
      }

      setShowHistory(false);
    } catch (err) {
      console.warn('Failed to restore session:', err);
    }
  }, []);

  const handleDeleteSession = useCallback(
    async (targetSid: string) => {
      try {
        await globalIDBStorage.deleteSession(targetSid);
        if (targetSid === sessionIdRef.current) {
          await handleNewSession();
        }
        await refreshSavedSessions();
      } catch (err) {
        console.warn('Failed to delete session:', err);
      }
    },
    [handleNewSession, refreshSavedSessions]
  );

  const handleExportPastSessionPdf = useCallback(
    async (targetSid: string) => {
      try {
        const pastTurns = await globalIDBStorage.getActiveSessionTurns(targetSid);
        const pastMessages: ChatMessage[] = [];
        for (const t of pastTurns) {
          if (t.userPrompt && t.userPrompt.trim()) {
            pastMessages.push({ id: `user-${t.id}`, sender: 'user', text: t.userPrompt, timestamp: t.timestamp });
          }
          if (t.agentMessage && t.agentMessage.trim()) {
            pastMessages.push({ id: `agent-${t.id}`, sender: 'agent', text: t.agentMessage, timestamp: t.timestamp });
          }
        }
        const turnWithSnap = [...pastTurns].reverse().find((t) => Boolean(t.canvasSnapshot));
        const canvasDataUrl = turnWithSnap?.canvasSnapshot || null;

        exportSessionPdf({
          sessionId: targetSid,
          turns: pastTurns,
          canvasDataUrl,
          messages: pastMessages,
          docName: activeDoc?.name,
          hasCanvasContent: Boolean(canvasDataUrl),
        });
      } catch (err) {
        console.warn('Failed to export past session PDF:', err);
      }
    },
    [activeDoc]
  );

  const handleSendMessage = (text: string) => {
    const turnId = `turn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newTurn: SessionTurnRecord = {
      id: turnId,
      sessionId: sessionIdRef.current,
      turnNumber: turnsRef.current.length + 1,
      userPrompt: text,
      timestamp: Date.now(),
    };
    const updatedTurns = [...turnsRef.current, newTurn];
    setTurns(updatedTurns);
    turnsRef.current = updatedTurns;
    globalIDBStorage
      .saveSessionTurn(newTurn)
      .then(() => refreshSavedSessions())
      .catch((e) => console.warn('Failed to save turn to IDB:', e));

    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      sender: 'user',
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleToggleHighlight = useCallback((id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, highlighted: !m.highlighted } : m)));
  }, []);

  const jumpToMessage = useCallback((id: string) => {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleAddReferenceUrl = useCallback(
    async (url: string): Promise<boolean> => {
      if (referenceUrlsRef.current.length >= 10 || referenceUrlsRef.current.includes(url)) {
        return false;
      }
      const updated = [...referenceUrlsRef.current, url];
      setReferenceUrls(updated);
      referenceUrlsRef.current = updated;
      try {
        localStorage.setItem(URLS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to cache reference URLs:', e);
      }
      updateWebMCPContext();
      return true;
    },
    [updateWebMCPContext]
  );

  const handleRemoveReferenceUrl = useCallback(
    (url: string) => {
      const updated = referenceUrlsRef.current.filter((u) => u !== url);
      setReferenceUrls(updated);
      referenceUrlsRef.current = updated;
      try {
        localStorage.setItem(URLS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to update cached reference URLs:', e);
      }
      updateWebMCPContext();
    },
    [updateWebMCPContext]
  );

  const handleFileSelect = async (file: File) => {
    // 1. Check size strictly < 2MB
    if (file.size >= MAX_FILE_SIZE) {
      setErrorModal({
        isOpen: true,
        title: 'File Size Exceeded',
        message: `File "${file.name}" is ${(file.size / (1024 * 1024)).toFixed(2)} MB. bAssistant accepts files strictly under 2MB for client-side processing.`,
      });
      return;
    }

    // 2. Check extension (.pdf, .doc, .docx)
    const lowerName = file.name.toLowerCase();
    const isAllowed = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!isAllowed) {
      setErrorModal({
        isOpen: true,
        title: 'Unsupported File Type',
        message: `File "${file.name}" is not supported. Please upload a PDF (.pdf) or Word document (.doc, .docx).`,
      });
      return;
    }

    setActiveDoc({
      name: file.name,
      size: file.size,
      pageCount: 1,
      status: 'parsing',
    });

    try {
      await globalLiteParseService.init();
      const parseResult = await globalLiteParseService.parseFile(file);

      const docId = `doc_${Date.now()}`;
      const chunks: StoredChunk[] = parseResult.pages.map((p, idx) => ({
        id: `${docId}_p${p.pageNumber}_${idx}`,
        docId,
        pageNumber: p.pageNumber,
        text: p.text,
      }));

      // Index with BM25
      const newBM25 = new BM25Index();
      newBM25.buildIndex(chunks.map((c) => ({ id: c.id, text: c.text })));
      bm25Ref.current = newBM25;
      chunksRef.current = chunks;

      const storedDoc: StoredDocument = {
        id: docId,
        name: file.name,
        size: file.size,
        pageCount: parseResult.pages.length,
        createdAt: Date.now(),
      };

      await globalIDBStorage.saveDocument(storedDoc, chunks, newBM25.exportData());

      setActiveDoc({
        name: file.name,
        size: file.size,
        pageCount: parseResult.pages.length,
        status: 'indexed',
      });

      updateWebMCPContext();
    } catch (err: any) {
      console.error('File parsing failed:', err);
      setActiveDoc({
        name: file.name,
        size: file.size,
        pageCount: 0,
        status: 'error',
      });
      setErrorModal({
        isOpen: true,
        title: 'Parsing Failed',
        message: `Could not parse "${file.name}": ${err?.message || 'Unknown error'}`,
      });
    }
  };

  const highlights = messages.filter((m) => m.highlighted);

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
      {/* Left Sidebar (20% width) */}
      <aside
        className="w-[20%] min-w-[220px] max-w-[360px] h-full flex flex-col border-r"
        style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
      >
        <Branding
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenTips={() => setShowWelcome(true)}
          onOpenVoiceSettings={() => setShowVoiceSettings(true)}
        />
        <FileUpload
          activeDoc={activeDoc}
          onFileSelect={handleFileSelect}
          onClearDocument={handleCleanDocument}
        />
        <ReferenceUrls
          urls={referenceUrls}
          onAddUrl={handleAddReferenceUrl}
          onRemoveUrl={handleRemoveReferenceUrl}
        />
        <BlankSlot highlights={highlights} onJumpTo={jumpToMessage} />
        {/* Gentle session strip */}
        <div
          className="px-4 py-2 border-t flex items-center justify-between font-mono text-[10px]"
          style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}
        >
          <span>
            {messages.length} messages · {highlights.length} highlights · {sessionMinutes} min
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenHistory}
              className="uppercase tracking-[0.06em] font-bold hover:underline"
              style={{ color: 'var(--accent)' }}
              title="Open archived deliberation sessions"
            >
              sessions
            </button>
          </div>
        </div>
      </aside>

      {/* Main Area (80% width) */}
      <main className="flex-1 h-full flex flex-col overflow-hidden">
        <CanvasArea
          theme={theme}
          onExportPdf={handleExportPdf}
          onNewSession={handleNewSession}
          onClear={() => globalCanvasEngine.clear()}
        />
        <ChatArea
          messages={messages}
          onSendMessage={handleSendMessage}
          onToggleHighlight={handleToggleHighlight}
          voiceController={
            <VoiceLiveController
              status={voiceAgent.status}
              statusText={voiceAgent.statusText}
              captionPreview={voiceAgent.captionPreview}
              isListening={voiceAgent.isListening}
              onToggleListening={voiceAgent.toggleListening}
              onOpenSettings={() => setShowVoiceSettings(true)}
            />
          }
        />
      </main>

      {/* First-load onboarding */}
      <WelcomeModal isOpen={showWelcome} onClose={handleCloseWelcome} />

      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={showVoiceSettings}
        onClose={() => setShowVoiceSettings(false)}
        apiKey={apiKey}
        liveModel={liveModel}
        subagentModel={subagentModel}
        studioVoice={studioVoice}
        onSave={async (settings) => {
          await setApiKey(settings.apiKey);
          setLiveModel(settings.liveModel);
          setSubagentModel(settings.subagentModel);
          setStudioVoice(settings.studioVoice);
        }}
      />

      {/* Audio Preflight Modal */}
      <AudioPreflightModal
        isOpen={showPreflight}
        onClose={() => setShowPreflight(false)}
        onSuccess={() => {
          setIsPreflightApproved(true);
          setShowPreflight(false);
          void voiceAgent.startListening();
        }}
      />

      {/* Session History Modal */}
      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        currentSessionId={sessionId}
        sessions={savedSessions}
        onRestoreSession={handleRestoreSession}
        onExportSessionPdf={handleExportPastSessionPdf}
        onDeleteSession={handleDeleteSession}
      />

      {/* Modal Popup */}
      <NotificationModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default App;
