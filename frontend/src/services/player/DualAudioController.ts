import type { Track } from '@/types/music';
import type { PlaybackStatus } from '@/types/playback';
import type { PlaybackProvider, PlaybackCallbacks } from './PlaybackProvider';
import { initialPlaybackState, transitionPlayback, type PlaybackEvent, type PlaybackSnapshot } from './PlaybackStateMachine';

const abortError = () => new DOMException('Playback request superseded', 'AbortError');

/** Cancels the caller's wait; providers must also honor signal before deferred side effects. */
function cancellable<T>(work: Promise<T>, signal: AbortSignal, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => finish(abortError());
    const timer = setTimeout(() => finish(new Error('Playback operation timed out. Try again.')), timeoutMs);
    const finish = (error?: unknown, value?: T) => {
      clearTimeout(timer); signal.removeEventListener('abort', abort);
      if (error) reject(error); else resolve(value as T);
    };
    signal.addEventListener('abort', abort, { once: true });
    work.then(value => finish(undefined, value), error => finish(error));
    if (signal.aborted) abort();
  });
}

export class DualAudioController implements PlaybackProvider {
  name = 'AAPESH Dual Audio Controller';
  private snapshot: PlaybackSnapshot = { ...initialPlaybackState };
  private listeners = new Set<(state: PlaybackSnapshot) => void>();
  private callbacks: PlaybackCallbacks | null = null;
  private active: PlaybackProvider | null = null;
  private request: AbortController | null = null;
  private initialization = new Map<PlaybackProvider, Promise<void>>();
  private track: Track | null = null;
  private loaded = false;
  private pendingSeek: number | null = null;
  private endedRequest = -1;
  private volume = 80;
  private rate = 1;
  private stallTimer: ReturnType<typeof setTimeout> | undefined;
  constructor(private youtube: PlaybackProvider, private local: PlaybackProvider, private timeoutMs = 15000) {}

  getSnapshot = (): PlaybackSnapshot => this.snapshot;
  subscribe = (listener: (state: PlaybackSnapshot) => void): (() => void) => {
    this.listeners.add(listener); return () => { this.listeners.delete(listener); };
  };
  private safely(run: () => void): void { try { run(); } catch (error) { console.error('Playback subscriber failed', error); } }
  private dispatch(event: PlaybackEvent): void {
    const next = transitionPlayback(this.snapshot, event);
    if (next === this.snapshot) return;
    this.snapshot = next;
    clearTimeout(this.stallTimer);
    if (next.wantsPlay && ['LOADING', 'BUFFERING', 'RECOVERING'].includes(next.phase)) {
      this.stallTimer = setTimeout(() => {
        if (this.snapshot.playbackRequestId === next.playbackRequestId) this.fail(new Error('Playback stalled. Press Play to retry.'), next.playbackRequestId);
      }, 30000);
    }
    this.listeners.forEach(listener => this.safely(() => listener(next)));
  }
  async init(callbacks: PlaybackCallbacks): Promise<void> { this.callbacks = callbacks; }
  private fail(error: unknown, id = this.snapshot.playbackRequestId): void {
    if (id !== this.snapshot.playbackRequestId) return;
    const message = error instanceof Error ? error.message : String(error);
    this.dispatch({ type: 'FAIL', requestId: id, error: message });
    this.safely(() => this.active?.pause());
    this.safely(() => this.callbacks?.onError(message));
  }
  private providerCallbacks(provider: PlaybackProvider): PlaybackCallbacks {
    const valid = () => this.active === provider && this.track?.videoId === provider.getCurrentTrackId?.();
    return {
      onStateChange: (playing, buffering) => {
        if (!valid()) return;
        if (playing && !this.snapshot.wantsPlay) { this.safely(() => provider.pause()); return; }
        if (playing || buffering) this.dispatch({ type: buffering ? 'BUFFERING' : 'PLAYING', requestId: this.snapshot.playbackRequestId });
        this.safely(() => this.callbacks?.onStateChange(playing, buffering));
      },
      onStatusChange: status => {
        if (!valid()) return;
        if (status === 'playing' && !this.snapshot.wantsPlay) return;
        if (status === 'paused' && this.loaded && this.snapshot.phase === 'PLAYING') {
          this.dispatch({ type: 'PAUSE', requestId: this.snapshot.playbackRequestId });
        }
        this.safely(() => this.callbacks?.onStatusChange?.(status));
      },
      onTimeUpdate: (time, duration) => {
        if (!valid() || !Number.isFinite(time) || !Number.isFinite(duration)) return;
        this.safely(() => this.callbacks?.onTimeUpdate(Math.max(0, time), Math.max(0, duration)));
      },
      onBufferHealth: health => { if (valid()) this.safely(() => this.callbacks?.onBufferHealth?.(health)); },
      onError: error => { if (this.active === provider) this.fail(new Error(error)); },
      onEnded: () => {
        const id = this.snapshot.playbackRequestId;
        if (!valid() || !this.snapshot.wantsPlay || this.endedRequest === id) return;
        this.endedRequest = id;
        this.dispatch({ type: 'ENDED', requestId: id });
        this.safely(() => this.callbacks?.onEnded());
      },
    };
  }
  private initialize(provider: PlaybackProvider): Promise<void> {
    let work = this.initialization.get(provider);
    if (!work) {
      work = provider.init(this.providerCallbacks(provider));
      this.initialization.set(provider, work);
      void work.catch(() => { this.initialization.delete(provider); });
    }
    return work;
  }

