import React, { useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SlidersHorizontal,
  RotateCcw,
  X,
  Headphones,
  Gauge,
  Sparkles,
  Info,
  Layers,
  Radio,
  Music2,
} from 'lucide-react';
import {
  useEqualizerStore,
  EqualizerPreset,
  EqualizerBands,
} from '@/stores/useEqualizerStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { defaultPlaybackEngine } from '@/services/player/YouTubeIframeProvider';
import {
  modalBackdropVariants,
  modalSurfaceVariants,
  controlButtonHover,
  controlButtonTap,
} from '@/lib/motion';

const PRESET_LIST: EqualizerPreset[] = [
  'Flat',
  'Bass Boost',
  'Rock',
  'Pop',
  'Classical',
  'Electronic',
  'Hip Hop',
  'Vocal Booster',
  'Acoustic',
  'Jazz',
];

const BANDS_CONFIG: { key: keyof EqualizerBands; label: string; freq: string; isPreamp?: boolean }[] = [
  { key: 'preamp', label: 'PREAMP', freq: 'Gain', isPreamp: true },
  { key: 'b32', label: '31 Hz', freq: 'Sub-Bass' },
  { key: 'b64', label: '62 Hz', freq: 'Bass' },
  { key: 'b125', label: '125 Hz', freq: 'Warmth' },
  { key: 'b250', label: '250 Hz', freq: 'Body' },
  { key: 'b500', label: '500 Hz', freq: 'Low Mid' },
  { key: 'b1k', label: '1 kHz', freq: 'Mid' },
  { key: 'b2k', label: '2 kHz', freq: 'High Mid' },
  { key: 'b4k', label: '4 kHz', freq: 'Presence' },
  { key: 'b8k', label: '8 kHz', freq: 'Brilliance' },
  { key: 'b16k', label: '16 kHz', freq: 'Air' },
];

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const EqualizerModal: React.FC = () => {
  const {
    isOpen,
    setOpen,
    activePreset,
    setPreset,
    bands,
    setBand,
    stereoBalance,
    setStereoBalance,
    playbackSpeed,
    setPlaybackSpeed,
    spatialAudio,
    toggleSpatialAudio,
    concentricMode,
    toggleConcentricMode,
    resetAll,
  } = useEqualizerStore();

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  // Generate SVG curve path for the equalizer response visualization
  const curvePath = useMemo(() => {
    const points: [number, number][] = [
      [20, 50 - bands.b32 * 2.5],
      [75, 50 - bands.b64 * 2.5],
      [130, 50 - bands.b125 * 2.5],
      [185, 50 - bands.b250 * 2.5],
      [240, 50 - bands.b500 * 2.5],
      [295, 50 - bands.b1k * 2.5],
      [350, 50 - bands.b2k * 2.5],
      [405, 50 - bands.b4k * 2.5],
      [460, 50 - bands.b8k * 2.5],
      [515, 50 - bands.b16k * 2.5],
    ];

    // Smooth spline connecting points
    let d = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0[0] + p1[0]) / 2;
      d += ` C ${cx},${p0[1]} ${cx},${p1[1]} ${p1[0]},${p1[1]}`;
    }
    return d;
  }, [bands]);

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        variants={modalBackdropVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/80 backdrop-blur-md"
      >
        <motion.div
          variants={modalSurfaceVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[90vh] bg-[#0c0d12]/95 border border-white/[0.09] rounded-[28px] p-5 sm:p-6 shadow-[0_32px_90px_rgba(0,0,0,0.9)] flex flex-col gap-4 text-white font-sans overflow-y-auto select-none no-scrollbar"
        >
          {/* ==================================================================
              HEADER: Pro Audio Lab Identity, Status Pill, and Actions
              ================================================================== */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center shadow-inner shrink-0">
                <SlidersHorizontal className="w-5 h-5 text-rose-500" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-white tracking-tight uppercase">
                    AUDIO LAB
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-300 border border-white/[0.08] text-[10px] font-mono font-semibold tracking-wide">
                    PRO CONTROL CENTER
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-mono">
                    IFRAME AUDIO PATH
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Acoustic Profiling, Playback Dynamics & Environmental Diagnostics
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={resetAll}
                aria-label="Reset Audio Lab to defaults"
                title="Reset All Audio Lab Parameters to Defaults"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-300 hover:text-white transition-all focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-white/40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close Audio Lab"
                title="Close"
                className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-white/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ==================================================================
              CURRENT TRACK & DSP CAPABILITY STATUS STRIP
              ================================================================== */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {currentTrack?.thumbnail ? (
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-10 h-10 rounded-xl object-cover bg-charcoal-800 shrink-0 border border-white/10 shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0 border border-white/10">
                  <Music2 className="w-4 h-4 text-neutral-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">
                  {currentTrack?.title || 'No Active Track'}
                </div>
                <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                  {currentTrack?.artists?.map((a) => a.name).join(', ') || 'AAPESH Environment'}
                </div>
              </div>
            </div>

            {/* Capability Badges */}
            <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Speed & Volume: Active</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Spatial Visual: Active</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 border border-white/10 text-neutral-400">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                <span>Hardware EQ: Direct Audio Needed</span>
              </div>
            </div>
          </div>

          {/* ==================================================================
              MAIN WORKSTATION GRID: (Left: EQ & Curve, Right: Dynamics & Diagnostics)
              ================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT 7-COL: Graphic Equalizer Console */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Calm Acoustic Response Screen */}
              <div className="relative w-full h-28 rounded-2xl bg-[#08090d] border border-white/[0.06] overflow-hidden p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 z-10">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span className="font-semibold text-neutral-300">CALIBRATED RESPONSE CURVE</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500 hidden sm:inline">Telemetry Fallback</span>
                    <button
                      onClick={toggleConcentricMode}
                      className="px-2 py-0.5 rounded-full bg-white/[0.06] hover:bg-white/10 border border-white/10 text-[9px] font-medium text-neutral-300 flex items-center gap-1 transition-colors"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${concentricMode ? 'bg-rose-500' : 'bg-neutral-500'}`} />
                      <span>Concentric Rings</span>
                    </button>
                  </div>
                </div>

                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 535 100"
                  preserveAspectRatio="none"
                >
                  {/* Subtle Grid Markings */}
                  <line x1="0" y1="50" x2="535" y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="0" y1="25" x2="535" y2="25" stroke="rgba(255,255,255,0.03)" />
                  <line x1="0" y1="75" x2="535" y2="75" stroke="rgba(255,255,255,0.03)" />

                  {/* Frequency Response Spline */}
                  <path
                    d={curvePath}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="filter drop-shadow-[0_0_6px_rgba(244,63,94,0.6)] transition-all duration-150"
                  />
                </svg>

                <div className="flex items-center justify-between text-[9px] font-mono text-neutral-600 z-10 pt-1">
                  <span>-12 dB</span>
                  <span>0 dB (Flat)</span>
                  <span>+12 dB</span>
                </div>
              </div>

              {/* Acoustic Presets Bar */}
              <div className="flex flex-col gap-1.5">
                <div className="text-[10px] font-bold tracking-wider uppercase text-neutral-400 flex items-center justify-between">
                  <span>ACOUSTIC PRESETS ({activePreset.toUpperCase()})</span>
                  <span className="text-[10px] text-neutral-500 font-normal">Profile Matrix</span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {PRESET_LIST.map((preset) => {
                    const isActive = activePreset === preset;
                    return (
                      <button
                        key={preset}
                        onClick={() => setPreset(preset)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-white/40 ${
                          isActive
                            ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(225,29,72,0.35)] border border-rose-500'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 border border-white/[0.06]'
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 10-Band EQ Vertical Sliders Rack */}
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex flex-col gap-2">
                <div className="overflow-x-auto no-scrollbar pb-1">
                  <div className="grid grid-cols-11 gap-1 sm:gap-2 min-w-[440px] items-end">
                    {BANDS_CONFIG.map(({ key, label, freq, isPreamp }) => {
                      const val = bands[key];

                      return (
                        <div key={key} className="flex flex-col items-center gap-1.5 select-none">
                          {/* dB Readout */}
                          <span
                            className={`text-[9px] font-mono tabular-nums ${
                              isPreamp ? 'text-rose-400 font-bold' : val !== 0 ? 'text-cyan-400' : 'text-neutral-500'
                            }`}
                          >
                            {val > 0 ? `+${val.toFixed(1)}` : val === 0 ? '0.0' : val.toFixed(1)}
                          </span>

                          {/* Slider Track Container */}
                          <div className="relative w-4 h-28 flex items-center justify-center">
                            <input
                              type="range"
                              min="-12"
                              max="12"
                              step="0.5"
                              value={val}
                              aria-valuemin={-12}
                              aria-valuemax={12}
                              aria-valuenow={val}
                              aria-valuetext={`${label}: ${val > 0 ? `+${val}` : val} dB`}
                              onChange={(e) => setBand(key, Number(e.target.value))}
                              aria-label={`${label} Equalizer Band`}
                              className={`eq-vertical-slider ${isPreamp ? 'eq-slider-preamp' : 'eq-slider-band'}`}
                            />
                          </div>

                          {/* Frequency Tag */}
                          <div className="flex flex-col items-center text-center">
                            <span
                              className={`text-[9px] font-semibold tracking-tight truncate max-w-full ${
                                isPreamp ? 'text-rose-500 font-bold' : 'text-neutral-300'
                              }`}
                            >
                              {label}
                            </span>
                            <span className="text-[8px] text-neutral-500 font-mono truncate max-w-full hidden sm:inline">
                              {freq}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04] text-[10px] text-neutral-400">
                  <Info className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span>
                    Acoustic profile is configured and saved. YouTube IFrame isolates the audio stream from direct Web Audio DSP processing.
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT 5-COL: Playback Rate, Stereo Balance, Spatial Atmosphere & Diagnostics */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Playback Speed (Real Provider Execution) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-rose-400" />
                    <span>PLAYBACK SPEED</span>
                  </div>
                  <span className="text-white font-mono font-bold bg-white/[0.08] px-2 py-0.5 rounded-md border border-white/10">
                    {playbackSpeed}x
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 pt-1">
                  {SPEED_OPTIONS.map((speed) => {
                    const isActive = playbackSpeed === speed;
                    return (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={`py-1.5 rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-white/40 ${
                          isActive
                            ? 'bg-rose-600 text-white border border-rose-500 shadow-sm'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 border border-white/[0.06]'
                        }`}
                      >
                        {speed}x
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stereo Balance */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">
                  <span>STEREO BALANCE</span>
                  <span className="text-white font-mono font-bold">
                    {stereoBalance === 0
                      ? 'CENTER'
                      : stereoBalance < 0
                      ? `L ${Math.abs(stereoBalance)}%`
                      : `R ${stereoBalance}%`}
                  </span>
                </div>

                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={stereoBalance}
                  aria-valuemin={-100}
                  aria-valuemax={100}
                  aria-valuenow={stereoBalance}
                  aria-valuetext={
                    stereoBalance === 0
                      ? 'Center'
                      : stereoBalance < 0
                      ? `Left ${Math.abs(stereoBalance)}%`
                      : `Right ${stereoBalance}%`
                  }
                  onChange={(e) => setStereoBalance(Number(e.target.value))}
                  aria-label="Stereo Balance"
                  className="scrubber-slider-aapesh w-full"
                  style={{
                    background: `linear-gradient(to right, rgba(255,255,255,0.1) 0%, #38bdf8 50%, rgba(255,255,255,0.1) 100%)`,
                  }}
                />

                <div className="flex items-center justify-between text-[9px] text-neutral-500 font-mono">
                  <span>Left (100%)</span>
                  <span>Center (0%)</span>
                  <span>Right (100%)</span>
                </div>
              </div>

              {/* Spatial Atmosphere & DSP Matrix */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5 text-cyan-400" />
                    <span>SPATIAL ATMOSPHERE</span>
                  </div>
                  <button
                    onClick={toggleSpatialAudio}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-white/40 ${
                      spatialAudio
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-white/[0.06] text-neutral-400 border border-white/10'
                    }`}
                  >
                    {spatialAudio ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-neutral-300">Spatial Visual Environment</span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {spatialAudio ? 'Active (Dynamic)' : 'Off'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-neutral-400">Binaural / Multi-Channel DSP</span>
                    <span className="text-[10px] font-mono text-neutral-500">Unavailable (IFrame)</span>
                  </div>
                </div>
              </div>

              {/* Provider Stream Diagnostics Card */}
              <div className="p-3.5 rounded-2xl bg-[#08090e] border border-white/[0.05] flex flex-col gap-2">
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  STREAM SPECIFICATIONS & DIAGNOSTICS
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="flex flex-col">
                    <span className="text-neutral-500 text-[9px]">ACTIVE PROVIDER</span>
                    <span className="text-neutral-200">YouTube IFrame Engine</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-neutral-500 text-[9px]">ENCODING & CODEC</span>
                    <span className="text-neutral-200">Opus / AAC Stereo</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-neutral-500 text-[9px]">MAX BITRATE</span>
                    <span className="text-neutral-200">Up to 256 kbps (Adaptive)</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-neutral-500 text-[9px]">DSP ROUTING</span>
                    <span className="text-amber-400/90">Isolated Media Stream</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
