import React from 'react';
import { SlidersHorizontal, RotateCcw, Activity, AlertTriangle } from 'lucide-react';

export interface LyricsCalibrationToolbarProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  lyricsOffsetMs: number;
  onAdjustOffset: (delta: number) => void;
  onResetOffset: () => void;
  isDiagnosticsOpen: boolean;
  onToggleDiagnostics: () => void;
  syncConfidence?: 'excellent' | 'good' | 'uncertain' | 'poor' | null;
}

export const LyricsCalibrationToolbar: React.FC<LyricsCalibrationToolbarProps> = ({
  isOpen,
  onToggleOpen,
  lyricsOffsetMs,
  onAdjustOffset,
  onResetOffset,
  isDiagnosticsOpen,
  onToggleDiagnostics,
  syncConfidence,
}) => {
  return (
    <div className="flex flex-col gap-2 shrink-0">
      {/* Warning banner for potentially mismatched recording */}
      {syncConfidence === 'poor' && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>These lyrics may be for a different version of this recording.</span>
        </div>
      )}

      {/* Toggle button row */}
      <div className="flex items-center justify-between py-1">
        <button
          onClick={onToggleOpen}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            isOpen || lyricsOffsetMs !== 0
              ? 'bg-white/20 text-white border border-white/30'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{lyricsOffsetMs !== 0 ? `Sync: ${lyricsOffsetMs >= 0 ? '+' : ''}${lyricsOffsetMs}ms` : 'Adjust Sync'}</span>
        </button>

        <button
          onClick={onToggleDiagnostics}
          title="Toggle Sync Diagnostics HUD"
          className={`p-1.5 rounded-lg text-xs transition-colors ${
            isDiagnosticsOpen
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Calibration Controls Drawer */}
      {isOpen && (
        <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col gap-2.5 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-400">
              Offset:{' '}
              <span className="font-bold text-white font-mono">
                {lyricsOffsetMs > 0
                  ? `+${lyricsOffsetMs}ms (Lyrics earlier)`
                  : lyricsOffsetMs < 0
                  ? `${lyricsOffsetMs}ms (Lyrics later)`
                  : '0ms (Original alignment)'}
              </span>
            </span>
            {lyricsOffsetMs !== 0 && (
              <button
                onClick={onResetOffset}
                className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-red-300 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-6 gap-1.5 font-mono text-[11px]">
            <button
              onClick={() => onAdjustOffset(-500)}
              className="py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/5 transition-colors"
            >
              -500
            </button>
            <button
              onClick={() => onAdjustOffset(-100)}
              className="py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/5 transition-colors"
            >
              -100
            </button>
            <button
              onClick={() => onAdjustOffset(-50)}
              className="py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/5 transition-colors"
            >
              -50
            </button>
            <button
              onClick={() => onAdjustOffset(50)}
              className="py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/5 transition-colors"
            >
              +50
            </button>
            <button
              onClick={() => onAdjustOffset(100)}
              className="py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/5 transition-colors"
            >
              +100
            </button>
            <button
              onClick={() => onAdjustOffset(500)}
              className="py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/5 transition-colors"
            >
              +500
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
