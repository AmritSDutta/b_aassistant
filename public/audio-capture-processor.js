class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(2048);
    this.writeIndex = 0;
  }

  process(inputs) {
    if (!inputs[0] || !inputs[0].length) return true;
    const channel0 = inputs[0][0];

    for (let i = 0; i < channel0.length; i++) {
      const sample = Math.max(-1, Math.min(1, channel0[i]));
      this.buffer[this.writeIndex++] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;

      if (this.writeIndex >= this.buffer.length) {
        const chunk = this.buffer.slice(0, this.writeIndex);
        this.port.postMessage(chunk.buffer, [chunk.buffer]);
        this.buffer = new Int16Array(2048);
        this.writeIndex = 0;
      }
    }
    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
