/**
 * AAPESH — Audio Reactive Engine (Phase 2)
 *
 * Provides legitimate Web Audio AnalyserNode frequency analysis with graceful
 * harmonic telemetry fallback for YouTube IFrame playback.
 * Delivers attack/release smoothed, jitter-free visual energy bands.
 */

export interface VisualEnergy {
  bassEnergy: number;      // Low frequencies: kicks, bass (0.0 – 1.0)
  midEnergy: number;       // Mid frequencies: vocals, melody (0.0 – 1.0)
  highEnergy: number;      // High frequencies: hats, shimmer (0.0 – 1.0)
  overallEnergy: number;   // Composite perceived energy (0.0 – 1.0)
  transientEnergy: number; // Fast-attack transient pulse with exponential decay (0.0 – 1.0)
}

export interface PlaybackTelemetry {
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0 to 100
  trackId?: string;
}

export class AudioReactiveEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | AudioNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;
  private hasLiveAudio = false;

  // Smoothed Visual Energy State (Mutable for 60fps performance)
  private energy: VisualEnergy = {
    bassEnergy: 0.15,
    midEnergy: 0.15,
    highEnergy: 0.15,
    overallEnergy: 0.15,
    transientEnergy: 0.0,
  };

  // Smoothing Time Constants (seconds)
  private readonly attackTau = 0.04;  // Fast musical attack (~40ms)
  private readonly releaseTau = 0.32; // Smooth cinematic release (~320ms)
  private lastBassRaw = 0.15;

  /**
   * Attach a legitimate HTML5 Audio/Media element or Web Audio node when available
   */
  public attachAudioSource(source: HTMLMediaElement | AudioNode): void {
    try {
      if (typeof window === 'undefined') return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
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
        this.analyser.smoothingTimeConstant = 0.8;
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
    } catch (err) {
      console.warn('[AudioReactiveEngine] Web Audio attachment deferred:', err);
      this.hasLiveAudio = false;
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
    } catch {}
  }

  /**
   * Update visual energy bands each animation frame.
   * Uses real AnalyserNode when available, otherwise falls back to
   * organic musical telemetry synthesis.
   */
  public update(deltaSeconds: number, telemetry: PlaybackTelemetry): VisualEnergy {
    // Clamp delta to prevent huge jumps on tab switch/frame drops
    const dt = Math.min(Math.max(deltaSeconds, 0.001), 0.1);

    let rawBass = 0.0;
    let rawMid = 0.0;
    let rawHigh = 0.0;
    let rawOverall = 0.0;

    if (this.hasLiveAudio && this.analyser && this.freqData) {
      // 1. Real Web Audio Frequency Analysis
      this.analyser.getByteFrequencyData(this.freqData);

      // Low / Bass band: indices 1 to 6 (~20Hz – 250Hz)
      let sumBass = 0;
      const bassCount = 6;
      for (let i = 1; i <= bassCount; i++) {
        sumBass += this.freqData[i];
      }
      rawBass = sumBass / (bassCount * 255);

      // Mid band: indices 7 to 28 (~250Hz – 2.5kHz)
      let sumMid = 0;
      const midCount = 22;
      for (let i = 7; i <= 7 + midCount; i++) {
        sumMid += this.freqData[i];
      }
      rawMid = sumMid / (midCount * 255);

      // High band: indices 29 to 64 (~2.5kHz – 10kHz+)
      let sumHigh = 0;
      const highCount = 36;
      for (let i = 29; i < 29 + highCount; i++) {
        sumHigh += this.freqData[i];
      }
      rawHigh = sumHigh / (highCount * 255);

      // Overall composite
      rawOverall = rawBass * 0.45 + rawMid * 0.35 + rawHigh * 0.20;
    } else {
      // 2. Graceful Musical Telemetry Harmonic Synthesis (YouTube IFrame compliant)
      if (!telemetry.isPlaying || telemetry.isBuffering) {
        // Paused/Buffering: Decay to gentle resting baseline
        rawBass = 0.05;
        rawMid = 0.05;
        rawHigh = 0.05;
        rawOverall = 0.05;
      } else {
        const time = telemetry.currentTime || 0;
        const volNorm = Math.min(Math.max(telemetry.volume / 100, 0.1), 1.0);

        // Organic multi-harmonic sinusoidal synthesis (~1.75Hz rhythmic breathing, ~0.45Hz phrasing, ~3.5Hz sparkle)
        const wave1 = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 * 1.75);
        const wave2 = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 * 0.45 + 1.2);
        const wave3 = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 * 3.50 + 2.4);

        // Musical energy shaping (Quiet: ~0.18, Normal: ~0.45, Peak: ~0.75)
        rawBass = (0.20 + 0.35 * Math.pow(wave1, 2.0) + 0.20 * wave2) * volNorm;
        rawMid = (0.20 + 0.30 * wave2 + 0.15 * wave1) * volNorm;
        rawHigh = (0.15 + 0.25 * wave3 + 0.15 * wave2) * volNorm;

        rawOverall = rawBass * 0.45 + rawMid * 0.35 + rawHigh * 0.20;
      }
    }

    // 3. Transient Pulse Detection (conservative, organic)
    const deltaBass = Math.max(0, rawBass - this.lastBassRaw);
    this.lastBassRaw = rawBass;

    if (deltaBass > 0.12 && telemetry.isPlaying) {
      this.energy.transientEnergy = Math.min(1.0, this.energy.transientEnergy + deltaBass * 2.2);
    }
    // Exponential transient decay (~180ms half-life)
    this.energy.transientEnergy *= Math.exp(-dt / 0.18);

    // 4. Attack / Release Smoothing Filter
    this.energy.bassEnergy = this.smoothValue(this.energy.bassEnergy, rawBass, dt);
    this.energy.midEnergy = this.smoothValue(this.energy.midEnergy, rawMid, dt);
    this.energy.highEnergy = this.smoothValue(this.energy.highEnergy, rawHigh, dt);
    this.energy.overallEnergy = this.smoothValue(this.energy.overallEnergy, rawOverall, dt);

    return this.energy;
  }

  /**
   * Asymmetric attack/release smoothing filter:
   * Fast attack on surges, gentle release on decay.
   */
  private smoothValue(current: number, target: number, dt: number): number {
    const tau = target > current ? this.attackTau : this.releaseTau;
    const alpha = 1.0 - Math.exp(-dt / tau);
    const next = current + (target - current) * alpha;
    return Math.min(Math.max(next, 0.0), 1.0);
  }

  /**
   * Get current energy state synchronously without recalculating
   */
  public getEnergy(): VisualEnergy {
    return this.energy;
  }
}

export const audioReactiveEngine = new AudioReactiveEngine();
