import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from '../components/ChatArea';
import { DocumentSearchResult } from './useDocumentController';
import {
  useVoiceSettings,
  useVoiceAgent,
  GeminiSubagentProvider,
  VoiceBridge,
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
}

export interface UseVoiceOrchestratorResult {
  voiceAgent: ReturnType<typeof useVoiceAgent>;
  apiKey: string;
  setApiKey: (key: string) => Promise<void>;
  liveModel: string;
  setLiveModel: (model: string) => void;
  subagentModel: string;
  setSubagentModel: (model: string) => void;
  studioVoice: string;
  setStudioVoice: (voice: string) => void;
  showVoiceSettings: boolean;
  setShowVoiceSettings: React.Dispatch<React.SetStateAction<boolean>>;
  showPreflight: boolean;
  setShowPreflight: React.Dispatch<React.SetStateAction<boolean>>;
  isPreflightApproved: boolean;
  setIsPreflightApproved: React.Dispatch<React.SetStateAction<boolean>>;
  handlePreflightSuccess: () => void;
  handleSaveSettings: (settings: {
    apiKey: string;
    liveModel: string;
    subagentModel: string;
    studioVoice: string;
  }) => Promise<void>;
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
}: UseVoiceOrchestratorOptions): UseVoiceOrchestratorResult {
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

  const [showVoiceSettings, setShowVoiceSettings] = useState<boolean>(false);
  const [showPreflight, setShowPreflight] = useState<boolean>(false);
  const [isPreflightApproved, setIsPreflightApproved] = useState<boolean>(false);

  const voiceBridgeRef = useRef<VoiceBridge | null>(null);
  if (!voiceBridgeRef.current) {
    voiceBridgeRef.current = new VoiceBridge({
      subagent: new GeminiSubagentProvider(apiKey, subagentModel),
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
      },
    });
  }

  useEffect(() => {
    if (voiceBridgeRef.current) {
      voiceBridgeRef.current.setSubagent(new GeminiSubagentProvider(apiKey, subagentModel));
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
      });
    }
  }, [
    apiKey,
    subagentModel,
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
    async (settings: {
      apiKey: string;
      liveModel: string;
      subagentModel: string;
      studioVoice: string;
    }): Promise<void> => {
      await setApiKey(settings.apiKey);
      setLiveModel(settings.liveModel);
      setSubagentModel(settings.subagentModel);
      setStudioVoice(settings.studioVoice);
    },
    [setApiKey, setLiveModel, setSubagentModel, setStudioVoice]
  );

  return {
    voiceAgent,
    apiKey,
    setApiKey,
    liveModel,
    setLiveModel,
    subagentModel,
    setSubagentModel,
    studioVoice,
    setStudioVoice,
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
