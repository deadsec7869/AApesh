import type { Track } from '@/types/music';
import type { AudioDSPState } from '@/stores/useAudioDSPStore';
import type { AudioCapabilities, PlaybackCallbacks, PlaybackProvider } from './PlaybackProvider';
import { getLocalFile } from './localFiles';

const finite = (value: number, low: number, high: number, fallback: number) =>
  Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : fallback;

export class LocalAudioProvider implements PlaybackProvider {
  name = 'LocalAudio';
  private media: HTMLAudioElement | null = null;
  private callbacks: PlaybackCallbacks | null = null;
  private trackId: string | null = null;
  private url: string | null = null;
  private context: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private preamp: GainNode | null = null;
  private balance: StereoPannerNode | null = null;
  private analyser: AnalyserNode | null = null;
  private dsp: AudioDSPState | null = null;
  private volume = 80;
  private rate = 1;
  private playGeneration = 0;
  private pendingSeek: number | null = null;
  private removeListeners: (() => void) | null = null;

  async init(callbacks: PlaybackCallbacks): Promise<void> { this.callbacks = callbacks; }

  private ensureMedia(): HTMLAudioElement {
    if (!this.media) {
      this.media = new Audio();
      this.media.preload = 'metadata';
      this.media.volume = this.volume / 100;
      this.media.playbackRate = this.rate;
    }
    return this.media;
  }

  async load(track: Track, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return;
    const file = getLocalFile(track.videoId);
    if (!file) throw new Error('This local file is no longer available. Import it again to restore access.');
    const media = this.ensureMedia();
    this.removeListeners?.();
    media.pause();
    media.removeAttribute('src');
    media.load();
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = URL.createObjectURL(file);
    this.trackId = track.videoId;
    this.pendingSeek = null;
    const currentUrl = this.url;
    const listeners: Array<[string, EventListener]> = [];
    const on = (name: string, run: () => void) => {
      const handler = () => {
        if (!signal?.aborted && this.url === currentUrl && media.currentSrc === currentUrl) run();
      };
      media.addEventListener(name, handler);
      listeners.push([name, handler]);
    };
    on('playing', () => { this.callbacks?.onStatusChange?.('playing'); this.callbacks?.onStateChange(true, false); });
    on('pause', () => { this.callbacks?.onStatusChange?.('paused'); this.callbacks?.onStateChange(false, false); });
    on('waiting', () => { this.callbacks?.onStatusChange?.('buffering'); this.callbacks?.onStateChange(false, true); });
    on('ended', () => this.callbacks?.onEnded());
    on('error', () => this.callbacks?.onError(`Cannot play this file (media error ${media.error?.code ?? 'unknown'}). It may be corrupt or use an unsupported codec.`));
    on('timeupdate', () => this.callbacks?.onTimeUpdate(this.getCurrentTime(), this.getDuration()));
    on('loadedmetadata', () => {
      if (this.pendingSeek !== null) { const target = this.pendingSeek; this.pendingSeek = null; this.seek(target); }
      this.callbacks?.onTimeUpdate(this.getCurrentTime(), this.getDuration());
    });
    on('progress', () => {
      const duration = this.getDuration();
      let ahead = 0;
      for (let i = 0; i < media.buffered.length; i++) {
        if (media.buffered.start(i) <= media.currentTime && media.buffered.end(i) >= media.currentTime)
          ahead = media.buffered.end(i) - media.currentTime;
      }
      this.callbacks?.onBufferHealth?.({ loadedFraction: duration > 0 ? Math.min(1, (media.currentTime + ahead) / duration) : null,
        bufferAheadSeconds: ahead, targetBufferSeconds: 0, networkTier: 'unknown', isPrebuffering: false });
    });
    const abort = () => { this.pause(); };
    signal?.addEventListener('abort', abort, { once: true });
    this.removeListeners = () => {
      listeners.forEach(([name, handler]) => media.removeEventListener(name, handler));
      signal?.removeEventListener('abort', abort);
    };
    media.src = currentUrl;
    media.load();
  }

