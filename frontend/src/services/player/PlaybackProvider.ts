import { Track } from '@/types/music';
import {
  StreamingQualityTier,
  StreamingQualityCapability,
  EffectiveQualityResolution,
} from '@/types/quality';
import { PlaybackStatus, BufferHealth } from '@/types/playback';

export interface PlaybackCallbacks {
  onStateChange: (isPlaying: boolean, isBuffering: boolean) => void;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onEnded: () => void;
  onError: (error: string) => void;
  onStatusChange?: (status: PlaybackStatus) => void;
  onBufferHealth?: (health: BufferHealth) => void;
}

export interface AudioCapabilities {
  providerName: string;
  volume: 'supported' | 'unsupported' | 'limited';
  playbackRate: 'supported' | 'unsupported' | 'limited';
  availablePlaybackRates: number[];
  eq: 'supported' | 'unsupported' | 'limited';
  eqReason?: string;
  balance: 'supported' | 'unsupported' | 'limited';
  balanceReason?: string;
  spatialDsp: 'supported' | 'unsupported' | 'limited';
  spatialDspReason?: string;
  spatialVisualization: 'supported' | 'unsupported' | 'limited';
  analyser: 'supported' | 'unsupported' | 'limited';
  analyserReason?: string;
  maxBitrateKbps: number;
  codec: string;
  qualityDescription: string;
}

export interface PlaybackProvider {
  name: string;
  init(callbacks: PlaybackCallbacks): Promise<void>;
  load(track: Track): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seek(timeInSeconds: number): void;
  setVolume(volume: number): void; // 0 - 100
  destroy(): void;
  getCurrentTime(): number;
  getDuration(): number;

  // Audio Lab 2.0 extension
  setPlaybackRate?(rate: number): void;
  getPlaybackRate?(): number;
  getAudioCapabilities?(): AudioCapabilities;

  // Smart Pre-buffering extension
  getBufferHealth?(): BufferHealth;
  getPlaybackStatus?(): PlaybackStatus;

  // Streaming Quality 2.0 extension
  getQualityCapabilities?(): StreamingQualityCapability[];
  getEffectiveQuality?(requested: StreamingQualityTier): EffectiveQualityResolution;
  setPreferredQuality?(tier: StreamingQualityTier): void;
}
