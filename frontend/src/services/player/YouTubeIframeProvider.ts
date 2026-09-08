import { Track } from '@/types/music';
import {
  StreamingQualityTier,
  StreamingQualityCapability,
  EffectiveQualityResolution,
} from '@/types/quality';
import {
  PlaybackStatus,
  BufferHealth,
  getNetworkTier,
  computeTargetBufferSeconds,
} from '@/types/playback';
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
  private prebufferTimer: any = null;
  private pendingTrack: Track | null = null;
  private targetVolume = 80;
  private currentTrackId: string | null = null;
  private lastKnownTime = 0;
  private lastKnownDuration = 0;
  private lastTimePolledAt = 0;
  private lastSeekTime = 0;
  private playbackStatus: PlaybackStatus = 'idle';
  private bufferHealth: BufferHealth = {
    loadedFraction: null,
    bufferAheadSeconds: null,
    targetBufferSeconds: 10,
    networkTier: 'unknown',
    isPrebuffering: false,
  };
  private intendedPlayState = true;

  async init(callbacks: PlaybackCallbacks): Promise<void> {
    this.callbacks = callbacks;

    if (this.player && this.isReady) {
      if (import.meta.env.DEV) {
        console.debug('[YT REUSE] Reusing existing YouTube player instance');
      }
      return;
    }

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
          if (import.meta.env.DEV) {
            console.debug(`[YT RECREATE] time=${Date.now()} reason=initialization`);
          }
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
                this.setStatus('error');
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
          if (firstScript && firstScript.parentNode) {
            firstScript.parentNode.insertBefore(tag, firstScript);
          } else {
            document.head?.appendChild(tag) || document.body?.appendChild(tag);
          }
        }
      }
    });
  }

  private setStatus(status: PlaybackStatus) {
    this.playbackStatus = status;
    if (this.callbacks?.onStatusChange) {
      this.callbacks.onStatusChange(status);
    }
    this.updateBufferHealth();
  }

  private updateBufferHealth(): BufferHealth {
    let fraction: number | null = null;
    if (this.player && this.isReady && typeof this.player.getVideoLoadedFraction === 'function') {
      try {
        const f = this.player.getVideoLoadedFraction();
        if (typeof f === 'number' && !isNaN(f)) {
          fraction = Math.max(0, Math.min(1, f));
        }
      } catch {}
    }

    const dur = this.getDuration();
    const cur = this.getCurrentTime();
    const bufferAhead =
      fraction !== null && dur > 0 ? Math.max(0, fraction * dur - cur) : null;
    const net = getNetworkTier();
    const target = computeTargetBufferSeconds(net, dur);

    this.bufferHealth = {
      loadedFraction: fraction,
      bufferAheadSeconds: bufferAhead !== null ? Math.round(bufferAhead * 10) / 10 : null,
      targetBufferSeconds: target,
      networkTier: net,
      isPrebuffering: this.playbackStatus === 'prebuffering',
    };

    if (this.callbacks?.onBufferHealth) {
      this.callbacks.onBufferHealth(this.bufferHealth);
    }

    return this.bufferHealth;
  }

  getBufferHealth(): BufferHealth {
    return this.updateBufferHealth();
  }

  getPlaybackStatus(): PlaybackStatus {
    return this.playbackStatus;
  }

  private startTimeTimer() {
    this.stopTimeTimer();
    this.timeUpdateTimer = setInterval(() => {
      if (this.player && this.callbacks && typeof this.player.getCurrentTime === 'function') {
        try {
          const currentTime = this.player.getCurrentTime() || 0;
          const duration = this.player.getDuration() || 0;
          this.lastKnownTime = currentTime;
          this.lastKnownDuration = duration;
          this.lastTimePolledAt = performance.now();
          this.callbacks.onTimeUpdate(currentTime, duration);
          this.updateBufferHealth();
        } catch {}
      }
    }, 250);
  }

  private stopTimeTimer() {
    if (this.timeUpdateTimer) {
      clearInterval(this.timeUpdateTimer);
      this.timeUpdateTimer = null;
    }
  }

  private stopPrebufferTimer() {
    if (this.prebufferTimer) {
      clearInterval(this.prebufferTimer);
      this.prebufferTimer = null;
    }
  }

  private handleStateChange(state: number) {
    if (!this.callbacks) return;

    // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    if (state === 1) {
      // PLAYING
      this.stopPrebufferTimer();
      this.setStatus('playing');
      this.callbacks.onStateChange(true, false);
      this.startTimeTimer();
    } else if (state === 2) {
      // PAUSED
      this.stopPrebufferTimer();
      this.setStatus('ready');
      this.callbacks.onStateChange(false, false);
      this.stopTimeTimer();
    } else if (state === 3) {
      // BUFFERING (mid-playback recovery)
      if (this.playbackStatus !== 'prebuffering') {
        this.setStatus('buffering');
      }
      this.callbacks.onStateChange(true, true);
    } else if (state === 0) {
      // ENDED
      this.stopPrebufferTimer();
      this.setStatus('idle');
      this.callbacks.onStateChange(false, false);
      this.stopTimeTimer();
      this.callbacks.onEnded();
    }
  }

  async load(track: Track): Promise<void> {
    if (!track?.videoId) return;

    // Guard against redundant reloads of the same song
    if (this.currentTrackId === track.videoId && this.isReady) {
      if (import.meta.env.DEV) {
        console.debug(`[YT LOAD] Skip redundant reload: ${track.videoId}`);
      }
      return;
    }

    if (!this.isReady || !this.player) {
      this.pendingTrack = track;
      this.setStatus('loading');
      return;
    }

    this.currentTrackId = track.videoId;
    this.lastKnownTime = 0;
    this.lastKnownDuration = track.duration_seconds || 0;
    this.intendedPlayState = true;
    this.stopPrebufferTimer();
    this.setStatus('prebuffering');

    if (import.meta.env.DEV) {
      console.debug(
        `[YT LOAD] time=${Date.now()} videoId=${track.videoId} reason=track-load`
      );
    }

    try {
      if (typeof this.player.loadVideoById === 'function') {
        this.player.loadVideoById({
          videoId: track.videoId,
          startSeconds: 0,
        });

        // Smart Adaptive Pre-buffering monitor
        const startTime = Date.now();
        const network = getNetworkTier();
        const targetSeconds = computeTargetBufferSeconds(network, track.duration_seconds || 200);
        const maxPrebufferWaitMs = network === 'slow' ? 4500 : 2500;

        this.prebufferTimer = setInterval(() => {
          if (!this.player || !this.isReady) return;

          const health = this.updateBufferHealth();
          const elapsed = Date.now() - startTime;

          // Check if prebuffer conditions are satisfied:
          // 1. Buffer ahead meets target
          // 2. Or fraction loaded >= 10%
          // 3. Or max wait timeout reached (never stall indefinitely)
          const bufferSatisfied =
            health.bufferAheadSeconds !== null && health.bufferAheadSeconds >= targetSeconds;
          const fractionSatisfied =
            health.loadedFraction !== null && health.loadedFraction >= 0.08;
          const timeoutReached = elapsed >= maxPrebufferWaitMs;

          if (bufferSatisfied || fractionSatisfied || timeoutReached) {
            this.stopPrebufferTimer();
            if (this.intendedPlayState && typeof this.player.playVideo === 'function') {
              if (import.meta.env.DEV) {
                console.debug(
                  `[YT PREBUFFER] Ready after ${elapsed}ms (bufferAhead=${health.bufferAheadSeconds}s, fraction=${health.loadedFraction})`
                );
              }
              this.player.playVideo();
            }
          }
        }, 120);
      }
    } catch (e) {
      console.error('[YouTubeIframeProvider] loadVideoById error:', e);
      this.setStatus('error');
    }
  }

  async play(): Promise<void> {
    this.intendedPlayState = true;
    if (!this.player || !this.isReady) return;
    if (import.meta.env.DEV) {
      console.debug(
        `[YT PLAY] time=${Date.now()} videoId=${this.currentTrackId} currentTime=${this.lastKnownTime}`
      );
    }
    try {
      if (typeof this.player.playVideo === 'function') {
        this.player.playVideo();
      }
    } catch (e) {
      console.error('[YouTubeIframeProvider] play error:', e);
    }
  }

  pause(): void {
    this.intendedPlayState = false;
    this.stopPrebufferTimer();
    if (!this.player || !this.isReady) return;
    if (import.meta.env.DEV) {
      console.debug(
        `[YT PAUSE] time=${Date.now()} videoId=${this.currentTrackId} currentTime=${this.lastKnownTime}`
      );
    }
    try {
      if (typeof this.player.pauseVideo === 'function') {
        this.player.pauseVideo();
      }
    } catch (e) {
      console.error('[YouTubeIframeProvider] pause error:', e);
    }
  }

  seek(timeInSeconds: number): void {
    if (!this.player || !this.isReady) return;
    const now = Date.now();
    if (now - this.lastSeekTime < 50) return;
    this.lastSeekTime = now;

    try {
      const dur = this.getDuration();
      const clamped = Math.max(0, Math.min(dur > 0 ? dur : timeInSeconds, timeInSeconds));
      this.lastKnownTime = clamped;

      if (import.meta.env.DEV) {
        console.debug(
          `[YT SEEK] time=${now} videoId=${this.currentTrackId} currentTime=${this.lastKnownTime} requestedTime=${timeInSeconds} reason=user-seek`
        );
      }

      if (typeof this.player.seekTo === 'function') {
        this.player.seekTo(clamped, true);
      }
      this.updateBufferHealth();
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
    if (!this.player || !this.isReady) return this.lastKnownTime;

    const now = performance.now();
    // Cache queries to avoid flooding the YouTube iframe postMessage bridge
    if (now - this.lastTimePolledAt > 150 && typeof this.player.getCurrentTime === 'function') {
      try {
        const t = this.player.getCurrentTime();
        if (typeof t === 'number' && !isNaN(t)) {
          this.lastKnownTime = t;
          this.lastTimePolledAt = now;
        }
      } catch {}
    }
    return this.lastKnownTime;
  }

  getDuration(): number {
    if (this.player && this.isReady && typeof this.player.getDuration === 'function') {
      try {
        const d = this.player.getDuration();
        if (typeof d === 'number' && !isNaN(d) && d > 0) {
          this.lastKnownDuration = d;
        }
      } catch {}
    }
    return this.lastKnownDuration;
  }

  destroy(): void {
    if (import.meta.env.DEV) {
      console.debug(`[YT STOP] time=${Date.now()} videoId=${this.currentTrackId} reason=destroy`);
    }
    this.stopTimeTimer();
    this.stopPrebufferTimer();
    if (this.player && typeof this.player.destroy === 'function') {
      this.player.destroy();
      this.player = null;
    }
    this.isReady = false;
    this.currentTrackId = null;
    this.setStatus('idle');
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
