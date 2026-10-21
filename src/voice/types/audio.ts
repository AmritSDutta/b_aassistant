export type VoiceStatus =
  | 'standby'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'executing'
  | 'interrupted'
  | 'error';

export const AUDIO_SAMPLE_RATE_INPUT = 16000;
export const AUDIO_SAMPLE_RATE_OUTPUT = 24000;
export const WORKLET_BUFFER_SIZE = 2048;
