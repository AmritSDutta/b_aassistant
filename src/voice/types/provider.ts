export interface LiveSessionCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onInterrupted?: () => void;
  onInputTranscription?: (text: string, isFinal: boolean) => void;
  onOutputTranscription?: (text: string) => void;
  onTurnComplete?: () => void;
  onError?: (err: unknown) => void;
  onClose?: () => void;
  onToolCall?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ILiveVoiceConfig {
  apiKey: string;
  model: string;
  voiceName: string;
  systemInstruction?: string;
  tools?: ToolDeclaration[];
}

export interface ILiveVoiceSession {
  sendRealtimeAudio: (base64Pcm16: string) => void;
  close: () => void;
}

export interface ILiveVoiceProvider {
  readonly id: string;
  readonly name: string;
  connect: (config: ILiveVoiceConfig, callbacks: LiveSessionCallbacks) => Promise<ILiveVoiceSession>;
}

export interface ISubagentProvider {
  readonly id: string;
  readonly name: string;
  generateText: (prompt: string, systemInstruction?: string) => Promise<string>;
}