  private ensureGraph(): void {
    if (this.context) return;
    const media = this.ensureMedia();
    const context = new AudioContext();
    this.context = context;
    this.source = context.createMediaElementSource(media);
    this.preamp = context.createGain();
    this.balance = context.createStereoPanner();
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.75;
    let node: AudioNode = this.source;
    node.connect(this.preamp); node = this.preamp;
    this.filters = Array.from({ length: 10 }, () => {
      const filter = context.createBiquadFilter(); filter.type = 'peaking'; filter.gain.value = 0;
      node.connect(filter); node = filter; return filter;
    });
    node.connect(this.balance); this.balance.connect(this.analyser); this.analyser.connect(context.destination);
    if (this.dsp) this.applyDSP(this.dsp);
  }

  async play(): Promise<void> {
    const media = this.ensureMedia();
    if (!this.trackId) return;
    const generation = ++this.playGeneration;
    this.ensureGraph();
    if (this.context?.state === 'suspended') await this.context.resume();
    if (generation !== this.playGeneration) return;
    await media.play();
  }
  pause(): void { ++this.playGeneration; this.media?.pause(); }
  seek(seconds: number): void {
    if (!Number.isFinite(seconds) || !this.media) return;
    if (!this.getDuration()) { this.pendingSeek = Math.max(0, seconds); return; }
    this.media.currentTime = finite(seconds, 0, this.getDuration(), 0);
  }
  setVolume(volume: number): void { this.volume = finite(volume, 0, 100, 80); if (this.media) this.media.volume = this.volume / 100; }
  setPlaybackRate(rate: number): void { this.rate = finite(rate, 0.5, 2, 1); if (this.media) this.media.playbackRate = this.rate; }
  getPlaybackRate(): number { return this.rate; }
  getCurrentTime(): number { return finite(this.media?.currentTime ?? 0, 0, Number.MAX_SAFE_INTEGER, 0); }
  getDuration(): number { return finite(this.media?.duration ?? 0, 0, Number.MAX_SAFE_INTEGER, 0); }
  getCurrentTrackId(): string | null { return this.trackId; }
  getAnalyser(): AnalyserNode | null { return this.analyser; }
  applyDSP(state: AudioDSPState): void {
    this.dsp = state;
    this.setPlaybackRate(state.playbackSpeed);
    if (!this.context) return;
    const time = this.context.currentTime;
    this.filters.forEach((filter, i) => {
      const band = state.parametricBands[i];
      if (!band) return;
      filter.type = band.enabled ? band.type : 'peaking';
      filter.frequency.setTargetAtTime(finite(band.freq, 20, Math.min(20000, this.context!.sampleRate / 2 - 1), 1000), time, 0.015);
      filter.Q.setTargetAtTime(finite(band.q, 0.1, 30, 1), time, 0.015);
      filter.gain.setTargetAtTime(band.enabled ? finite(band.gain, -24, 24, 0) : 0, time, 0.015);
    });
    this.preamp?.gain.setTargetAtTime(Math.pow(10, finite(state.bands.preamp, -24, 12, 0) / 20), time, 0.015);
    this.balance?.pan.setTargetAtTime(finite(state.stereoBalance, -100, 100, 0) / 100, time, 0.015);
  }
  getAudioCapabilities(): AudioCapabilities {
    return { providerName: 'Local Audio / Web Audio', volume: 'supported', playbackRate: 'supported', availablePlaybackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      eq: 'supported', balance: 'supported', spatialDsp: 'unsupported', spatialDspReason: 'Spatial DSP is not implemented.',
      spatialVisualization: 'supported', analyser: 'supported', maxBitrateKbps: 0, codec: 'File-dependent', qualityDescription: 'Original local file; decoding depends on the browser codec support.' };
  }
  destroy(): void {
    this.removeListeners?.(); this.removeListeners = null;
    this.media?.pause(); this.media?.removeAttribute('src'); this.media?.load();
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null; this.trackId = null;
    this.source?.disconnect(); this.filters.forEach(node => node.disconnect());
    this.preamp?.disconnect(); this.balance?.disconnect(); this.analyser?.disconnect();
    void this.context?.close().catch(() => {});
    this.context = null; this.media = null; this.source = null; this.analyser = null; this.filters = []; this.callbacks = null;
  }
}
