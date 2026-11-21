/**
 * AAPESH — Audio Reactive Engine (Phase 3 Spatial Workstation)
 *
 * Provides legitimate Web Audio AnalyserNode frequency band analysis with
 * musical beat detection and graceful harmonic telemetry fallback for YouTube IFrame playback.
 * Delivers attack/release smoothed, jitter-free visual energy features.
 */

export type AudioAnalysisMode = 'live_analyser' | 'ambient';

export interface AudioFeatures {
  bass: number;          // Sub & kick low frequencies (~20Hz – 140Hz, 0.0 – 1.0)
  lowMid: number;        // Warm bass / lower fundamental harmonics (~140Hz – 350Hz, 0.0 – 1.0)
  mid: number;           // Vocal / chordal melodic presence (~350Hz – 2.5kHz, 0.0 – 1.0)
  highMid: number;       // Presence / upper harmonics (~2.5kHz – 6kHz, 0.0 – 1.0)
  treble: number;        // Shimmer / crisp transients (~6kHz – 16kHz+, 0.0 – 1.0)
  overall: number;       // Perceptual composite energy (0.0 – 1.0)
  beatEnergy: number;    // Rhythmic pulse for musical sync (0.0 – 1.0)
  transient: number;     // Fast-attack transient pulse with exponential decay (0.0 – 1.0)
  analysisMode?: AudioAnalysisMode;
}

// Backward compatibility alias for existing consumers
export interface VisualEnergy {
  bassEnergy: number;
  midEnergy: number;
  highEnergy: number;
  overallEnergy: number;
  transientEnergy: number;
  beatEnergy?: number;
  lowMidEnergy?: number;
  highMidEnergy?: number;
}

export interface PlaybackTelemetry {
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0 to 100
  trackId?: string;
  bpm?: number;
}