  /** Atomic selection + play; consumers must not compose load().then(play()) for track changes. */
  async select(track: Track): Promise<void> { await this.load(track); }
  async load(track: Track): Promise<void> {
    const id = this.snapshot.playbackRequestId + 1;
    this.request?.abort();
    this.safely(() => this.active?.pause());
    const request = new AbortController(); this.request = request;
    this.track = track; this.loaded = false; this.pendingSeek = null;
    const provider = track.source === 'local' || track.videoId.startsWith('local:') ? this.local : this.youtube;
    if (this.active && this.active !== provider) {
      const previous = this.active;
      this.active = null;
      this.safely(() => previous.destroy());
      this.initialization.delete(previous);
    }
    this.active = provider;
    this.dispatch({ type: 'SELECT', requestId: id, trackId: track.videoId });
    try {
      await cancellable(this.initialize(provider), request.signal, this.timeoutMs);
      if (request.signal.aborted) return;
      provider.setVolume(this.volume); provider.setPlaybackRate?.(this.rate);
      await cancellable(provider.load(track, request.signal), request.signal, this.timeoutMs);
      if (request.signal.aborted) return;
      this.loaded = true;
      if (this.pendingSeek !== null) { provider.seek(this.pendingSeek); this.pendingSeek = null; }
      if (this.snapshot.wantsPlay) await cancellable(provider.play(), request.signal, this.timeoutMs);
      else provider.pause();
    } catch (error) {
      if (!request.signal.aborted) { request.abort(); this.fail(error, id); }
    }
  }
  async play(): Promise<void> {
    if (!this.active || !this.track) return;
    if (this.snapshot.phase === 'ERROR') {
      this.dispatch({ type: 'RECOVER', requestId: this.snapshot.playbackRequestId });
      await this.select(this.track); return;
    }
    const id = this.snapshot.playbackRequestId;
    this.endedRequest = -1;
    this.dispatch({ type: 'PLAY', requestId: id });
    if (!this.loaded) return;
    try { await cancellable(this.active.play(), this.request!.signal, this.timeoutMs); }
    catch (error) { if (!this.request?.signal.aborted) this.fail(error, id); }
  }
  pause(): void {
    this.dispatch({ type: 'PAUSE', requestId: this.snapshot.playbackRequestId });
    this.safely(() => this.active?.pause());
  }
  seek(seconds: number): void {
    if (!Number.isFinite(seconds) || !this.track) return;
    const duration = this.getDuration();
    const target = Math.max(0, duration > 0 ? Math.min(duration, seconds) : seconds);
    if (!this.loaded) { this.pendingSeek = target; return; }
    try { this.active?.seek(target); } catch (error) { this.fail(error); }
  }
  setVolume(value: number): void {
    if (!Number.isFinite(value)) return;
    this.volume = Math.max(0, Math.min(100, value)); this.safely(() => this.active?.setVolume(this.volume));
  }
  setPlaybackRate(value: number): void {
    if (!Number.isFinite(value)) return;
    this.rate = Math.max(0.5, Math.min(2, value));
    this.safely(() => (this.active ?? this.youtube).setPlaybackRate?.(this.rate));
  }
  getPlaybackRate(): number { return this.rate; }
  getCurrentTime(): number { try { return this.active?.getCurrentTime() ?? 0; } catch { return 0; } }
  getDuration(): number { try { return this.active?.getDuration() ?? 0; } catch { return 0; } }
  getCurrentTrackId(): string | null { return this.track?.videoId ?? null; }
  getPlaybackStatus(): PlaybackStatus { return this.snapshot.phase.toLowerCase() as PlaybackStatus; }
  refreshPosition(): void {
    if (!this.loaded) return;
    this.safely(() => this.callbacks?.onTimeUpdate(this.getCurrentTime(), this.getDuration()));
  }
  getAudioCapabilities() { return (this.active ?? this.youtube).getAudioCapabilities!(); }
  getQualityCapabilities() { return (this.active ?? this.youtube).getQualityCapabilities?.() ?? []; }
  setPreferredQuality(tier: Parameters<NonNullable<PlaybackProvider['setPreferredQuality']>>[0]): void {
    this.safely(() => this.youtube.setPreferredQuality?.(tier));
  }
  async prebufferTrack(track: Track): Promise<void> {
    if (track.source === 'local') return;
    try { await this.youtube.prebufferTrack?.(track); } catch { /* Speculative work must not affect playback. */ }
  }
  destroy(): void {
    this.request?.abort(); this.active = null; this.track = null; this.loaded = false;
    this.safely(() => this.youtube.destroy()); this.safely(() => this.local.destroy());
    this.initialization.clear();
    this.dispatch({ type: 'RESET', requestId: this.snapshot.playbackRequestId + 1 });
    this.callbacks = null;
  }
}