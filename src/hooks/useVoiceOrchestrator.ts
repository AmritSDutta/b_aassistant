import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from '../components/ChatArea';
import { DocumentSearchResult } from './useDocumentController';
import {
  useVoiceSettings,
  useVoiceAgent,
  createSubagentProvider,
  VoiceBridge,
  SubagentProviderType,
} from '../voice';

export interface UseVoiceOrchestratorOptions {
  getMessages: () => ChatMessage[];
  postMessage: (text: string) => void;
  searchDocument: (query: string) => Promise<DocumentSearchResult[]>;
  cleanDocument: () => Promise<void>;
  searchWeb: (query: string) => Promise<any>;
  searchResearch: (query: string) => Promise<any>;
  calculate: (expr: string) => any;
  exportPdf: () => any;
  getReferenceUrls: () => string[];
  getUserPreferences?: () => string[];
}

export interface VoiceSettingsSavePayload {
  apiKey: string;
  liveModel: string;
  studioVoice: string;
  subagentProvider: SubagentProviderType;
  subagentModel: string;
  useTier1GeminiKey: boolean;
  geminiSubagentKey: string;
  openaiKey: string;
  mistralKey: string;
  requestyKey: string;
  ollamaKey: string;
  ollamaEndpoint: string;
  nebiusKey: string;
}

export interface UseVoiceOrchestratorResult {
  voiceAgent: ReturnType<typeof useVoiceAgent>;
  apiKey: string;
  setApiKey: (key: string) => Promise<void>;
  liveModel: string;
  setLiveModel: (model: string) => void;
  studioVoice: string;
  setStudioVoice: (voice: string) => void;

  subagentProvider: SubagentProviderType;
  setSubagentProvider: (provider: SubagentProviderType) => void;
  subagentModel: string;
  setSubagentModel: (model: string) => void;
  useTier1GeminiKey: boolean;
  setUseTier1GeminiKey: (useTier1: boolean) => void;
  geminiSubagentKey: string;
  setGeminiSubagentKey: (key: string) => Promise<void>;
  openaiKey: string;
  setOpenAIKey: (key: string) => Promise<void>;
  mistralKey: string;
  setMistralKey: (key: string) => Promise<void>;
  requestyKey: string;
  setRequestyKey: (key: string) => Promise<void>;
  ollamaKey: string;
  setOllamaKey: (key: string) => Promise<void>;
  ollamaEndpoint: string;
  setOllamaEndpoint: (endpoint: string) => void;
  nebiusKey: string;
  setNebiusKey: (key: string) => Promise<void>;

  showVoiceSettings: boolean;
  setShowVoiceSettings: React.Dispatch<React.SetStateAction<boolean>>;
  showPreflight: boolean;
  setShowPreflight: React.Dispatch<React.SetStateAction<boolean>>;
  isPreflightApproved: boolean;
  setIsPreflightApproved: React.Dispatch<React.SetStateAction<boolean>>;
  handlePreflightSuccess: () => void;
  handleSaveSettings: (settings: VoiceSettingsSavePayload) => Promise<void>;
}

/**
 * Coordinates bidirectional Gemini Live voice mode, subagent diagram generation, and settings.
 */