export class AudioReactiveEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | AudioNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;
  private hasLiveAudio = false;
  private ambientMode = false;

  // Adaptive intensity normalization running maxima (decay ~6s)
  private maxBass = 0.35;
  private maxLowMid = 0.35;
  private maxMid = 0.35;
  private maxHighMid = 0.30;
  private maxTreble = 0.25;

  // Smoothed Audio Features State (Mutable for 60fps performance without garbage collection)
  private features: AudioFeatures = {
    bass: 0.12,
    lowMid: 0.12,
    mid: 0.12,
    highMid: 0.12,
    treble: 0.10,
    overall: 0.12,
    beatEnergy: 0.0,
    transient: 0.0,
    analysisMode: 'ambient',
  };

  // Asymmetric Time Constants (seconds)
  // Bass: slow & deep; Mid: balanced; Treble: fast & subtle
  private readonly bassAttack = 0.035;
  private readonly bassRelease = 0.40;

  private readonly midAttack = 0.030;
  private readonly midRelease = 0.28;

  private readonly trebleAttack = 0.020;
  private readonly trebleRelease = 0.18;

  private readonly overallAttack = 0.030;
  private readonly overallRelease = 0.32;

  // Beat Detection State
  private lastBassRaw = 0.12;
  private lastTrebleRaw = 0.10;
  private beatCooldown = 0.0;
  private readonly minBeatInterval = 0.22; // ~270 BPM max threshold to avoid fluttering
  private beatThreshold = 0.14;

  /**
   * Attach a legitimate HTML5 Audio/Media element or Web Audio node when available.
   * Note: Never extracts or scrapes protected YouTube iframes.
   */
  public attachAudioSource(source: HTMLMediaElement | AudioNode): void {
    try {
      if (typeof window === 'undefined') return;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      if (!this.analyser) {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.75;
        this.analyser.minDecibels = -90;
        this.analyser.maxDecibels = -10;
        this.freqData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
      }

      if (source instanceof HTMLMediaElement) {
        this.sourceNode = this.audioContext.createMediaElementSource(source);
        this.sourceNode.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
      } else if (source instanceof AudioNode) {
        this.sourceNode = source;
        this.sourceNode.connect(this.analyser);
      }

      this.hasLiveAudio = true;
      this.features.analysisMode = 'live_analyser';
    } catch (err) {
      console.warn('[AudioReactiveEngine] Web Audio attachment deferred:', err);
      this.hasLiveAudio = false;
      this.features.analysisMode = 'ambient';
    }
  }

  /**
   * Safely detach audio source and cleanup Web Audio nodes
   */
  public detachAudioSource(): void {
    try {
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
      this.hasLiveAudio = false;
      this.features.analysisMode = 'ambient';
    } catch {}
  }

  /**
   * Check if real Web Audio analysis is active
   */
  public isLiveAudioActive(): boolean {
    return this.hasLiveAudio;
  }

  /** Borrow analysis only. The playback provider retains ownership of audio routing. */
  public setExternalAnalyser(analyser: AnalyserNode | null): void {
    if (this.analyser === analyser) return;
    this.analyser = analyser;
    this.freqData = analyser ? new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount)) : null;
    this.hasLiveAudio = analyser !== null;
    this.features.analysisMode = analyser ? 'live_analyser' : 'ambient';
  }

  /**
   * Toggle or set optional ambient mode (calm, non-pulsing ambient illumination)
   */
  public setAmbientMode(enabled: boolean): void {
    this.ambientMode = enabled;
    if (enabled) {
      this.features.analysisMode = 'ambient';
    } else {
      this.features.analysisMode = this.hasLiveAudio ? 'live_analyser' : 'ambient';
    }
  }

  public isAmbientMode(): boolean {
    return this.ambientMode;
  }

  /**
   * Get current analysis mode for honest UI reporting
   */
  public getAnalysisMode(): AudioAnalysisMode {
    if (this.ambientMode) return 'ambient';
    return this.hasLiveAudio ? 'live_analyser' : 'ambient';
  }

  /**
   * Reset transient states on track transitions
   */
  public resetTransientState(): void {
    this.features.transient = 0.0;
    this.features.beatEnergy = 0.0;
    this.lastBassRaw = 0.12;
    this.lastTrebleRaw = 0.10;
    this.beatCooldown = 0.0;
  }

  /**
   * Update visual energy features each animation frame.
   * Uses real AnalyserNode when available, otherwise falls back to
   * organic musical telemetry harmonic synthesis.
   */
  public update(deltaSeconds: number, telemetry: PlaybackTelemetry): VisualEnergy {
    const dt = Math.min(Math.max(deltaSeconds, 0.001), 0.1);

    let rawBass = 0.0;
    let rawLowMid = 0.0;
    let rawMid = 0.0;
    let rawHighMid = 0.0;
    let rawTreble = 0.0;
    let rawOverall = 0.0;

    if (this.ambientMode || !this.hasLiveAudio || !this.analyser || !this.freqData) {
      // An embedded player supplies a clock, not audio samples.
      Object.assign(this.features, {bass:0, lowMid:0, mid:0, highMid:0, treble:0, overall:0, transient:0, beatEnergy:0});
      return this.getEnergy();
    } else {
      // 1. Real Web Audio Frequency Analysis (128 frequency bins with sampleRate/256 bin resolution)
      this.analyser.getByteFrequencyData(this.freqData);

      // Sub & Kick Bass band: bins 1 to 4 (~20Hz – 140Hz)
      let sumBass = 0;
      for (let i = 1; i <= 4; i++) sumBass += this.freqData[i];
      const rawBassByte = sumBass / (4 * 255);

      // Low-Mid band: bins 5 to 10 (~140Hz – 350Hz)
      let sumLowMid = 0;
      for (let i = 5; i <= 10; i++) sumLowMid += this.freqData[i];
      const rawLowMidByte = sumLowMid / (6 * 255);

      // Mid band: bins 11 to 32 (~350Hz – 2.5kHz)
      let sumMid = 0;
      for (let i = 11; i <= 32; i++) sumMid += this.freqData[i];
      const rawMidByte = sumMid / (22 * 255);

      // High-Mid band: bins 33 to 64 (~2.5kHz – 6kHz)
      let sumHighMid = 0;
      for (let i = 33; i <= 64; i++) sumHighMid += this.freqData[i];
      const rawHighMidByte = sumHighMid / (32 * 255);

      // Treble band: bins 65 to 110 (~6kHz – 16kHz+)
      let sumTreble = 0;
      for (let i = 65; i <= 110; i++) sumTreble += this.freqData[i];
      const rawTrebleByte = sumTreble / (46 * 255);

      // Adaptive Intensity Normalization (Slowly adapts to quiet and loud songs)
      const normDecay = Math.exp(-dt / 6.0);
      this.maxBass = Math.max(0.18, this.maxBass * normDecay, rawBassByte);
      this.maxLowMid = Math.max(0.18, this.maxLowMid * normDecay, rawLowMidByte);
      this.maxMid = Math.max(0.18, this.maxMid * normDecay, rawMidByte);
      this.maxHighMid = Math.max(0.15, this.maxHighMid * normDecay, rawHighMidByte);
      this.maxTreble = Math.max(0.12, this.maxTreble * normDecay, rawTrebleByte);

      rawBass = Math.min(1.0, rawBassByte / this.maxBass);
      rawLowMid = Math.min(1.0, rawLowMidByte / this.maxLowMid);
      rawMid = Math.min(1.0, rawMidByte / this.maxMid);
      rawHighMid = Math.min(1.0, rawHighMidByte / this.maxHighMid);
      rawTreble = Math.min(1.0, rawTrebleByte / this.maxTreble);

      // Perceptual weighting composite
      rawOverall = rawBass * 0.35 + rawLowMid * 0.20 + rawMid * 0.25 + rawHighMid * 0.12 + rawTreble * 0.08;
    }

    // 3. Transient Pulse Detection (conservative, non-strobe)
    if (!this.ambientMode) {
      const deltaBass = Math.max(0, rawBass - this.lastBassRaw);
      const deltaTreble = Math.max(0, rawTreble - this.lastTrebleRaw);
      this.lastBassRaw = rawBass;
      this.lastTrebleRaw = rawTreble;

      if ((deltaBass > 0.10 || deltaTreble > 0.14) && telemetry.isPlaying && !telemetry.isBuffering) {
        const attackBoost = deltaBass * 2.0 + deltaTreble * 1.2;
        this.features.transient = Math.min(1.0, this.features.transient + attackBoost);
      }
      // Exponential transient decay (~180ms half-life)
      this.features.transient *= Math.exp(-dt / 0.18);

      // 4. Musical Beat Detection
      this.beatCooldown = Math.max(0, this.beatCooldown - dt);
      if (this.beatCooldown <= 0 && deltaBass > this.beatThreshold && telemetry.isPlaying && !telemetry.isBuffering) {
        this.features.beatEnergy = 1.0;
        this.beatCooldown = this.minBeatInterval;
      } else {
        // Exponential beat decay (~160ms decay)
        this.features.beatEnergy *= Math.exp(-dt / 0.16);
      }
    }

    // 5. Asymmetric Attack / Release Smoothing Filters
    this.features.bass = this.smooth(this.features.bass, rawBass, dt, this.bassAttack, this.bassRelease);
    this.features.lowMid = this.smooth(this.features.lowMid, rawLowMid, dt, this.midAttack, this.midRelease);
    this.features.mid = this.smooth(this.features.mid, rawMid, dt, this.midAttack, this.midRelease);
    this.features.highMid = this.smooth(this.features.highMid, rawHighMid, dt, this.trebleAttack, this.trebleRelease);
    this.features.treble = this.smooth(this.features.treble, rawTreble, dt, this.trebleAttack, this.trebleRelease);
    this.features.overall = this.smooth(this.features.overall, rawOverall, dt, this.overallAttack, this.overallRelease);

    return this.getEnergy();
  }

  /**
   * Asymmetric smoothing filter:
   * Fast attack on sudden rises, smooth cinematic release on decays.
   */
  private smooth(current: number, target: number, dt: number, attackTau: number, releaseTau: number): number {
    const tau = target > current ? attackTau : releaseTau;
    const alpha = 1.0 - Math.exp(-dt / tau);
    const next = current + (target - current) * alpha;
    return Math.min(Math.max(next, 0.0), 1.0);
  }

  /**
   * Get all audio features synchronously without recalculating
   */
  public getFeatures(): AudioFeatures {
    return this.features;
  }

  /**
   * Backward-compatible helper returning VisualEnergy format
   */
  public getEnergy(): VisualEnergy {
    return {
      bassEnergy: this.features.bass,
      midEnergy: this.features.mid,
      highEnergy: this.features.treble,
      overallEnergy: this.features.overall,
      transientEnergy: this.features.transient,
      beatEnergy: this.features.beatEnergy,
      lowMidEnergy: this.features.lowMid,
      highMidEnergy: this.features.highMid,
    };
  }
}

export const audioReactiveEngine = new AudioReactiveEngine();
export const beatReactiveEngine = audioReactiveEngine;
export { AudioReactiveEngine as BeatReactiveEngine };

