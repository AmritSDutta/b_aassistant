import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Branding } from './components/Branding';
import { FileUpload, ActiveDocumentInfo } from './components/FileUpload';
import { BlankSlot } from './components/BlankSlot';
import { CanvasArea } from './components/CanvasArea';
import { ChatArea, ChatMessage } from './components/ChatArea';
import { NotificationModal } from './components/NotificationModal';
import { WelcomeModal } from './components/WelcomeModal';
import { WebMCPProvider } from './webmcp/provider';
import { ToolContext } from './webmcp/tools';
import { BM25Index, removeStopWords } from './lib/bm25';
import { globalIDBStorage, StoredDocument, StoredChunk } from './lib/idbStorage';
import { globalLiteParseService } from './lib/liteparseService';
import { calculateMath } from './lib/mathEvaluator';
import { searchWeb, searchResearch } from './lib/searchService';
import { globalCanvasEngine } from './lib/canvasEngine';
import { exportSessionPdf } from './lib/pdfExportService';

const MAX_FILE_SIZE = 1024 * 1024; // 1MB strictly
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const ONBOARD_KEY = 'b_onboarded';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('b_theme') as 'light' | 'dark') || 'dark';
  });

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
  const [sessionMinutes, setSessionMinutes] = useState(0);

  const bm25Ref = useRef<BM25Index>(new BM25Index());
  const chunksRef = useRef<StoredChunk[]>([]);
  const webmcpRef = useRef<WebMCPProvider | null>(null);

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

  // Restore stored document on mount if exists
  useEffect(() => {
    (async () => {
      try {
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
      } catch (err) {
        console.warn('Could not restore stored document:', err);
      }
    })();
  }, []);

  const handlePostAgentMessage = useCallback((text: string) => {
    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      sender: 'agent',
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);
  }, []);

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
    const hasCanvas = globalCanvasEngine.hasContent();
    const hasDialogue = messagesRef.current.some((m) => m.text && m.text.trim().length > 0);

    if (!hasCanvas && !hasDialogue) {
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

    const dataUrl = hasCanvas ? globalCanvasEngine.getSnapshotDataUrl() : null;
    return exportSessionPdf(dataUrl, messagesRef.current, activeDoc?.name, hasCanvas);
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
      });
    }
  }, [handlePostAgentMessage, handleSearchDocument, handleCleanDocument, handleExportPdf]);

  // Initialize WebMCP Provider
  useEffect(() => {
    const context: ToolContext = {
      getMessages: () => messagesRef.current,
      postMessage: (text: string) => handlePostAgentMessage(text),
      searchDocument: handleSearchDocument,
      cleanDocument: handleCleanDocument,
      searchWeb: (query: string) => searchWeb(query),
      searchResearch: (query: string) => searchResearch(query),
      calculate: (expr: string) => calculateMath(expr),
      exportPdf: handleExportPdf,
    };

    const provider = new WebMCPProvider(context);
    provider.register();
    webmcpRef.current = provider;

    return () => {
      provider.unregister();
    };
  }, [handlePostAgentMessage, handleSearchDocument, handleCleanDocument, handleExportPdf]);

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

  const handleSendMessage = (text: string) => {
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

  const handleFileSelect = async (file: File) => {
    // 1. Check size strictly < 1MB
    if (file.size >= MAX_FILE_SIZE) {
      setErrorModal({
        isOpen: true,
        title: 'File Size Exceeded',
        message: `File "${file.name}" is ${(file.size / (1024 * 1024)).toFixed(2)} MB. bAssistant accepts files strictly under 1MB for client-side processing.`,
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
        <Branding theme={theme} onToggleTheme={toggleTheme} />
        <FileUpload
          activeDoc={activeDoc}
          onFileSelect={handleFileSelect}
          onClearDocument={handleCleanDocument}
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
          <button
            type="button"
            onClick={() => setShowWelcome(true)}
            className="uppercase tracking-[0.06em] font-bold hover:underline"
            aria-label="Show tips again"
          >
            tips
          </button>
        </div>
      </aside>

      {/* Main Area (80% width) */}
      <main className="flex-1 h-full flex flex-col overflow-hidden">
        <CanvasArea
          theme={theme}
          onExportPdf={handleExportPdf}
          onClear={handleCleanDocument}
        />
        <ChatArea
          messages={messages}
          onSendMessage={handleSendMessage}
          onToggleHighlight={handleToggleHighlight}
        />
      </main>

      {/* First-load onboarding */}
      <WelcomeModal isOpen={showWelcome} onClose={handleCloseWelcome} />

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
