import React from 'react';
import { Activity, X, AlertTriangle, CheckCircle2, Info, Mic } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { LyricTimingLevel } from '@/types/music';

export interface LyricsSyncDiagnosticsProps {
  highResTimeMs: number;
  effectiveTimeMs: number;
  currentLineTimestamp: number | null;
  activeLineIndex: number;
  activeLyricText: string | null;
  activeWordText?: string | null;
  activeWordProgress?: number;
  activeCharProgress?: string | null;
  timingLevel?: LyricTimingLevel;
  isWordEstimated?: boolean;
  lyricsOffsetMs: number;
  provider: string | null;
  syncConfidence: 'excellent' | 'good' | 'uncertain' | 'poor' | null;
  durationDifference: number | null;
  onClose: () => void;
}

export const LyricsSyncDiagnostics: React.FC<LyricsSyncDiagnosticsProps> = ({
  highResTimeMs,
  effectiveTimeMs,
  currentLineTimestamp,
  activeLineIndex,
  activeLyricText,
  activeWordText,
  activeWordProgress = 0,
  activeCharProgress,
  timingLevel = 'line',
  isWordEstimated = false,
  lyricsOffsetMs,
  provider,
  syncConfidence,
  durationDifference,
  onClose,
}) => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playerDuration = usePlayerStore((s) => s.duration);

  // Instant calculated delta between player audio time and lyric timestamp
  const realTimeDeltaMs =
    currentLineTimestamp !== null ? highResTimeMs - currentLineTimestamp : null;

  const formatMs = (ms: number) => {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(2);
    return `${minutes.toString().padStart(2, '0')}:${seconds.padStart(5, '0')}`;
  };

  const confidenceBadge = () => {
    switch (syncConfidence) {
      case 'excellent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Excellent Alignment
          </span>
        );
      case 'good':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
            <CheckCircle2 className="w-3 h-3" /> Good Match
          </span>
        );
      case 'uncertain':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Info className="w-3 h-3" /> Potential Drift ({durationDifference ?? 0}s delta)
          </span>
        );
      case 'poor':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
            <AlertTriangle className="w-3 h-3" /> Version Mismatch Risk ({durationDifference ?? 0}s delta)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-500/20 text-neutral-300">
            Unverified
          </span>
        );
    }
  };

  return (
    <div className="absolute top-16 right-4 z-50 w-80 md:w-96 rounded-2xl bg-charcoal-900/95 backdrop-blur-xl border border-white/20 p-4 shadow-2xl text-xs font-mono text-neutral-200 select-text animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2 font-sans font-bold text-white text-sm">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Sync Diagnostics HUD</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2.5">
        <div>
          <span className="text-neutral-500 block text-[10px] uppercase tracking-wider">Track</span>
          <span className="font-semibold text-white truncate block">
            {currentTrack?.title} ({currentTrack?.videoId})
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-neutral-500 block text-[10px] uppercase tracking-wider">Provider</span>
            <span className="font-semibold text-neutral-200 capitalize">
              {provider || 'Unknown'}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block text-[10px] uppercase tracking-wider text-right">Status</span>
            {confidenceBadge()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5">
          <div>
            <span className="text-neutral-500 text-[10px] block">Player Time</span>
            <span className="font-bold text-white text-sm">{formatMs(highResTimeMs)}</span>
          </div>
          <div>
            <span className="text-neutral-500 text-[10px] block">Lyric Timestamp</span>
            <span className="font-bold text-white text-sm">
              {currentLineTimestamp !== null ? formatMs(currentLineTimestamp) : '--:--.--'}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 text-[10px] block">Audio Delta</span>
            <span
              className={`font-semibold ${
                realTimeDeltaMs === null
                  ? 'text-neutral-500'
                  : Math.abs(realTimeDeltaMs) < 300
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {realTimeDeltaMs !== null ? `${realTimeDeltaMs >= 0 ? '+' : ''}${realTimeDeltaMs}ms` : '--'}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 text-[10px] block">Calibrated Offset</span>
            <span
              className={`font-semibold ${
                lyricsOffsetMs === 0
                  ? 'text-neutral-400'
                  : lyricsOffsetMs > 0
                  ? 'text-emerald-400'
                  : 'text-blue-400'
              }`}
            >
              {lyricsOffsetMs >= 0 ? `+${lyricsOffsetMs}` : lyricsOffsetMs}ms
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500 text-[10px] uppercase">Timing Level</span>
            <span className="font-bold text-white uppercase text-[11px] px-1.5 py-0.5 rounded bg-white/10">
              {timingLevel === 'character'
                ? 'Character (Exact)'
                : timingLevel === 'word'
                ? 'Word (Exact)'
                : timingLevel === 'estimated-word'
                ? 'Word (Phonetic Estimated)'
                : timingLevel === 'line'
                ? 'Line Sync'
                : 'None'}
            </span>
          </div>

          {activeWordText && (
            <div className="pt-1 border-t border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 text-[10px]">Active Word:</span>
                <span className="font-bold text-white text-xs">"{activeWordText}"</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 text-[10px]">Word Progress:</span>
                <span className="font-bold text-emerald-400 text-xs">
                  {Math.round(activeWordProgress * 100)}%
                </span>
              </div>
              {activeCharProgress && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 text-[10px]">Char Progress:</span>
                  <span className="font-bold text-neutral-300 text-xs">{activeCharProgress}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <span className="text-neutral-500 block text-[10px] uppercase tracking-wider">
            Active Line [{activeLineIndex}]
          </span>
          <p className="font-sans text-neutral-300 italic truncate bg-white/5 p-1.5 rounded-lg text-xs mt-1">
            "{activeLyricText || 'Instrumental / Silence'}"
          </p>
        </div>

        {durationDifference !== null && (
          <div className="flex items-center justify-between text-[11px] pt-1 text-neutral-400 border-t border-white/10">
            <span>Duration Difference:</span>
            <span className="font-bold text-neutral-200">{durationDifference}s</span>
          </div>
        )}
      </div>
    </div>
  );
};
