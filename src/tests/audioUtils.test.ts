import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreamingAudioPlayer } from '../voice/audio/player';

describe('StreamingAudioPlayer', () => {
  let mockAudioContext: any;
  let mockSource: any;

  beforeEach(() => {
    mockSource = {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      onended: null,
    };

    mockAudioContext = {
      state: 'running',
      currentTime: 10,
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      destination: {},
      createBuffer: vi.fn().mockReturnValue({
        duration: 0.5,
        copyToChannel: vi.fn(),
      }),
      createBufferSource: vi.fn().mockReturnValue(mockSource),
    };

    (window as any).AudioContext = vi.fn().mockImplementation(() => mockAudioContext);
  });

  it('initializes and feeds audio chunks', () => {
    const onStateChange = vi.fn();
    const player = new StreamingAudioPlayer(24000, onStateChange);

    // Create a 100-byte dummy PCM buffer encoded as base64
    const dummyBytes = new Uint8Array(100);
    const b64 = btoa(String.fromCharCode(...dummyBytes));

    player.feed(b64);

    expect(mockAudioContext.createBuffer).toHaveBeenCalled();
    expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    expect(mockSource.start).toHaveBeenCalled();
    expect(onStateChange).toHaveBeenCalledWith(true);

    player.close();
  });

  it('interrupts active playback and resets scheduling clock on barge-in', () => {
    const onStateChange = vi.fn();
    const player = new StreamingAudioPlayer(24000, onStateChange);

    const dummyBytes = new Uint8Array(100);
    const b64 = btoa(String.fromCharCode(...dummyBytes));
    player.feed(b64);

    player.interrupt();

    expect(mockSource.stop).toHaveBeenCalled();
    expect(mockSource.disconnect).toHaveBeenCalled();
    expect(onStateChange).toHaveBeenCalledWith(false);

    player.close();
  });
});
