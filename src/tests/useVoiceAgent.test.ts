import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceAgent } from '../voice/hooks/useVoiceAgent';
import { VoiceBridge } from '../voice/bridge/voiceBridge';
import { GeminiLiveProvider } from '../voice/providers/geminiLiveProvider';
import { AudioWorkletRecorder } from '../voice/audio/recorder';

vi.mock('../voice/providers/geminiLiveProvider');
vi.mock('../voice/audio/recorder');

describe('useVoiceAgent Lifecycle & Safe Teardown', () => {
  let capturedCallbacks: Record<string, Function> = {};
  let mockClose: ReturnType<typeof vi.fn>;
  let mockRecorderStop: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedCallbacks = {};
    mockClose = vi.fn();
    mockRecorderStop = vi.fn();

    (GeminiLiveProvider.prototype.connect as ReturnType<typeof vi.fn>).mockImplementation(
      async (_config, callbacks) => {
        capturedCallbacks = callbacks;
        return {
          sendRealtimeAudio: vi.fn(),
          close: mockClose,
        };
      }
    );

    (AudioWorkletRecorder.prototype.start as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (AudioWorkletRecorder.prototype.stop as ReturnType<typeof vi.fn>).mockImplementation(mockRecorderStop);
  });

  const mockBridge = {
    handleToolCall: vi.fn(),
  } as unknown as VoiceBridge;

  it('starts listening and transitions to listening status', async () => {
    const { result } = renderHook(() =>
      useVoiceAgent({
        apiKey: 'test-key',
        liveModel: 'gemini-3.8-live',
        studioVoice: 'Puck',
        voiceBridge: mockBridge,
        isPreflightApproved: true,
      })
    );

    expect(result.current.status).toBe('standby');

    await act(async () => {
      await result.current.startListening();
    });

    expect(result.current.status).toBe('listening');
    expect(result.current.isListening).toBe(true);
  });

  it('resets cleanly to standby on stopListening and closes session and recorder', async () => {
    const { result } = renderHook(() =>
      useVoiceAgent({
        apiKey: 'test-key',
        liveModel: 'gemini-3.8-live',
        studioVoice: 'Puck',
        voiceBridge: mockBridge,
        isPreflightApproved: true,
      })
    );

    await act(async () => {
      await result.current.startListening();
    });

    expect(result.current.status).toBe('listening');

    act(() => {
      result.current.stopListening();
    });

    expect(result.current.status).toBe('standby');
    expect(result.current.statusText).toBe('Standby');
    expect(result.current.isListening).toBe(false);
    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(mockRecorderStop).toHaveBeenCalledTimes(1);
  });

  it('ignores trailing server callbacks after stopListening so status never reverts to listening', async () => {
    const { result } = renderHook(() =>
      useVoiceAgent({
        apiKey: 'test-key',
        liveModel: 'gemini-3.8-live',
        studioVoice: 'Puck',
        voiceBridge: mockBridge,
        isPreflightApproved: true,
      })
    );

    await act(async () => {
      await result.current.startListening();
    });

    act(() => {
      result.current.stopListening();
    });

    expect(result.current.status).toBe('standby');

    // Simulate trailing server events arriving over the wire after stop
    act(() => {
      capturedCallbacks.onTurnComplete?.();
      capturedCallbacks.onEnd?.();
      capturedCallbacks.onStart?.();
      capturedCallbacks.onOutputTranscription?.('stray text');
    });

    // Must remain strictly in standby!
    expect(result.current.status).toBe('standby');
    expect(result.current.statusText).toBe('Standby');
    expect(result.current.isListening).toBe(false);
  });

  it('aborts cleanly if user calls stopListening during connection startup', async () => {
    let resolveConnect: Function = () => {};
    (GeminiLiveProvider.prototype.connect as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveConnect = () =>
            resolve({
              sendRealtimeAudio: vi.fn(),
              close: mockClose,
            });
        })
    );

    const { result } = renderHook(() =>
      useVoiceAgent({
        apiKey: 'test-key',
        liveModel: 'gemini-3.8-live',
        studioVoice: 'Puck',
        voiceBridge: mockBridge,
        isPreflightApproved: true,
      })
    );

    // Trigger start listening
    let startPromise: Promise<void>;
    act(() => {
      startPromise = result.current.startListening();
    });

    expect(result.current.status).toBe('connecting');

    // User cancels while connection is in-flight
    act(() => {
      result.current.stopListening();
    });

    expect(result.current.status).toBe('standby');

    // Connection finally resolves
    await act(async () => {
      resolveConnect();
      await startPromise!;
    });

    // Session must be closed immediately and status must stay standby
    expect(mockClose).toHaveBeenCalled();
    expect(result.current.status).toBe('standby');
    expect(result.current.isListening).toBe(false);
  });
});
