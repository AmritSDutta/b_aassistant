import { GoogleGenAI, Modality } from '@google/genai';
import {
  ILiveVoiceConfig,
  ILiveVoiceProvider,
  ILiveVoiceSession,
  LiveSessionCallbacks,
} from '../types/provider';
import { StreamingAudioPlayer } from '../audio/player';
import { getVoiceLiveSystemPrompt } from '../prompts';

export class GeminiLiveProvider implements ILiveVoiceProvider {
  readonly id = 'gemini-live';
  readonly name = 'Google Gemini Live';

  async connect(config: ILiveVoiceConfig, callbacks: LiveSessionCallbacks): Promise<ILiveVoiceSession> {
    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    const player = new StreamingAudioPlayer(24000, (playing: boolean) => {
      if (playing) {
        callbacks.onStart?.();
      } else {
        callbacks.onEnd?.();
      }
    });

    const functionDeclarations = (config.tools || []).map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    const session = await ai.live.connect({
      model: config.model,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: config.voiceName || 'Puck' },
          },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        contextWindowCompression: {
          triggerTokens: '25600',
          slidingWindow: { targetTokens: '12800' },
        },
        systemInstruction: {
          parts: [
            {
              text: config.systemInstruction || getVoiceLiveSystemPrompt(),
            },
          ],
        },
        tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined,
      },
      callbacks: {
        onmessage: async (msg: any) => {
          const sc = msg.serverContent;
          if (sc?.interrupted) {
            player.interrupt();
            callbacks.onInterrupted?.();
          }

          if (sc?.inputTranscription?.text) {
            callbacks.onInputTranscription?.(sc.inputTranscription.text, true);
          } else if (sc?.interimInputTranscription?.text) {
            callbacks.onInputTranscription?.(sc.interimInputTranscription.text, false);
          }

          if (sc?.outputTranscription?.text) {
            callbacks.onOutputTranscription?.(sc.outputTranscription.text);
          }

          if (msg.toolCall?.functionCalls && msg.toolCall.functionCalls.length > 0) {
            const functionResponses = [];
            for (const call of msg.toolCall.functionCalls) {
              let result: unknown = { error: `Tool ${call.name} not handled` };
              if (callbacks.onToolCall) {
                try {
                  result = await callbacks.onToolCall(call.name, call.args || {});
                } catch (err) {
                  result = { error: err instanceof Error ? err.message : String(err) };
                }
              }
              const responseObj: Record<string, unknown> =
                typeof result === 'object' && result !== null
                  ? (result as Record<string, unknown>)
                  : { result: String(result) };

              functionResponses.push({
                id: call.id || call.name,
                name: call.name,
                response: responseObj,
              });
            }
            session.sendToolResponse({ functionResponses });
          }

          for (const part of sc?.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) {
              player.feed(part.inlineData.data);
            }
          }

          if (sc?.turnComplete) {
            callbacks.onTurnComplete?.();
          }
        },
        onerror: (err: unknown) => {
          callbacks.onError?.(err);
          player.close();
        },
        onclose: () => {
          player.close();
          callbacks.onClose?.();
        },
      },
    });

    // Prompt the live model to speak its initial welcome greeting once connected
    try {
      session.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [
              {
                text: 'Hello! The voice session has started. Please give your brief welcome greeting to the user now.',
              },
            ],
          },
        ],
        turnComplete: true,
      });
    } catch (err) {
      console.warn('Initial live voice greeting kickoff skipped:', err);
    }

    return {
      sendRealtimeAudio: (base64Pcm16: string) => {
        session.sendRealtimeInput({
          audio: {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Pcm16,
          },
        });
      },
      close: () => {
        player.close();
        try {
          const raw = session as unknown as {
            close?: () => void;
            conn?: { close?: (code?: number, reason?: string) => void; readyState?: number };
          };
          if (typeof raw.close === 'function') {
            raw.close();
          } else if (raw.conn && typeof raw.conn.close === 'function') {
            if (raw.conn.readyState === 0 || raw.conn.readyState === 1) {
              raw.conn.close(1000, 'Normal Closure');
            }
          }
        } catch (err) {
          console.warn('Failed to cleanly close Live session websocket:', err);
        }
      },
    };
  }
}
