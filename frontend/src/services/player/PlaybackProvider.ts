import { Track } from '@/types/music';

export interface PlaybackCallbacks {
  onStateChange: (isPlaying: boolean, isBuffering: boolean) => void;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onEnded: () => void;
  onError: (error: string) => void;
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
}
