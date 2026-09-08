import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SlidersHorizontal,
  RotateCcw,
  X,
  Radio,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  useEqualizerStore,
  EqualizerPreset,
  EqualizerBands,
} from '@/stores/useEqualizerStore';
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

const BANDS_CONFIG: { key: keyof EqualizerBands; label: string; isPreamp?: boolean }[] = [
  { key: 'preamp', label: 'PREAMP', isPreamp: true },
  { key: 'b32', label: '32' },
  { key: 'b64', label: '64' },
  { key: 'b125', label: '125' },
  { key: 'b250', label: '250' },
  { key: 'b500', label: '500' },
  { key: 'b1k', label: '1k' },
  { key: 'b2k', label: '2k' },
  { key: 'b4k', label: '4k' },
  { key: 'b8k', label: '8k' },
  { key: 'b16k', label: '16k' },
];

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

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
    concentricMode,
    toggleConcentricMode,
    resetAll,
  } = useEqualizerStore();

  // Generate SVG curve path for the equalizer response visualization
  const curvePath = useMemo(() => {
    const points: [number, number][] = [
      [20, 45 - bands.b32 * 2.2],
      [65, 45 - bands.b64 * 2.2],
      [110, 45 - bands.b125 * 2.2],
      [155, 45 - bands.b250 * 2.2],
      [200, 45 - bands.b500 * 2.2],
      [245, 45 - bands.b1k * 2.2],
      [290, 45 - bands.b2k * 2.2],
      [335, 45 - bands.b4k * 2.2],
      [380, 45 - bands.b8k * 2.2],
      [425, 45 - bands.b16k * 2.2],
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
    if (defaultPlaybackEngine && typeof (defaultPlaybackEngine as any).setPlaybackRate === 'function') {
      (defaultPlaybackEngine as any).setPlaybackRate(speed);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        variants={modalBackdropVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      >
        <motion.div
          variants={modalSurfaceVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="relative w-full max-w-[580px] bg-[#12151c]/95 border border-white/[0.09] rounded-[28px] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.85)] flex flex-col gap-5 text-white font-sans overflow-hidden select-none"
        >
          {/* ==================================================================
              HEADER: Icon, Title, DSP Badge, Subtitle & Actions
              ================================================================== */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.08] border border-white/10 flex items-center justify-center shadow-inner">
                <SlidersHorizontal className="w-5 h-5 text-rose-500" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    10-Band Graphic Pro Equalizer
                  </h2>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold tracking-wider">
                    3D DSP
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Studio Sound DSP & Stereo Acoustic Profiling
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={resetAll}
                aria-label="Reset Equalizer"
                title="Reset to Flat"
                className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close Equalizer"
                title="Close"
                className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ==================================================================
              GRAPH VISUALIZATION AREA: Dark Inset Waveform Card
              ================================================================== */}
          <div className="relative w-full h-24 rounded-2xl bg-[#090b0f] border border-white/[0.06] overflow-hidden p-3 flex flex-col justify-between">
            <svg
              className="w-full h-full"
              viewBox="0 0 445 90"
              preserveAspectRatio="none"
            >
              {/* Subtle Grid Lines */}
              <line x1="0" y1="45" x2="445" y2="45" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <line x1="0" y1="22" x2="445" y2="22" stroke="rgba(255,255,255,0.03)" />
              <line x1="0" y1="68" x2="445" y2="68" stroke="rgba(255,255,255,0.03)" />

              {/* Glowing Red Response Curve */}
              <path
                d={curvePath}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="filter drop-shadow-[0_0_8px_rgba(244,63,94,0.7)] transition-all duration-150"
              />
            </svg>

            {/* Concentric Mode Toggle Pill */}
            <button
              onClick={toggleConcentricMode}
              className="absolute bottom-2.5 right-3 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/10 border border-white/10 text-[10px] font-medium text-neutral-300 flex items-center gap-1.5 transition-colors"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${concentricMode ? 'bg-rose-500' : 'bg-neutral-500'}`} />
              <span>Concentric</span>
            </button>
          </div>

          {/* ==================================================================
              ACOUSTIC PRESETS HORIZONTAL PILLS
              ================================================================== */}
          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-bold tracking-wider uppercase text-neutral-400">
              ACOUSTIC PRESETS ({activePreset.toUpperCase()})
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {PRESET_LIST.map((preset) => {
                const isActive = activePreset === preset;
                return (
                  <button
                    key={preset}
                    onClick={() => setPreset(preset)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 ${
                      isActive
                        ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(225,29,72,0.4)] border border-rose-500'
                        : 'bg-white/[0.05] hover:bg-white/[0.09] text-neutral-300 border border-white/[0.08]'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ==================================================================
              10-BAND VERTICAL SLIDERS (11 Channels: Preamp + 10 Frequencies)
              ================================================================== */}
          <div className="grid grid-cols-11 gap-1.5 sm:gap-2 pt-2 items-end">
            {BANDS_CONFIG.map(({ key, label, isPreamp }) => {
              const val = bands[key];
              const normalizedHeight = ((val + 12) / 24) * 100; // 0% to 100%

              return (
                <div key={key} className="flex flex-col items-center gap-2 select-none">
                  {/* dB Value Label on Top */}
                  <span
                    className={`text-[10px] font-mono tabular-nums ${
                      isPreamp ? 'text-rose-400 font-bold' : val !== 0 ? 'text-cyan-400' : 'text-neutral-500'
                    }`}
                  >
                    {val > 0 ? `+${val.toFixed(0)}` : val === 0 ? '0' : val.toFixed(0)}
                  </span>

                  {/* Vertical Slider Track Container */}
                  <div className="relative w-4 h-32 flex items-center justify-center">
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.5"
                      value={val}
                      onChange={(e) => setBand(key, Number(e.target.value))}
                      aria-label={`${label} Equalizer Band`}
                      className={`eq-vertical-slider ${isPreamp ? 'eq-slider-preamp' : 'eq-slider-band'}`}
                    />
                  </div>

                  {/* Frequency Label Below */}
                  <span
                    className={`text-[10px] font-medium tracking-tight truncate max-w-full text-center ${
                      isPreamp ? 'text-rose-500 font-bold' : 'text-neutral-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ==================================================================
              FOOTER: Stereo Balance & Playback Speed Controls
              ================================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/[0.06] items-center">
            {/* Stereo Balance */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                <span>STEREO BALANCE</span>
                <span className="text-white font-mono">
                  {stereoBalance === 0
                    ? 'Center'
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
                onChange={(e) => setStereoBalance(Number(e.target.value))}
                aria-label="Stereo Balance"
                className="scrubber-slider-aapesh w-full"
                style={{
                  background: `linear-gradient(to right, rgba(255,255,255,0.1) 0%, #38bdf8 50%, rgba(255,255,255,0.1) 100%)`,
                }}
              />
              <div className="flex items-center justify-between text-[9px] text-neutral-500 font-mono">
                <span>Left</span>
                <span>Center</span>
                <span>Right</span>
              </div>
            </div>

            {/* Playback Speed */}
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                PLAYBACK SPEED ({playbackSpeed}X)
              </div>
              <div className="flex items-center gap-1">
                {SPEED_OPTIONS.map((speed) => {
                  const isActive = playbackSpeed === speed;
                  return (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-rose-600/30 text-rose-300 border border-rose-500/60 shadow-sm'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      {speed}x
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
