import React, { useEffect, useState, useCallback } from 'react';
import { X, Mic2, AlertCircle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSyncedLyrics } from '@/hooks/useSyncedLyrics';
import { api } from '@/api/client';
import { LyricsResponse } from '@/types/music';
import { formatTime } from '@/lib/utils';
import { getLineDirection, getLineFontClass } from '@/utils/unicodeScript';
import { drawerPanelVariants, controlButtonHover, controlButtonTap, transitionSmooth } from '@/lib/motion';
import { LyricsCalibrationToolbar } from './LyricsCalibrationToolbar';
import { LyricsSyncDiagnostics } from './LyricsSyncDiagnostics';
import { SyncedLineWords } from './SyncedLineWords';

export const LyricsPanel: React.FC = () => {
  const { isLyricsOpen, toggleLyrics, currentTrack, currentTime, isPlaying, seek } = usePlayerStore();
  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const [translationMode, setTranslationMode] = useState<'original' | 'dual' | 'translation'>('original');
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  // Hook into real player time and synchronized lyric lines
  const {
    activeLineIndex,
    lineProgress,
    seekToLine,
    containerRef,
    setLineRef,
    isAutoFollowPaused,
    resumeAutoFollow,
    handleUserScroll,
    lyricsOffsetMs,
    adjustLyricsOffsetMs,
    resetLyricsOffset,
    highResTimeMs,
    effectiveTimeMs,
    currentLineTimestamp,
    activeLyricText,
    activeWordText,
    activeWordProgress,
    activeCharProgress,
    timingLevel,
    isWordEstimated,
    provider,
    syncConfidence,
    durationDifference,
  } = useSyncedLyrics({
    lyrics: lyricsData,
    currentTime,
    isPlaying,
    isActive: isLyricsOpen,
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
  const fetchLyrics = useCallback((videoId: string) => {
    const controller = new AbortController();
    setIsLoading(true);
    setLyricsError(null);
    setLyricsData(null);

    api
      .getLyrics(videoId)
      .then((data) => {
        if (!controller.signal.aborted) {
          setLyricsData(data);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.warn('Lyrics fetch failed:', err);
          setLyricsError('Failed to load lyrics');
          setLyricsData({
            videoId,
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

    return controller;
  }, []);

  useEffect(() => {
    if (!isLyricsOpen || !currentTrack) return;
    const controller = fetchLyrics(currentTrack.videoId);
    return () => {
      controller.abort();
    };
  }, [isLyricsOpen, currentTrack?.videoId, fetchLyrics]);

  if (!isLyricsOpen) return null;

  const hasTranslations = Boolean(lyricsData?.lines?.some((l) => Boolean(l.translation)));

  return (
    <motion.aside
      variants={drawerPanelVariants}
      initial="closed"
      animate="open"
      exit="exit"
      aria-label="Song Lyrics"
      className="fixed top-0 right-0 bottom-24 md:bottom-28 w-80 md:w-96 z-40 glass-elevated border-l border-white/[0.08] p-5 md:p-6 flex flex-col shadow-2xl"
    >
      {/* Diagnostics HUD Overlay */}
      {isDiagnosticsOpen && (
        <LyricsSyncDiagnostics
          highResTimeMs={highResTimeMs}
          effectiveTimeMs={effectiveTimeMs}
          currentLineTimestamp={currentLineTimestamp}
          activeLineIndex={activeLineIndex}
          activeLyricText={activeLyricText}
          activeWordText={activeWordText}
          activeWordProgress={activeWordProgress}
          activeCharProgress={activeCharProgress}
          timingLevel={timingLevel}
          isWordEstimated={isWordEstimated}
          lyricsOffsetMs={lyricsOffsetMs}
          provider={provider}
          syncConfidence={syncConfidence}
          durationDifference={durationDifference}
          onClose={() => setIsDiagnosticsOpen(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Mic2 className="w-4.5 h-4.5 text-neutral-300 shrink-0" />
          <h2 className="font-bold text-white text-base truncate">Lyrics</h2>
          {lyricsData?.synced ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/20 flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>{lyricsOffsetMs !== 0 ? `Sync: ${lyricsOffsetMs >= 0 ? '+' : ''}${lyricsOffsetMs}ms` : 'Synced'}</span>
            </span>
          ) : lyricsData?.hasLyrics ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-neutral-400 border border-white/10 shrink-0">
              Plain Text
            </span>
          ) : null}
        </div>
        <motion.button
          whileHover={controlButtonHover}
          whileTap={controlButtonTap}
          onClick={toggleLyrics}
          aria-label="Close Lyrics"
          className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Optional Translation Mode Selector */}
      {hasTranslations && (
        <div className="pt-2 pb-1 flex items-center justify-center">
          <div className="flex items-center p-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px]">
            <button
              onClick={() => setTranslationMode('original')}
              className={`px-2 py-0.5 rounded-full transition-all ${
                translationMode === 'original'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Original
            </button>
            <button
              onClick={() => setTranslationMode('dual')}
              className={`px-2 py-0.5 rounded-full transition-all ${
                translationMode === 'dual'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Dual
            </button>
            <button
              onClick={() => setTranslationMode('translation')}
              className={`px-2 py-0.5 rounded-full transition-all ${
                translationMode === 'translation'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Translation
            </button>
          </div>
        </div>
      )}

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

      {/* Return to Current Lyric Floating Pill */}
      <AnimatePresence>
        {isAutoFollowPaused && lyricsData?.synced && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="pt-2 flex justify-center z-10"
          >
            <button
              onClick={resumeAutoFollow}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10131b]/95 backdrop-blur-2xl border border-white/20 text-[11px] font-bold text-white shadow-xl hover:bg-white/[0.15] active:scale-95 transition-all"
            >
              <RotateCcw className="w-3 h-3 text-neutral-300" />
              <span>Follow Current Line</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lyrics Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleUserScroll}
        className="flex-1 overflow-y-auto pt-4 pr-2 scroll-smooth select-text"
      >
        {isLoading ? (
          <div className="flex flex-col gap-4 animate-pulse pt-2">
            <div className="h-6 w-3/4 bg-white/[0.08] rounded-xl" />
            <div className="h-8 w-full bg-white/[0.12] rounded-xl" />
            <div className="h-6 w-2/3 bg-white/[0.08] rounded-xl" />
            <div className="h-5 w-4/5 bg-white/[0.06] rounded-xl" />
            <div className="h-5 w-3/5 bg-white/[0.06] rounded-xl" />
            <div className="h-5 w-1/2 bg-white/[0.04] rounded-xl" />
          </div>
        ) : lyricsError ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-neutral-400 gap-2">
            <AlertCircle className="w-8 h-8 text-neutral-500" />
            <p className="font-semibold text-neutral-200 text-sm">Couldn't load lyrics</p>
            <button
              onClick={() => currentTrack && fetchLyrics(currentTrack.videoId)}
              className="mt-2 px-3.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        ) : lyricsData?.hasLyrics ? (
          <div className="flex flex-col gap-3 pb-20">
            {lyricsData.lines.map((line, idx) => {
              const lineDir = getLineDirection(line.text, line.direction);
              const fontClass = getLineFontClass(line.text, line.script);

              if (lyricsData.synced) {
                const isActive = idx === activeLineIndex;
                const distance = Math.abs(idx - activeLineIndex);
                const isNearby = distance <= 2;

                return (
                  <motion.div
                    key={line.id || idx}
                    ref={(el) => setLineRef(idx, el)}
                    onClick={() => seekToLine(idx)}
                    dir={lineDir}
                    aria-current={isActive ? 'true' : undefined}
                    animate={{
                      opacity: isActive ? 1 : isNearby ? 0.65 : 0.35,
                    }}
                    transition={transitionSmooth}
                    className={`group cursor-pointer rounded-xl py-2 px-3 transition-colors duration-200 ${fontClass} ${
                      lineDir === 'rtl' ? 'lyric-line-rtl text-right' : 'lyric-line-ltr text-left'
                    } ${
                      isActive
                        ? 'lyric-line-active text-lg sm:text-xl font-bold'
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
                          translationMode={translationMode}
                          onSeekToWord={seek}
                        />
                      </div>
                      {line.startTime !== undefined && (
                        <span className="text-[10px] font-mono text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {formatTime(line.startTime / 1000)}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              }

              // Plain static line
              return (
                <div
                  key={line.id || idx}
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
    </motion.aside>
  );
};
