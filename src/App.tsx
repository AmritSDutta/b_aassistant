import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Branding } from './components/Branding';
import { FileUpload } from './components/FileUpload';
import { ReferenceUrls } from './components/ReferenceUrls';
import { BlankSlot } from './components/BlankSlot';
import { CanvasArea } from './components/CanvasArea';
import { ChatArea } from './components/ChatArea';
import { NotificationModal } from './components/NotificationModal';
import { WelcomeModal } from './components/WelcomeModal';
import { HistoryModal } from './components/HistoryModal';
import { UserPreferencesModal } from './components/UserPreferencesModal';
import {
  loadUserPreferences,
  addUserPreference,
  removeUserPreference,
} from './lib/userPreferences';
import { WebMCPProvider } from './webmcp/provider';
import { ToolContext } from './webmcp/tools';
import { calculateMath } from './lib/mathEvaluator';
import { searchWeb, searchResearch } from './lib/searchService';
import { globalCanvasEngine } from './lib/canvasEngine';
import { initSourceProtection } from './lib/sourceProtection';
import {
  VoiceLiveController,
  VoiceSettingsModal,
  AudioPreflightModal,
} from './voice';
import {
  useSessionController,
  useDocumentController,
  useVoiceOrchestrator,
} from './hooks';

const ONBOARD_KEY = 'b_onboarded';
const URLS_STORAGE_KEY = 'b_reference_urls';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('b_theme') as 'light' | 'dark') || 'dark';
  });

  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const showError = useCallback((title: string, message: string): void => {
    setErrorModal({ isOpen: true, title, message });
  }, []);

  const closeError = useCallback((): void => {
    setErrorModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const [showWelcome, setShowWelcome] = useState<boolean>(() => !localStorage.getItem(ONBOARD_KEY));

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

  const [userPreferences, setUserPreferences] = useState<string[]>(() => loadUserPreferences());
  const userPreferencesRef = useRef<string[]>(userPreferences);
  userPreferencesRef.current = userPreferences;

  const [showPreferencesModal, setShowPreferencesModal] = useState<boolean>(false);

  const webmcpRef = useRef<WebMCPProvider | null>(null);

  // Attach client-side source protection
  useEffect(() => {
    const cleanup = initSourceProtection({
      disableContextMenu: true,
      disableDevToolsShortcuts: true,
    });
    return cleanup;
  }, []);

  const handleCloseWelcome = useCallback((): void => {
    setShowWelcome(false);
    localStorage.setItem(ONBOARD_KEY, '1');
  }, []);

  // Document controller
  const doc = useDocumentController({
    onError: showError,
    onDocumentIndexed: () => updateWebMCPContext(),
  });

  // Session controller
  const session = useSessionController({
    activeDocName: doc.activeDoc?.name,
    onError: showError,
  });

  // Voice orchestrator
  const voice = useVoiceOrchestrator({
    getMessages: () => session.messagesRef.current,
    postMessage: session.handlePostAgentMessage,
    searchDocument: doc.handleSearchDocument,
    cleanDocument: doc.handleCleanDocument,
    searchWeb: (query: string) => searchWeb(query),
    searchResearch: (query: string) => searchResearch(query),
    calculate: (expr: string) => calculateMath(expr),
    exportPdf: session.handleExportPdf,
    getReferenceUrls: () => referenceUrlsRef.current,
    getUserPreferences: () => userPreferencesRef.current,
  });

  // WebMCP context updates
  const updateWebMCPContext = useCallback((): void => {
    if (webmcpRef.current) {
      webmcpRef.current.updateContext({
        getMessages: () => session.messagesRef.current,
        postMessage: session.handlePostAgentMessage,
        searchDocument: doc.handleSearchDocument,
        cleanDocument: doc.handleCleanDocument,
        searchWeb: (query: string) => searchWeb(query),
        searchResearch: (query: string) => searchResearch(query),
        calculate: (expr: string) => calculateMath(expr),
        exportPdf: session.handleExportPdf,
        getReferenceUrls: () => referenceUrlsRef.current,
        getUserPreferences: () => userPreferencesRef.current,
      });
    }
  }, [
    session.handlePostAgentMessage,
    doc.handleSearchDocument,
    doc.handleCleanDocument,
    session.handleExportPdf,
    session.messagesRef,
  ]);

  const webmcpHandlersRef = useRef({
    handlePostAgentMessage: session.handlePostAgentMessage,
    handleSearchDocument: doc.handleSearchDocument,
    handleCleanDocument: doc.handleCleanDocument,
    handleExportPdf: session.handleExportPdf,
  });
  webmcpHandlersRef.current = {
    handlePostAgentMessage: session.handlePostAgentMessage,
    handleSearchDocument: doc.handleSearchDocument,
    handleCleanDocument: doc.handleCleanDocument,
    handleExportPdf: session.handleExportPdf,
  };

  // Initialize WebMCP Provider once on mount with proxied handlers
  useEffect(() => {
    const context: ToolContext = {
      getMessages: () => session.messagesRef.current,
      postMessage: (text: string) => webmcpHandlersRef.current.handlePostAgentMessage(text),
      searchDocument: (query: string) => webmcpHandlersRef.current.handleSearchDocument(query),
      cleanDocument: () => webmcpHandlersRef.current.handleCleanDocument(),
      searchWeb: (query: string) => searchWeb(query),
      searchResearch: (query: string) => searchResearch(query),
      calculate: (expr: string) => calculateMath(expr),
      exportPdf: () => webmcpHandlersRef.current.handleExportPdf(),
      getReferenceUrls: () => referenceUrlsRef.current,
      getUserPreferences: () => userPreferencesRef.current,
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
  }, [session.messages, updateWebMCPContext]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('b_theme', theme);
  }, [theme]);

  const toggleTheme = (): void => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

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
    (url: string): void => {
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

  const handleAddUserPreference = useCallback(
    (preference: string): { success: boolean; error?: string } => {
      const result = addUserPreference(preference, userPreferencesRef.current);
      if (result.success) {
        setUserPreferences(result.preferences);
        userPreferencesRef.current = result.preferences;
        updateWebMCPContext();
      }
      return { success: result.success, error: result.error };
    },
    [updateWebMCPContext]
  );

  const handleRemoveUserPreference = useCallback(
    (index: number): void => {
      const result = removeUserPreference(index, userPreferencesRef.current);
      if (result.success) {
        setUserPreferences(result.preferences);
        userPreferencesRef.current = result.preferences;
        updateWebMCPContext();
      }
    },
    [updateWebMCPContext]
  );

  return (
    <div
      className="flex h-screen w-screen overflow-hidden font-sans"
      style={{ background: 'var(--paper)', color: 'var(--ink)' }}
    >
      {/* Left Sidebar (20% width) */}
      <aside
        className="w-[20%] min-w-[220px] max-w-[360px] h-full flex flex-col border-r"
        style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
      >
        <Branding
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenTips={() => setShowWelcome(true)}
          onOpenVoiceSettings={() => voice.setShowVoiceSettings(true)}
          onOpenPreferences={() => setShowPreferencesModal(true)}
        />
        <FileUpload
          activeDoc={doc.activeDoc}
          onFileSelect={doc.handleFileSelect}
          onClearDocument={doc.handleCleanDocument}
        />
        <ReferenceUrls
          urls={referenceUrls}
          onAddUrl={handleAddReferenceUrl}
          onRemoveUrl={handleRemoveReferenceUrl}
        />
        <BlankSlot highlights={session.highlights} onJumpTo={session.jumpToMessage} />
        {/* Gentle session strip */}
        <div
          className="px-4 py-2 border-t flex items-center justify-between font-mono text-[10px]"
          style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}
        >
          <span>
            {session.messages.length} messages · {session.highlights.length} highlights · {session.sessionMinutes} min
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={session.handleOpenHistory}
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
          onExportPdf={session.handleExportPdf}
          onNewSession={session.handleNewSession}
          onClear={() => globalCanvasEngine.clear()}
        />
        <ChatArea
          messages={session.messages}
          onSendMessage={session.handleSendMessage}
          onToggleHighlight={session.handleToggleHighlight}
          voiceController={
            <VoiceLiveController
              status={voice.voiceAgent.status}
              statusText={voice.voiceAgent.statusText}
              captionPreview={voice.voiceAgent.captionPreview}
              isListening={voice.voiceAgent.isListening}
              onToggleListening={voice.voiceAgent.toggleListening}
              onOpenSettings={() => voice.setShowVoiceSettings(true)}
            />
          }
        />
      </main>

      {/* First-load onboarding */}
      <WelcomeModal isOpen={showWelcome} onClose={handleCloseWelcome} />

      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={voice.showVoiceSettings}
        onClose={() => voice.setShowVoiceSettings(false)}
        apiKey={voice.apiKey}
        liveModel={voice.liveModel}
        studioVoice={voice.studioVoice}
        subagentProvider={voice.subagentProvider}
        subagentModel={voice.subagentModel}
        useTier1GeminiKey={voice.useTier1GeminiKey}
        geminiSubagentKey={voice.geminiSubagentKey}
        mistralKey={voice.mistralKey}
        openaiKey={voice.openaiKey}
        requestyKey={voice.requestyKey}
        ollamaKey={voice.ollamaKey}
        ollamaEndpoint={voice.ollamaEndpoint}
        nebiusKey={voice.nebiusKey}
        onSave={voice.handleSaveSettings}
      />

      {/* User Preferences Modal */}
      <UserPreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
        preferences={userPreferences}
        onAddPreference={handleAddUserPreference}
        onRemovePreference={handleRemoveUserPreference}
      />

      {/* Audio Preflight Modal */}
      <AudioPreflightModal
        isOpen={voice.showPreflight}
        onClose={() => voice.setShowPreflight(false)}
        onSuccess={voice.handlePreflightSuccess}
      />

      {/* Session History Modal */}
      <HistoryModal
        isOpen={session.showHistory}
        onClose={session.handleCloseHistory}
        currentSessionId={session.sessionId}
        sessions={session.savedSessions}
        onRestoreSession={session.handleRestoreSession}
        onExportSessionPdf={session.handleExportPastSessionPdf}
        onDeleteSession={session.handleDeleteSession}
      />

      {/* Modal Popup */}
      <NotificationModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={closeError}
      />
    </div>
  );
};

export default App;