export function useVoiceOrchestrator({
  getMessages,
  postMessage,
  searchDocument,
  cleanDocument,
  searchWeb,
  searchResearch,
  calculate,
  exportPdf,
  getReferenceUrls,
  getUserPreferences,
}: UseVoiceOrchestratorOptions): UseVoiceOrchestratorResult {
  const {
    apiKey,
    setApiKey,
    liveModel,
    setLiveModel,
    studioVoice,
    setStudioVoice,

    subagentProvider,
    setSubagentProvider,
    subagentModel,
    setSubagentModel,
    useTier1GeminiKey,
    setUseTier1GeminiKey,
    geminiSubagentKey,
    setGeminiSubagentKey,
    openaiKey,
    setOpenAIKey,
    mistralKey,
    setMistralKey,
    requestyKey,
    setRequestyKey,
    ollamaKey,
    setOllamaKey,
    ollamaEndpoint,
    setOllamaEndpoint,
    nebiusKey,
    setNebiusKey,
    getActiveSubagentApiKey,
  } = useVoiceSettings();

  const [showVoiceSettings, setShowVoiceSettings] = useState<boolean>(false);
  const [showPreflight, setShowPreflight] = useState<boolean>(false);
  const [isPreflightApproved, setIsPreflightApproved] = useState<boolean>(false);

  const activeSubagentKey = getActiveSubagentApiKey();
  const activeEndpoint = subagentProvider === 'ollama' ? ollamaEndpoint : undefined;

  const voiceBridgeRef = useRef<VoiceBridge | null>(null);
  if (!voiceBridgeRef.current) {
    voiceBridgeRef.current = new VoiceBridge({
      subagent: createSubagentProvider({
        provider: subagentProvider,
        apiKey: activeSubagentKey,
        model: subagentModel,
        endpoint: activeEndpoint,
      }),
      postChatMessage: postMessage,
      toolContext: {
        getMessages,
        postMessage,
        searchDocument,
        cleanDocument,
        searchWeb,
        searchResearch,
        calculate,
        exportPdf,
        getReferenceUrls,
        getUserPreferences,
      },
    });
  }

  useEffect(() => {
    if (voiceBridgeRef.current) {
      voiceBridgeRef.current.setSubagent(
        createSubagentProvider({
          provider: subagentProvider,
          apiKey: activeSubagentKey,
          model: subagentModel,
          endpoint: activeEndpoint,
        })
      );
      voiceBridgeRef.current.setPostChatMessage(postMessage);
      voiceBridgeRef.current.setToolContext({
        getMessages,
        postMessage,
        searchDocument,
        cleanDocument,
        searchWeb,
        searchResearch,
        calculate,
        exportPdf,
        getReferenceUrls,
        getUserPreferences,
      });
    }
  }, [
    subagentProvider,
    activeSubagentKey,
    subagentModel,
    activeEndpoint,
    postMessage,
    searchDocument,
    cleanDocument,
    exportPdf,
    getMessages,
    searchWeb,
    searchResearch,
    calculate,
    getReferenceUrls,
  ]);

  const voiceAgent = useVoiceAgent({
    apiKey,
    liveModel,
    studioVoice,
    voiceBridge: voiceBridgeRef.current,
    onRequireSettings: () => setShowVoiceSettings(true),
    onRequirePreflight: () => setShowPreflight(true),
    isPreflightApproved,
  });

  const handlePreflightSuccess = useCallback((): void => {
    setIsPreflightApproved(true);
    setShowPreflight(false);
    void voiceAgent.startListening();
  }, [voiceAgent]);

  const handleSaveSettings = useCallback(
    async (settings: VoiceSettingsSavePayload): Promise<void> => {
      await setApiKey(settings.apiKey);
      setLiveModel(settings.liveModel);
      setStudioVoice(settings.studioVoice);
      setSubagentProvider(settings.subagentProvider);
      setSubagentModel(settings.subagentModel);
      setUseTier1GeminiKey(settings.useTier1GeminiKey);
      await setGeminiSubagentKey(settings.geminiSubagentKey);
      await setOpenAIKey(settings.openaiKey);
      await setMistralKey(settings.mistralKey);
      await setRequestyKey(settings.requestyKey);
      await setOllamaKey(settings.ollamaKey);
      setOllamaEndpoint(settings.ollamaEndpoint);
      await setNebiusKey(settings.nebiusKey);
    },
    [
      setApiKey,
      setLiveModel,
      setStudioVoice,
      setSubagentProvider,
      setSubagentModel,
      setUseTier1GeminiKey,
      setGeminiSubagentKey,
      setOpenAIKey,
      setMistralKey,
      setRequestyKey,
      setOllamaKey,
      setOllamaEndpoint,
      setNebiusKey,
    ]
  );

  return {
    voiceAgent,
    apiKey,
    setApiKey,
    liveModel,
    setLiveModel,
    studioVoice,
    setStudioVoice,

    subagentProvider,
    setSubagentProvider,
    subagentModel,
    setSubagentModel,
    useTier1GeminiKey,
    setUseTier1GeminiKey,
    geminiSubagentKey,
    setGeminiSubagentKey,
    openaiKey,
    setOpenAIKey,
    mistralKey,
    setMistralKey,
    requestyKey,
    setRequestyKey,
    ollamaKey,
    setOllamaKey,
    ollamaEndpoint,
    setOllamaEndpoint,
    nebiusKey,
    setNebiusKey,

    showVoiceSettings,
    setShowVoiceSettings,
    showPreflight,
    setShowPreflight,
    isPreflightApproved,
    setIsPreflightApproved,
    handlePreflightSuccess,
    handleSaveSettings,
  };
}
