import React, { useEffect, useState } from 'react';
import { X, Mic2, AlertCircle, Info } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSyncedLyrics } from '@/hooks/useSyncedLyrics';
import { api } from '@/api/client';
import { LyricsResponse } from '@/types/music';
import { formatTime } from '@/lib/utils';
import { getLineDirection, getLineFontClass } from '@/utils/unicodeScript';
import { LyricsCalibrationToolbar } from './LyricsCalibrationToolbar';
import { LyricsSyncDiagnostics } from './LyricsSyncDiagnostics';
import { SyncedLineWords } from './SyncedLineWords';

export const LyricsPanel: React.FC = () => {
  const { isLyricsOpen, toggleLyrics, currentTrack, currentTime, isPlaying, seek } = usePlayerStore();
  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  // Hook into real player time and synchronized lyric lines
  const {
    activeLineIndex,
    seekToLine,
    containerRef,
    setLineRef,
    lyricsOffsetMs,
    adjustLyricsOffsetMs,
    resetLyricsOffset,
    highResTimeMs,
    effectiveTimeMs,
    currentLineTimestamp,
    activeLyricText,
    provider,
    syncConfidence,
    durationDifference,
  } = useSyncedLyrics({
    lyrics: lyricsData,
    currentTime,
    isPlaying,
  });

  // Global shortcut to toggle Developer Diagnostics (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setIsDiagnosticsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch lyrics with cancellation on song change
  useEffect(() => {
    if (!isLyricsOpen || !currentTrack) return;

    const controller = new AbortController();
    setIsLoading(true);
    setLyricsData(null);

    api
      .getLyrics(currentTrack.videoId)
      .then((data) => {
        if (!controller.signal.aborted) {
          setLyricsData(data);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.warn('Lyrics fetch failed:', err);
          setLyricsData({
            videoId: currentTrack.videoId,
            synced: false,
            hasLyrics: false,
            lines: [],
          });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [isLyricsOpen, currentTrack?.videoId]);

  if (!isLyricsOpen) return null;

  return (
    <aside
      aria-label="Song Lyrics"
      className="fixed top-0 right-0 bottom-24 md:bottom-28 w-80 md:w-96 z-40 glass-elevated border-l border-white/[0.08] p-6 flex flex-col animate-in slide-in-from-right duration-200"
    >
      {/* Diagnostics HUD Overlay */}
      {isDiagnosticsOpen && (
        <LyricsSyncDiagnostics
          highResTimeMs={highResTimeMs}
          effectiveTimeMs={effectiveTimeMs}
          currentLineTimestamp={currentLineTimestamp}
          activeLineIndex={activeLineIndex}
          activeLyricText={activeLyricText}
          lyricsOffsetMs={lyricsOffsetMs}
          provider={provider}
          syncConfidence={syncConfidence}
          durationDifference={durationDifference}
          onClose={() => setIsDiagnosticsOpen(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Mic2 className="w-5 h-5 text-neutral-300" />
          <h2 className="font-bold text-white text-base">Lyrics</h2>
          {lyricsData?.synced && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-white border border-white/20">
              Synced
            </span>
          )}
        </div>
        <button
          onClick={toggleLyrics}
          aria-label="Close Lyrics"
          className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Calibration Toolbar (when lyrics are present) */}
      {lyricsData?.hasLyrics && lyricsData.synced && (
        <div className="pt-2 border-b border-white/5 pb-2">
          <LyricsCalibrationToolbar
            isOpen={isCalibrationOpen}
            onToggleOpen={() => setIsCalibrationOpen((prev) => !prev)}
            lyricsOffsetMs={lyricsOffsetMs}
            onAdjustOffset={adjustLyricsOffsetMs}
            onResetOffset={resetLyricsOffset}
            isDiagnosticsOpen={isDiagnosticsOpen}
            onToggleDiagnostics={() => setIsDiagnosticsOpen((prev) => !prev)}
            syncConfidence={syncConfidence}
          />
        </div>
      )}

      {/* Lyrics Scroll Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto pt-4 pr-2 scroll-smooth select-text"
      >
        {isLoading ? (
          <div className="flex flex-col gap-4 animate-pulse pt-2">
            <div className="h-6 w-3/4 bg-white/10 rounded shimmer" />
            <div className="h-6 w-1/2 bg-white/10 rounded shimmer" />
            <div className="h-6 w-2/3 bg-white/10 rounded shimmer" />
            <div className="h-6 w-4/5 bg-white/10 rounded shimmer" />
            <div className="h-6 w-3/5 bg-white/10 rounded shimmer" />
            <div className="h-6 w-1/2 bg-white/10 rounded shimmer" />
          </div>
        ) : lyricsData?.hasLyrics ? (
          <div className="flex flex-col gap-3 pb-20">
            {/* Fallback notification when lyrics are static */}
            {!lyricsData.synced && (
              <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-neutral-400">
                <Info className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>Synced lyrics aren't available for this song.</span>
              </div>
            )}

            {/* Render lines */}
            {lyricsData.lines.map((line, idx) => {
              const lineDir = getLineDirection(line.text, line.direction);
              const fontClass = getLineFontClass(line.text, line.script);

              if (lyricsData.synced) {
                const isActive = idx === activeLineIndex;
                const distance = Math.abs(idx - activeLineIndex);
                const isNearby = distance <= 2;

                return (
                  <div
                    key={line.id}
                    ref={(el) => setLineRef(idx, el)}
                    onClick={() => seekToLine(idx)}
                    dir={lineDir}
                    aria-current={isActive ? 'true' : undefined}
                    className={`group cursor-pointer rounded-xl py-2 px-3 transition-all duration-300 ${fontClass} ${
                      lineDir === 'rtl' ? 'lyric-line-rtl text-right' : 'lyric-line-ltr text-left'
                    } ${
                      isActive
                        ? 'lyric-line-active text-lg sm:text-xl font-extrabold'
                        : isNearby
                        ? 'lyric-line-nearby text-sm font-medium hover:opacity-90'
                        : 'lyric-line-distant text-xs sm:text-sm font-normal hover:opacity-75'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between gap-3 ${
                        lineDir === 'rtl' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <SyncedLineWords
                          line={line}
                          nextLineStartTime={lyricsData.lines[idx + 1]?.startTime}
                          currentTimeMs={effectiveTimeMs}
                          isActive={isActive}
                          size="sm"
                          dir={lineDir}
                          onSeekToWord={seek}
                        />
                      </div>
                      {line.startTime !== undefined && (
                        <span className="text-[10px] font-mono text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {formatTime(line.startTime / 1000)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              // Plain static line
              return (
                <div
                  key={line.id}
                  dir={lineDir}
                  className={`text-neutral-200 text-sm md:text-base leading-relaxed py-1.5 ${fontClass} ${
                    lineDir === 'rtl' ? 'lyric-line-rtl text-right' : 'lyric-line-ltr text-left'
                  }`}
                >
                  {line.text}
                </div>
              );
            })}

            {lyricsData.source && (
              <div className="text-xs text-neutral-500 pt-6 mt-4 border-t border-white/10">
                {lyricsData.source}
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-neutral-400">
            {currentTrack?.thumbnail && (
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-20 h-20 rounded-2xl object-cover mb-4 shadow-xl border border-white/10 opacity-75"
              />
            )}
            <AlertCircle className="w-8 h-8 text-neutral-500 mb-2" />
            <p className="font-semibold text-neutral-200 text-sm">Lyrics unavailable</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-[200px]">
              No lyrics could be found for "{currentTrack?.title}".
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
