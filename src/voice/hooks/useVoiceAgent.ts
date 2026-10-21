import { useState, useRef, useEffect, useCallback } from 'react';
import { VoiceStatus } from '../types/audio';
import { ILiveVoiceSession } from '../types/provider';
import { GeminiLiveProvider } from '../providers/geminiLiveProvider';
import { AudioWorkletRecorder } from '../audio/recorder';
import { getVoiceToolDeclarations } from '../bridge/toolAdapter';
import { VoiceBridge } from '../bridge/voiceBridge';
import { getVoiceLiveSystemPrompt } from '../prompts';

export interface UseVoiceAgentOptions {
  apiKey: string;
  liveModel: string;
  studioVoice: string;
  voiceBridge: VoiceBridge;
  onRequireSettings?: () => void;
  onRequirePreflight?: () => void;
  isPreflightApproved?: boolean;
}

export function useVoiceAgent(options: UseVoiceAgentOptions) {
  const {
    apiKey,
    liveModel,
    studioVoice,
    voiceBridge,
    onRequireSettings,
    onRequirePreflight,
    isPreflightApproved = false,
  } = options;

  const [status, setStatus] = useState<VoiceStatus>('standby');
  const [statusText, setStatusText] = useState<string>('Standby');
  const [captionPreview, setCaptionPreview] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sessionRef = useRef<ILiveVoiceSession | null>(null);
  const recorderRef = useRef<AudioWorkletRecorder | null>(null);
  const isSessionActiveRef = useRef<boolean>(false);

  const stopListening = useCallback(() => {
    isSessionActiveRef.current = false;

    if (recorderRef.current) {
      try {
        recorderRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      recorderRef.current = null;
    }

    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch {
        // Ignore close errors
      }
      sessionRef.current = null;
    }

    setIsListening(false);
    setIsSpeaking(false);
    setStatus('standby');
    setStatusText('Standby');
  }, []);

  const startListening = useCallback(async () => {
    if (!apiKey) {
      if (onRequireSettings) {
        onRequireSettings();
      } else {
        alert('Please configure your Gemini API Key in Voice Settings.');
      }
      return;
    }

    if (!isPreflightApproved && onRequirePreflight) {
      onRequirePreflight();
      return;
    }

    isSessionActiveRef.current = true;
    setErrorMessage(null);
    setStatus('connecting');
    setStatusText('Connecting to Gemini Live...');

    try {
      const provider = new GeminiLiveProvider();
      const tools = getVoiceToolDeclarations();

      const session = await provider.connect(
        {
          apiKey,
          model: liveModel,
          voiceName: studioVoice,
          systemInstruction: getVoiceLiveSystemPrompt(),
          tools,
        },
        {
          onStart: () => {
            if (!isSessionActiveRef.current) return;
            setIsSpeaking(true);
            setStatus('speaking');
            setStatusText('Speaking');
          },
          onEnd: () => {
            if (!isSessionActiveRef.current) return;
            setIsSpeaking(false);
            setStatus('listening');
            setStatusText('Listening');
          },
          onInterrupted: () => {
            if (!isSessionActiveRef.current) return;
            setIsSpeaking(false);
            setStatus('interrupted');
            setStatusText('Interrupted');
            setCaptionPreview('Assistant interrupted');
          },
          onInputTranscription: (text: string, isFinal: boolean) => {
            if (!isSessionActiveRef.current) return;
            setCaptionPreview(`You: ${text}${isFinal ? '' : '...'}`);
          },
          onOutputTranscription: (text: string) => {
            if (!isSessionActiveRef.current) return;
            setCaptionPreview(`AI: ${text}`);
          },
          onTurnComplete: () => {
            if (!isSessionActiveRef.current) return;
            setStatus('listening');
            setStatusText('Listening');
          },
          onToolCall: async (name: string, args: Record<string, unknown>) => {
            if (!isSessionActiveRef.current) return { error: 'Session stopped' };
            setStatus('executing');
            setStatusText(`Executing ${name}...`);
            setCaptionPreview(`Tool: ${name}`);
            try {
              const res = await voiceBridge.handleToolCall(name, args);
              return res;
            } finally {
              if (isSessionActiveRef.current) {
                setStatus('speaking');
                setStatusText('Speaking');
              }
            }
          },
          onClose: () => {
            if (isSessionActiveRef.current) {
              stopListening();
            }
          },
          onError: (err: unknown) => {
            if (!isSessionActiveRef.current) return;
            const errStr = err instanceof Error ? err.message : String(err);
            setStatus('error');
            setStatusText(`Error: ${errStr}`);
            setErrorMessage(errStr);
            stopListening();
          },
        }
      );

      if (!isSessionActiveRef.current) {
        session.close();
        return;
      }

      sessionRef.current = session;

      const recorder = new AudioWorkletRecorder();
      await recorder.start((chunk: string) => {
        if (isSessionActiveRef.current && sessionRef.current) {
          sessionRef.current.sendRealtimeAudio(chunk);
        }
      });

      if (!isSessionActiveRef.current) {
        recorder.stop();
        session.close();
        sessionRef.current = null;
        return;
      }

      recorderRef.current = recorder;
      setIsListening(true);
      setStatus('listening');
      setStatusText('Listening live...');
    } catch (err) {
      if (!isSessionActiveRef.current) return;
      const errStr = err instanceof Error ? err.message : String(err);
      setStatus('error');
      setStatusText('Connection failed');
      setErrorMessage(errStr);
      stopListening();
    }
  }, [
    apiKey,
    liveModel,
    studioVoice,
    voiceBridge,
    onRequireSettings,
    onRequirePreflight,
    isPreflightApproved,
    stopListening,
  ]);

  const toggleListening = useCallback(() => {
    if (isListening || isSessionActiveRef.current || status === 'connecting') {
      stopListening();
    } else {
      void startListening();
    }
  }, [isListening, startListening, status, stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    status,
    statusText,
    captionPreview,
    isListening,
    isSpeaking,
    errorMessage,
    startListening,
    stopListening,
    toggleListening,
  };
}
