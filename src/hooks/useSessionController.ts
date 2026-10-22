import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from '../components/ChatArea';
import { globalIDBStorage, SessionTurnRecord, SessionSummary } from '../lib/idbStorage';
import { globalCanvasEngine } from '../lib/canvasEngine';
import { exportSessionPdf, ExportPdfResult } from '../lib/pdfExportService';

export interface UseSessionControllerOptions {
  activeDocName?: string;
  onError?: (title: string, message: string) => void;
}

export interface UseSessionControllerResult {
  sessionId: string;
  sessionIdRef: React.MutableRefObject<string>;
  turns: SessionTurnRecord[];
  turnsRef: React.MutableRefObject<SessionTurnRecord[]>;
  messages: ChatMessage[];
  messagesRef: React.MutableRefObject<ChatMessage[]>;
  highlights: ChatMessage[];
  savedSessions: SessionSummary[];
  sessionMinutes: number;
  showHistory: boolean;
  setShowHistory: React.Dispatch<React.SetStateAction<boolean>>;
  refreshSavedSessions: () => Promise<void>;
  handleSendMessage: (text: string) => void;
  handlePostAgentMessage: (text: string) => void;
  handleToggleHighlight: (id: string) => void;
  jumpToMessage: (id: string) => void;
  handleNewSession: () => Promise<void>;
  handleOpenHistory: () => Promise<void>;
  handleCloseHistory: () => void;
  handleRestoreSession: (targetSid: string) => Promise<void>;
  handleDeleteSession: (targetSid: string) => Promise<void>;
  handleExportPastSessionPdf: (targetSid: string) => Promise<void>;
  handleExportPdf: () => ExportPdfResult;
}

/**
 * Manages active and historical deliberation sessions, turns, messages, and PDF reporting.
 */
export function useSessionController({
  activeDocName,
  onError,
}: UseSessionControllerOptions = {}): UseSessionControllerResult {
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

  const [savedSessions, setSavedSessions] = useState<SessionSummary[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [sessionMinutes, setSessionMinutes] = useState<number>(0);

  const refreshSavedSessions = useCallback(async (): Promise<void> => {
    try {
      const summaries = await globalIDBStorage.getAllSessionsSummary();
      setSavedSessions(summaries);
    } catch (err) {
      console.warn('Could not load session summaries from IDB:', err);
    }
  }, []);

  // Gentle session clock tracking elapsed minutes
  useEffect(() => {
    const start = Date.now();
    const tick = (): void => setSessionMinutes(Math.floor((Date.now() - start) / 60000));
    tick();
    const id = window.setInterval(tick, 60000);
    return () => window.clearInterval(id);
  }, []);

  // Restore active session turns on mount
  useEffect(() => {
    (async (): Promise<void> => {
      try {
        let activeSid = await globalIDBStorage.getActiveSessionId();
        if (!activeSid) {
          activeSid = sessionIdRef.current;
          await globalIDBStorage.setActiveSessionId(activeSid);
        } else {
          setSessionId(activeSid);
          sessionIdRef.current = activeSid;
        }

        const storedTurns = await globalIDBStorage.getActiveSessionTurns(activeSid);
        if (storedTurns && storedTurns.length > 0) {
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
          if (restoredMessages.length > 0) {
            setMessages(restoredMessages);
            messagesRef.current = restoredMessages;
          }

          const turnWithShapes = [...storedTurns]
            .reverse()
            .find((t) => Array.isArray(t.canvasShapes) && t.canvasShapes.length > 0);
          if (turnWithShapes && turnWithShapes.canvasShapes) {
            globalCanvasEngine.setShapes(turnWithShapes.canvasShapes as any);
          }
        }
        await refreshSavedSessions();
      } catch (err) {
        console.warn('Could not restore session from IDB:', err);
      }
    })();
  }, [refreshSavedSessions]);

  const handlePostAgentMessage = useCallback(
    (text: string): void => {
      const currentTurnCount = turnsRef.current.length;
      const lastTurn = currentTurnCount > 0 ? turnsRef.current[currentTurnCount - 1] : null;
      const canvasSnapshot = globalCanvasEngine.hasContent()
        ? globalCanvasEngine.getSnapshotDataUrl() || undefined
        : undefined;
      const canvasShapes = globalCanvasEngine.getShapes();

      if (lastTurn && !lastTurn.agentMessage) {
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
    },
    [refreshSavedSessions]
  );

  const handleSendMessage = useCallback(
    (text: string): void => {
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
    },
    [refreshSavedSessions]
  );

  const handleToggleHighlight = useCallback((id: string): void => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, highlighted: !m.highlighted } : m)));
  }, []);

  const jumpToMessage = useCallback((id: string): void => {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleNewSession = useCallback(async (): Promise<void> => {
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

  const handleOpenHistory = useCallback(async (): Promise<void> => {
    await refreshSavedSessions();
    setShowHistory(true);
  }, [refreshSavedSessions]);

  const handleCloseHistory = useCallback((): void => {
    setShowHistory(false);
  }, []);

  const handleRestoreSession = useCallback(async (targetSid: string): Promise<void> => {
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
    async (targetSid: string): Promise<void> => {
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
    async (targetSid: string): Promise<void> => {
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
          docName: activeDocName,
          hasCanvasContent: Boolean(canvasDataUrl),
        });
      } catch (err) {
        console.warn('Failed to export past session PDF:', err);
      }
    },
    [activeDocName]
  );

  const handleExportPdf = useCallback((): ExportPdfResult => {
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
      onError?.(
        'Cannot Export Empty Session',
        'The current session is blank. Please create a diagram on the canvas or send a message in the chat before exporting to PDF.'
      );
      return {
        success: false,
        error: 'Cannot export an empty session without canvas diagrams or chat messages.',
      };
    }

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
      docName: activeDocName,
      hasCanvasContent: hasCanvas,
    });
  }, [activeDocName, onError]);

  const highlights = messages.filter((m) => m.highlighted);

  return {
    sessionId,
    sessionIdRef,
    turns,
    turnsRef,
    messages,
    messagesRef,
    highlights,
    savedSessions,
    sessionMinutes,
    showHistory,
    setShowHistory,
    refreshSavedSessions,
    handleSendMessage,
    handlePostAgentMessage,
    handleToggleHighlight,
    jumpToMessage,
    handleNewSession,
    handleOpenHistory,
    handleCloseHistory,
    handleRestoreSession,
    handleDeleteSession,
    handleExportPastSessionPdf,
    handleExportPdf,
  };
}
