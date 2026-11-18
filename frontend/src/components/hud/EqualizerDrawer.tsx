import React, { useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, SlidersHorizontal, RotateCcw, Headphones, Gauge,
  Sparkles, Info, Layers, Radio, Music2, Minus, Plus,
} from 'lucide-react';
import {
  useAudioDSPStore,
  EqualizerPreset,
  ParametricBand,
  VUMeterData,
} from '@/stores/useAudioDSPStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { defaultPlaybackEngine } from '@/services/player/YouTubeIframeProvider';
import { controlButtonHover, controlButtonTap } from '@/lib/motion';

const PRESET_LIST: EqualizerPreset[] = [
  'Flat',
  'Sub-Bass Boost',
  'Vocal Clarity',
  'Late Night',
  'Studio Reference',
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

const BAND_CONFIG: { key: keyof ParametricBand; label: string; freq: string; defaultFreq: number; defaultQ: number }[] = [
  { key: 'freq', label: '32', freq: 'Hz', defaultFreq: 32, defaultQ: 0.7 },
  { key: 'freq', label: '63', freq: 'Hz', defaultFreq: 64, defaultQ: 1.0 },
  { key: 'freq', label: '125', freq: 'Hz', defaultFreq: 125, defaultQ: 1.0 },
  { key: 'freq', label: '250', freq: 'Hz', defaultFreq: 250, defaultQ: 1.0 },
  { key: 'freq', label: '500', freq: 'Hz', defaultFreq: 500, defaultQ: 1.0 },
  { key: 'freq', label: '1k', freq: 'Hz', defaultFreq: 1000, defaultQ: 1.0 },
  { key: 'freq', label: '2k', freq: 'Hz', defaultFreq: 2000, defaultQ: 1.0 },
  { key: 'freq', label: '4k', freq: 'Hz', defaultFreq: 4000, defaultQ: 1.0 },
  { key: 'freq', label: '8k', freq: 'Hz', defaultFreq: 8000, defaultQ: 1.0 },
  { key: 'freq', label: '16k', freq: 'Hz', defaultFreq: 16000, defaultQ: 0.7 },
];

const BAND_LABELS = ['32', '63', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];
const BAND_FREQS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface EqualizerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EqualizerDrawer: React.FC<EqualizerDrawerProps> = ({ isOpen, onClose }) => {
  const {
    activePreset,
    setPreset,
    parametricBands,
    setParametricBandGain,
    setParametricBandFreq,
    setParametricBandQ,
    setParametricBandEnabled,
    setParametricBandType,
    stereoWidth,
    setStereoWidth,
    playbackSpeed,
    setPlaybackSpeed,
    spatialAudio,
    toggleSpatialAudio,
    concentricMode,
    toggleConcentricMode,
    resetAll,
    vuMeterData,
  } = useAudioDSPStore();

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // VU Meter animation
  useEffect(() => {
    if (!isOpen) return;
    let animationId: number;
    const animate = () => {
      // VU meter updates come from the store via audio engine
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [isOpen]);

  // Generate frequency response curve for visualization
  const curvePath = useMemo(() => {
    const points: [number, number][] = [];
    const width = 500;
    const numPoints = 100;

    for (let i = 0; i <= numPoints; i++) {
      const freq = Math.pow(10, Math.log10(20) + (Math.log10(20000) - Math.log10(20)) * (i / numPoints));
      let gain = 0;

      // Sum contributions from all parametric bands
      parametricBands.forEach((band, idx) => {
        if (!band.enabled) return;
        const centerFreq = band.freq;
        const q = band.q;
        const bandGain = band.gain;

        // Calculate response at this frequency (bell curve approximation)
        const ratio = freq / centerFreq;
        const response = 1 / Math.sqrt(1 + Math.pow(ratio - 1/ratio, 2) * q * q);
        gain += bandGain * response;
      });

      // Clamp and map to canvas coordinates
      gain = Math.max(-24, Math.min(24, gain));
      const x = (i / numPoints) * width;
      const y = 50 - gain * 2; // 2px per dB, center at 50
      points.push([x, y]);
    }

    // Smooth spline
    let d = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0[0] + p1[0]) / 2;
      d += ` C ${cx},${p0[1]} ${cx},${p1[1]} ${p1[0]},${p1[1]}`;
    }
    return d;
  }, [parametricBands]);

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6"
        onClick={onClose}
        style={{ background: 'rgba(5, 5, 7, 0.85)', backdropFilter: 'blur(20px)' }}
      >
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-5xl max-h-[92vh] flex flex-col"
          style={{
            background: 'rgba(14, 15, 20, 0.95)',
            backdropFilter: 'blur(40px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '36px',
            boxShadow: '0 32px 96px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 p-5 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              }}>
                <SlidersHorizontal className="w-5 h-5" style={{ color: 'rgb(var(--aura-primary-rgb))' }} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-white tracking-tight uppercase">AUDIO LAB</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider border"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderColor: 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    10-BAND PARAMETRIC EQ
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono border"
                    style={{
                      background: 'rgba(244, 63, 94, 0.1)',
                      borderColor: 'rgba(244, 63, 94, 0.2)',
                      color: '#f43f5e',
                    }}
                  >
                    LIQUID GLASS
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">Precision parametric control • Stereo width • Playback dynamics</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={resetAll}
                aria-label="Reset Audio Lab to defaults"
                title="Reset All Parameters"
                className="liquid-glass-pill px-3 py-1.5 text-xs font-medium text-neutral-300 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </motion.button>
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={onClose}
                aria-label="Close Audio Lab"
                className="liquid-glass-pill w-9 h-9 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4 text-neutral-400" />
              </motion.button>
            </div>
          </div>

          {/* Current Track & Status */}
          <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {currentTrack?.thumbnail ? (
                <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-11 h-11 rounded-xl object-cover shrink-0" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
              ) : (
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Music2 className="w-4 h-4 text-neutral-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">{currentTrack?.title || 'No Active Track'}</div>
                <div className="text-[11px] text-neutral-400 truncate mt-0.5">{currentTrack?.artists?.map((a) => a.name).join(', ') || 'AAPESH Environment'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
              <span className="liquid-glass-pill px-2.5 py-1 text-emerald-400 border-emerald-500/30">Speed: Active</span>
              <span className="liquid-glass-pill px-2.5 py-1 text-cyan-400 border-cyan-500/30">Spatial: Visual</span>
              <span className="liquid-glass-pill px-2.5 py-1 text-neutral-500 border-white/10">HW EQ: IFrame</span>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="flex-1 overflow-y-auto p-5" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* LEFT: Parametric EQ */}
            <div className="flex flex-col gap-5 min-w-0">
              {/* Frequency Response Curve */}
              <div className="liquid-glass-shell-strong relative h-40 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 z-10">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgb(var(--aura-primary-rgb))' }} />
                    <span className="font-semibold text-neutral-300">FREQUENCY RESPONSE</span>
                  </div>
                  <motion.button
                    whileHover={controlButtonHover}
                    whileTap={controlButtonTap}
                    onClick={toggleConcentricMode}
                    className="liquid-glass-pill px-2 py-0.5 text-[9px] font-medium text-neutral-300 transition-all"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${concentricMode ? 'bg-rose-500' : 'bg-neutral-500'}`} />
                    <span>Concentric</span>
                  </motion.button>
                </div>

                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="eq-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={`rgb(var(--aura-primary-rgb))`} stopOpacity="1" />
                      <stop offset="50%" stopColor={`rgb(var(--aura-primary-rgb))`} stopOpacity="0.6" />
                      <stop offset="100%" stopColor={`rgb(var(--aura-secondary-rgb))`} stopOpacity="0.3" />
                    </linearGradient>
                    <linearGradient id="eq-gradient-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={`rgb(var(--aura-primary-rgb))`} stopOpacity="0.4" />
                      <stop offset="100%" stopColor="rgba(5,5,7,0)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                  <line x1="0" y1="25" x2="500" y2="25" stroke="rgba(255,255,255,0.02)" />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="rgba(255,255,255,0.02)" />
                  <path d={curvePath} fill="url(#eq-gradient-fill)" stroke="url(#eq-gradient)" strokeWidth="2.5" strokeLinecap="round" className="filter drop-shadow-[0_0_8px_rgba(var(--aura-primary-rgb),0.6)]" />
                </svg>

                <div className="flex items-center justify-between text-[9px] font-mono text-neutral-600 z-10 pt-1">
                  <span>-24 dB</span><span>0 dB</span><span>+24 dB</span>
                </div>
              </div>

              {/* Presets */}
              <div className="flex flex-col gap-2">
                <div className="text-[10px] font-bold tracking-wider uppercase text-neutral-400 flex items-center justify-between">
                  <span>ACOUSTIC PRESETS ({activePreset.toUpperCase()})</span>
                  <span className="text-[10px] text-neutral-500 font-normal">Profile Matrix</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {PRESET_LIST.map((preset) => {
                    const isActive = activePreset === preset;
                    return (
                      <motion.button
                        key={preset}
                        whileHover={controlButtonHover}
                        whileTap={controlButtonTap}
                        onClick={() => setPreset(preset)}
                        className={`liquid-glass-pill px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                          isActive
                            ? 'bg-white/20 text-white border-white/30 shadow-[0_0_12px_rgba(var(--aura-primary-rgb),0.35)]'
                            : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/8'
                        }`}
                      >
                        {preset}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* 10-Band Parametric EQ Sliders */}
              <div className="liquid-glass-shell-strong flex flex-col gap-3 p-5">
                <div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  <div className="grid grid-cols-10 gap-2 min-w-[520px] items-end pb-3">
                    {parametricBands.map((band, idx) => (
                      <div key={idx} className="liquid-eq-fader flex flex-col items-center gap-2 select-none">
                        {/* Gain Readout */}
                        <span className={`text-[9px] font-mono tabular-nums ${band.gain !== 0 ? 'text-cyan-400' : 'text-neutral-500'}`}>
                          {band.gain > 0 ? `+${band.gain.toFixed(1)}` : band.gain === 0 ? '0.0' : band.gain.toFixed(1)}
                        </span>

                        {/* Gain Slider */}
                        <div className="relative w-5 h-36 flex items-center justify-center">
                          <input
                            type="range"
                            min="-24"
                            max="24"
                            step="0.5"
                            value={band.gain}
                            onChange={(e) => setParametricBandGain(idx, Number(e.target.value))}
                            aria-label={`Band ${BAND_LABELS[idx]} gain`}
                            className="liquid-slider"
                            style={{
                              transform: 'rotate(-90deg) translateX(-100%)',
                              transformOrigin: 'center center',
                              width: '100%',
                            }}
                          />
                          {/* Slider track visual */}
                          <div className="absolute inset-0 w-5" style={{
                            background: `linear-gradient(to top, #f43f5e 0%, rgba(244,63,94,0.2) 100%)`,
                            borderRadius: '9999px',
                            opacity: 0.3,
                          }} />
                        </div>

                        {/* Frequency & Controls */}
                        <div className="flex flex-col items-center gap-1.5 text-center">
                          <span className="text-[9px] font-semibold tracking-tight text-neutral-300">{BAND_LABELS[idx]} Hz</span>
                          <span className="text-[8px] text-neutral-500 font-mono">Q: {band.q.toFixed(1)}</span>

                          <div className="flex items-center gap-1">
                            <motion.button whileHover={controlButtonHover} whileTap={controlButtonTap} onClick={() => setParametricBandEnabled(idx, !band.enabled)} className={`liquid-glass-pill px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors ${band.enabled ? 'text-white bg-white/10 border-white/20' : 'text-neutral-500'}`} style={{ background: band.enabled ? 'rgba(244,63,94,0.1)' : 'transparent', border: band.enabled ? '1px solid rgba(244,63,94,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                              {band.enabled ? 'ON' : 'OFF'}
                            </motion.button>

                            <div className="flex flex-col items-center gap-0.5">
                              <motion.button whileHover={controlButtonHover} whileTap={controlButtonTap} onClick={() => setParametricBandFreq(idx, Math.max(20, band.freq - (idx < 3 ? 1 : idx < 6 ? 5 : idx < 8 ? 20 : 50)))} className="liquid-glass-pill p-0.5 rounded text-[8px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}><Minus className="w-3 h-3" /></motion.button>
                              <motion.button whileHover={controlButtonHover} whileTap={controlButtonTap} onClick={() => setParametricBandFreq(idx, Math.min(20000, band.freq + (idx < 3 ? 1 : idx < 6 ? 5 : idx < 8 ? 20 : 50)))} className="liquid-glass-pill p-0.5 rounded text-[8px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}><Plus className="w-3 h-3" /></motion.button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <span className="text-[10px] text-neutral-400">Parametric: freq / gain / Q / type</span>
                  <Info className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                </div>
              </div>
            </div>

            {/* RIGHT: Stereo Width, Playback Speed, Spatial, VU Meters, Diagnostics */}
            <div className="flex flex-col gap-5 min-w-0">
              {/* Stereo Width */}
              <div className="liquid-glass-shell flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-neutral-300">
                  <div className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-cyan-400" /><span>STEREO WIDTH</span></div>
                  <span className="liquid-glass-pill px-2 py-0.5 text-white font-mono font-bold">{stereoWidth}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={stereoWidth}
                  onChange={(e) => setStereoWidth(Number(e.target.value))}
                  aria-label="Stereo Width"
                  className="liquid-slider w-full"
                  style={{ background: `linear-gradient(to right, rgba(255,255,255,0.08) 0%, #0ea5e9 50%, rgba(255,255,255,0.08) 100%)` }}
                />
                <div className="flex items-center justify-between text-[9px] text-neutral-500 font-mono mt-2">
                  <span>Mono (0%)</span><span>Center (100%)</span><span>Wide (200%)</span>
                </div>
              </div>

              {/* Playback Speed */}
              <div className="liquid-glass-shell flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-neutral-300">
                  <div className="flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5 text-rose-400" /><span>PLAYBACK SPEED</span></div>
                  <span className="liquid-glass-pill px-2 py-0.5 text-white font-mono font-bold bg-white/10 border-white/10 rounded-md">{playbackSpeed}x</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                  {SPEED_OPTIONS.map((speed) => {
                    const isActive = playbackSpeed === speed;
                    return (
                      <motion.button
                        key={speed}
                        whileHover={controlButtonHover}
                        whileTap={controlButtonTap}
                        onClick={() => handleSpeedChange(speed)}
                        className={`liquid-glass-pill py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive ? 'bg-rose-600 text-white border-rose-500 shadow-sm' : 'bg-white/5 text-neutral-300 border-white/10'
                        }`}
                      >
                        {speed}x
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Spatial Audio */}
              <div className="liquid-glass-shell flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-neutral-300">
                  <div className="flex items-center gap-1.5"><Headphones className="w-3.5 h-3.5 text-cyan-400" /><span>SPATIAL AUDIO</span></div>
                  <motion.button
                    whileHover={controlButtonHover}
                    whileTap={controlButtonTap}
                    onClick={toggleSpatialAudio}
                    className={`liquid-glass-pill px-2.5 py-0.5 text-[10px] font-bold uppercase transition-all ${
                      spatialAudio
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-white/10 text-neutral-400 border-white/10'
                    }`}
                  >
                    {spatialAudio ? 'Enabled' : 'Disabled'}
                  </motion.button>
                </div>
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="liquid-glass-interactive p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="text-neutral-300">Spatial Visual Environment</span>
                    <span className="text-[10px] font-mono text-emerald-400">{spatialAudio ? 'Active (Dynamic)' : 'Off'}</span>
                  </div>
                  <div className="liquid-glass-interactive p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="text-neutral-400">Binaural / Multi-Channel DSP</span>
                    <span className="text-[10px] font-mono text-neutral-500">Unavailable (IFrame)</span>
                  </div>
                </div>
              </div>

              {/* VU Meters */}
              <div className="liquid-glass-shell-strong flex flex-col gap-3 p-5">
                <div className="text-[10px] font-bold tracking-wider uppercase text-neutral-400 mb-2">VU METERS</div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'INPUT L', value: vuMeterData.inputL, peak: vuMeterData.peakL, color: '#0ea5e9' },
                    { label: 'INPUT R', value: vuMeterData.inputR, peak: vuMeterData.peakR, color: '#0ea5e9' },
                    { label: 'OUTPUT L', value: vuMeterData.outputL, peak: vuMeterData.peakL, color: '#f43f5e' },
                    { label: 'OUTPUT R', value: vuMeterData.outputR, peak: vuMeterData.peakR, color: '#f43f5e' },
                  ].map((meter, idx) => (
                    <div key={idx} className="liquid-glass-interactive flex flex-col items-center gap-2 p-3" style={{ background: 'rgba(5,5,7,0.6)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px' }}>
                      <span className="text-[9px] font-mono text-neutral-400">{meter.label}</span>
                      <div className="relative w-8 h-28" style={{ transform: 'rotate(-90deg)' }}>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-full rounded-full bg-white/10" />
                        <motion.div
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 rounded-full"
                          style={{
                            background: `linear-gradient(to top, ${meter.color} 0%, ${meter.color}80 100%)`,
                            height: `${meter.value * 100}%`,
                            borderRadius: '9999px',
                            boxShadow: `0 0 12px ${meter.color}`,
                          }}
                          animate={{ height: `${meter.value * 100}%` }}
                          transition={{ duration: 50, ease: 'linear' }}
                        />
                        {/* Peak hold */}
                        <div className="absolute left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-white" style={{ bottom: `${meter.peak * 100}%` }} />
                      </div>
                      <span className="text-[9px] font-mono tabular-nums text-neutral-400">{(meter.value * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Provider Diagnostics */}
              <div className="liquid-glass-shell-strong flex flex-col gap-3 p-5" style={{ background: 'rgba(5,5,7,0.6)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '20px' }}>
                <div className="text-[10px] font-bold tracking-wider uppercase text-neutral-400">STREAM DIAGNOSTICS</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div><span className="text-neutral-500 text-[9px]">PROVIDER</span><div className="text-neutral-200">YouTube IFrame</div></div>
                  <div><span className="text-neutral-500 text-[9px]">CODEC</span><div className="text-neutral-200">Opus/AAC</div></div>
                  <div><span className="text-neutral-500 text-[9px]">MAX BITRATE</span><div className="text-neutral-200">256 kbps</div></div>
                  <div><span className="text-neutral-500 text-[9px]">DSP ROUTING</span><div className="text-amber-400/90">Isolated</div></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};