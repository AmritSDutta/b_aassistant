import { AUDIO_SAMPLE_RATE_INPUT } from '../types/audio';

export class AudioWorkletRecorder {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;

  async start(onAudioChunk: (base64Pcm: string) => void): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone audio capture is not supported in this browser');
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: AUDIO_SAMPLE_RATE_INPUT,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioCtx({ sampleRate: AUDIO_SAMPLE_RATE_INPUT });

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    await this.audioCtx.audioWorklet.addModule('/audio-capture-processor.js');

    const source = this.audioCtx.createMediaStreamSource(this.mediaStream);
    this.workletNode = new AudioWorkletNode(this.audioCtx, 'audio-capture-processor');

    this.workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      const pcmBytes = new Uint8Array(event.data);
      let binary = '';
      for (let i = 0; i < pcmBytes.length; i++) {
        binary += String.fromCharCode(pcmBytes[i]);
      }
      onAudioChunk(btoa(binary));
    };

    source.connect(this.workletNode);
    this.workletNode.connect(this.audioCtx.destination);
  }

  stop(): void {
    if (this.workletNode) {
      try {
        this.workletNode.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      this.workletNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      void this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
