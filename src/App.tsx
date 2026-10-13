import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Branding } from './components/Branding';
import { FileUpload, ActiveDocumentInfo } from './components/FileUpload';
import { BlankSlot } from './components/BlankSlot';
import { CanvasArea } from './components/CanvasArea';
import { ChatArea, ChatMessage } from './components/ChatArea';
import { NotificationModal } from './components/NotificationModal';
import { WebMCPProvider } from './webmcp/provider';
import { ToolContext } from './webmcp/tools';
import { BM25Index } from './lib/bm25';
import { globalIDBStorage, StoredDocument, StoredChunk } from './lib/idbStorage';
import { globalLiteParseService } from './lib/liteparseService';
import { calculateMath } from './lib/mathEvaluator';
import { searchWeb, searchResearch } from './lib/searchService';

const MAX_FILE_SIZE = 1024 * 1024; // 1MB strictly
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

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

  const bm25Ref = useRef<BM25Index>(new BM25Index());
  const chunksRef = useRef<StoredChunk[]>([]);
  const webmcpRef = useRef<WebMCPProvider | null>(null);

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

    const chunkMap = new Map(chunksRef.current.map((c) => [c.id, c]));
    const ranked = bm25Ref.current.search(query, 5);

    // If BM25 found matches, return them
    if (ranked.length > 0) {
      return ranked.map((r) => {
        const chunk = chunkMap.get(r.chunkId);
        return {
          pageNumber: chunk?.pageNumber || 1,
          text: chunk?.text || '',
          score: Number(r.score.toFixed(4)),
        };
      });
    }

    // Fallback: If query was broad (e.g. "what is in the document") or had no keyword overlap,
    // return the first available document chunks with a baseline preview score so the LLM has context
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
      });
    }
  }, [handlePostAgentMessage, handleSearchDocument, handleCleanDocument]);

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
    };

    const provider = new WebMCPProvider(context);
    provider.register();
    webmcpRef.current = provider;

    return () => {
      provider.unregister();
    };
  }, [handlePostAgentMessage, handleSearchDocument, handleCleanDocument]);

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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Left Sidebar (20% width) */}
      <aside className="w-[20%] min-w-[220px] max-w-[360px] h-full flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
        <Branding theme={theme} onToggleTheme={toggleTheme} />
        <FileUpload
          activeDoc={activeDoc}
          onFileSelect={handleFileSelect}
          onClearDocument={handleCleanDocument}
        />
        <BlankSlot />
      </aside>

      {/* Main Area (80% width) */}
      <main className="flex-1 h-full flex flex-col overflow-hidden">
        <CanvasArea />
        <ChatArea messages={messages} onSendMessage={handleSendMessage} />
      </main>

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
