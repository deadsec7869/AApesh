import { Track } from '@/types/music';
import {
  StreamingQualityTier,
  StreamingQualityCapability,
  EffectiveQualityResolution,
} from '@/types/quality';
import {
  YOUTUBE_QUALITY_CAPABILITIES,
  resolveStreamingQuality,
} from '@/services/audio/qualityResolver';
import { PlaybackProvider, PlaybackCallbacks } from './PlaybackProvider';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export class YouTubeIframeProvider implements PlaybackProvider {
  name = 'YouTubeIframeEngine';
  private player: any = null;
  private isReady = false;
  private callbacks: PlaybackCallbacks | null = null;
  private timeUpdateTimer: any = null;
  private pendingTrack: Track | null = null;
  private targetVolume = 80;

  async init(callbacks: PlaybackCallbacks): Promise<void> {
    this.callbacks = callbacks;

    return new Promise((resolve) => {
      // Ensure target element exists in DOM
      let container = document.getElementById('aurora-youtube-player');
      if (!container) {
        let parent = document.getElementById('aurora-youtube-container');
        if (!parent) {
          parent = document.createElement('div');
          parent.id = 'aurora-youtube-container';
          parent.style.position = 'fixed';
          parent.style.bottom = '0';
          parent.style.right = '0';
          parent.style.width = '1px';
          parent.style.height = '1px';
          parent.style.opacity = '0.001';
          parent.style.zIndex = '-9999';
          parent.style.pointerEvents = 'none';
          parent.style.overflow = 'hidden';
          document.body.appendChild(parent);
        }
        container = document.createElement('div');
        container.id = 'aurora-youtube-player';
        parent.appendChild(container);
      }

      const initPlayer = () => {
        try {
          this.player = new window.YT.Player('aurora-youtube-player', {
            height: '100%',
            width: '100%',
            playerVars: {
              autoplay: 1,
              controls: 1,
              disablekb: 0,
              enablejsapi: 1,
              fs: 1,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
              origin: window.location.origin,
            },
            events: {
              onReady: () => {
                this.isReady = true;
                if (this.player && typeof this.player.setVolume === 'function') {
                  this.player.setVolume(this.targetVolume);
                }
                if (this.pendingTrack) {
                  const trackToLoad = this.pendingTrack;
                  this.pendingTrack = null;
                  this.load(trackToLoad);
                }
                resolve();
              },
              onStateChange: (event: any) => {
                this.handleStateChange(event.data);
              },
              onError: (error: any) => {
                const errorCode = error?.data ?? 'unknown';
                console.warn('[YouTubeIframeProvider] Playback error code:', errorCode);
                // Error codes 101 and 150 mean video cannot be embedded
                if (errorCode === 150 || errorCode === 101) {
                  console.info('[YouTubeIframeProvider] Track embed-restricted, auto-skipping to next track...');
                  if (this.callbacks) {
                    this.callbacks.onError('Track is unavailable in embedded player. Skipping...');
                    setTimeout(() => {
                      if (this.callbacks) this.callbacks.onEnded();
                    }, 1200);
                  }
                  return;
                }
                if (this.callbacks) {
                  this.callbacks.onError(`Playback error (code: ${errorCode})`);
                }
              },
            },
          });
        } catch (e) {
          console.error('[YouTubeIframeProvider] Error initializing YT.Player:', e);
          resolve();
        }
      };

      if (window.YT && window.YT.Player) {
        initPlayer();
      } else {
        const prevCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (prevCallback) prevCallback();
          initPlayer();
        };

        // Load iframe API script if not present
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          const firstScript = document.getElementsByTagName('script')[0];
          firstScript.parentNode?.insertBefore(tag, firstScript);
        }
      }
    });
  }

  private startTimeTimer() {
    this.stopTimeTimer();
    this.timeUpdateTimer = setInterval(() => {
      if (this.player && this.callbacks && typeof this.player.getCurrentTime === 'function') {
        const currentTime = this.player.getCurrentTime() || 0;
        const duration = this.player.getDuration() || 0;
        this.callbacks.onTimeUpdate(currentTime, duration);
      }
    }, 250);
  }

  private stopTimeTimer() {
    if (this.timeUpdateTimer) {
      clearInterval(this.timeUpdateTimer);
      this.timeUpdateTimer = null;
    }
  }

  private handleStateChange(state: number) {
    if (!this.callbacks) return;

    // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    if (state === 1) {
      // PLAYING
      this.callbacks.onStateChange(true, false);
      this.startTimeTimer();
    } else if (state === 2) {
      // PAUSED
      this.callbacks.onStateChange(false, false);
      this.stopTimeTimer();
    } else if (state === 3) {
      // BUFFERING
      this.callbacks.onStateChange(true, true);
    } else if (state === 0) {
      // ENDED
      this.callbacks.onStateChange(false, false);
      this.stopTimeTimer();
      this.callbacks.onEnded();
    }
  }

  async load(track: Track): Promise<void> {
    if (!this.isReady || !this.player) {
      this.pendingTrack = track;
      return;
    }

    try {
      if (typeof this.player.loadVideoById === 'function') {
        this.player.loadVideoById({
          videoId: track.videoId,
          startSeconds: 0,
          suggestedQuality: 'small',
        });
      }
    } catch (e) {
      console.error('[YouTubeIframeProvider] loadVideoById error:', e);
    }
  }

  async play(): Promise<void> {
    if (!this.player || !this.isReady) return;
    try {
      if (typeof this.player.playVideo === 'function') {
        this.player.playVideo();
      }
    } catch (e) {
      console.error('[YouTubeIframeProvider] play error:', e);
    }
  }

  pause(): void {
    if (!this.player || !this.isReady) return;
    try {
      if (typeof this.player.pauseVideo === 'function') {
        this.player.pauseVideo();
      }
    } catch (e) {
      console.error('[YouTubeIframeProvider] pause error:', e);
    }
  }

  private lastSeekTime = 0;
  seek(timeInSeconds: number): void {
    if (!this.player || !this.isReady) return;
    const now = Date.now();
    if (now - this.lastSeekTime < 50) return;
    this.lastSeekTime = now;
    try {
      const dur = this.getDuration();
      const clamped = Math.max(0, Math.min(dur > 0 ? dur : timeInSeconds, timeInSeconds));
      if (typeof this.player.seekTo === 'function') {
        this.player.seekTo(clamped, true);
      }
    } catch (e) {
      console.error('[YouTubeIframeProvider] seek error:', e);
    }
  }

  setVolume(volume: number): void {
    this.targetVolume = volume;
    if (!this.player || !this.isReady) return;
    try {
      if (typeof this.player.setVolume === 'function') {
        this.player.setVolume(volume);
      }
    } catch (e) {
      console.error('[YouTubeIframeProvider] setVolume error:', e);
    }
  }

  getCurrentTime(): number {
    if (this.player && this.isReady && typeof this.player.getCurrentTime === 'function') {
      return this.player.getCurrentTime() || 0;
    }
    return 0;
  }

  getDuration(): number {
    if (this.player && this.isReady && typeof this.player.getDuration === 'function') {
      return this.player.getDuration() || 0;
    }
    return 0;
  }

  destroy(): void {
    this.stopTimeTimer();
    if (this.player && typeof this.player.destroy === 'function') {
      this.player.destroy();
      this.player = null;
    }
    this.isReady = false;
  }

  // Streaming Quality 2.0 extension
  getQualityCapabilities(): StreamingQualityCapability[] {
    return YOUTUBE_QUALITY_CAPABILITIES;
  }

  getEffectiveQuality(requested: StreamingQualityTier): EffectiveQualityResolution {
    return resolveStreamingQuality(requested);
  }

  setPreferredQuality(_tier: StreamingQualityTier): void {
    // YouTube Iframe API does not support programmatic bitrate selection.
    // Quality preference is tracked at application level without restarting playback.
  }
}

export const defaultPlaybackEngine = new YouTubeIframeProvider();
