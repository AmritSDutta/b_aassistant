import { AUDIO_SAMPLE_RATE_OUTPUT } from '../types/audio';

export class StreamingAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private scheduledTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onStateChange?: (isPlaying: boolean) => void;

  constructor(
    private readonly sampleRate: number = AUDIO_SAMPLE_RATE_OUTPUT,
    onStateChange?: (isPlaying: boolean) => void
  ) {
    this.onStateChange = onStateChange;
    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx({ sampleRate: this.sampleRate });
      }
    }
  }

  feed(base64Pcm24: string): void {
    if (!base64Pcm24) return;
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.audioCtx = new AudioCtx({ sampleRate: this.sampleRate });
    }

    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }

    const binary = atob(base64Pcm24);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    const buffer = this.audioCtx.createBuffer(1, float32.length, this.sampleRate);
    buffer.copyToChannel(float32, 0);

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioCtx.destination);

    const now = this.audioCtx.currentTime;
    if (this.scheduledTime < now) {
      this.scheduledTime = now + 0.05;
    }

    source.start(this.scheduledTime);
    this.scheduledTime += buffer.duration;
    this.activeSources.push(source);

    this.onStateChange?.(true);

    source.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== source);
      if (this.activeSources.length === 0) {
        this.onStateChange?.(false);
      }
    };
  }

  interrupt(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Source already terminated
      }
    }
    this.activeSources = [];
    this.scheduledTime = 0;
    this.onStateChange?.(false);
  }

  close(): void {
    this.interrupt();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      void this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
