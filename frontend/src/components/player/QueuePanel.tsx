import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Infinity as InfinityIcon,
  Shuffle,
  Repeat,
  Repeat1,
  Play,
  Pause,
  ListPlus,
  ArrowUpToLine,
  GripVertical,
  Info,
  Heart,
  Music2,
  Compass,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { ArtworkImage } from '@/components/common/ArtworkImage';
import { getArtworkUrl } from '@/utils/artwork';
import { Track } from '@/types/music';

// Helper to format remaining duration
function formatTotalDuration(tracks: Track[]): string {
  let totalSec = 0;
  for (const t of tracks) {
    if (t.duration_seconds) {
      totalSec += t.duration_seconds;
    } else if (t.duration && t.duration.includes(':')) {
      const parts = t.duration.split(':').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        totalSec += parts[0] * 60 + parts[1];
      } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        totalSec += parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    }
  }
  if (totalSec <= 0) return '';
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (hrs > 0) {
    return `${hrs} hr ${mins} min`;
  }
  return `${mins} min`;
}

// Memoized individual row for high performance
interface QueueRowProps {
  track: Track;
  actualIndex: number;
  relativeIndex: number;
  totalUpcoming: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnter: (e: React.DragEvent, index: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onPlay: (index: number) => void;
  onPlayNext: (actualIndex: number) => void;
  onMoveUp: (actualIndex: number) => void;
  onMoveDown: (actualIndex: number) => void;
  onRemove: (actualIndex: number) => void;
  onOpenAbout: (track: Track) => void;
}

const QueueTrackRow = memo<QueueRowProps>(
  ({
    track,
    actualIndex,
    relativeIndex,
    totalUpcoming,
    isDragging,
    isDragOver,
    onDragStart,
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDrop,
    onDragEnd,
    onPlay,
    onPlayNext,
    onMoveUp,
    onMoveDown,
    onRemove,
    onOpenAbout,
  }) => {
    const artworkUrl = getArtworkUrl(track) || track.thumbnail;
    const artistName = track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist';

    return (
      <div
        tabIndex={0}
        draggable
        onDragStart={(e) => onDragStart(e, actualIndex)}
        onDragOver={(e) => onDragOver(e, actualIndex)}
        onDragEnter={(e) => onDragEnter(e, actualIndex)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, actualIndex)}
        onDragEnd={onDragEnd}
        className={`group relative flex items-center justify-between gap-2.5 p-2 rounded-xl transition-all duration-150 ${
          isDragging
            ? 'opacity-40 scale-[0.98] bg-white/[0.04]'
            : isDragOver
            ? 'bg-white/[0.12] border-t-2 border-white shadow-lg'
            : 'hover:bg-white/[0.06] bg-white/[0.015] border border-transparent hover:border-white/[0.06]'
        }`}
      >
        {/* Drag Handle & Clickable Track Info */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Reorder Grip Handle */}
          <div
            title="Drag to reorder"
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-neutral-500 hover:text-neutral-200 transition-colors shrink-0"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          {/* Thumbnail with overlay play trigger */}
          <div
            onClick={() => onPlay(actualIndex)}
            className="relative w-9 h-9 rounded-lg overflow-hidden bg-neutral-900 border border-white/10 shrink-0 cursor-pointer group/art"
          >
            <ArtworkImage
              src={artworkUrl}
              alt={track.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/art:opacity-100 flex items-center justify-center transition-opacity">
              <Play className="w-3.5 h-3.5 text-white fill-current translate-x-0.5" />
            </div>
          </div>

          {/* Title & Artist */}
          <div
            onClick={() => onPlay(actualIndex)}
            className="min-w-0 flex-1 cursor-pointer"
          >
            <div className="text-xs font-semibold text-neutral-200 group-hover:text-white truncate">
              {track.title}
            </div>
            <div className="text-[11px] text-neutral-400 truncate">
              {artistName}
            </div>
          </div>
        </div>

        {/* Duration & Action Toolbar */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Duration timestamp */}
          {track.duration && (
            <span className="text-[11px] font-mono text-neutral-500 group-hover:hidden pr-1">
              {track.duration}
            </span>
          )}

          {/* Hover / Focus Actions */}
          <div className="queue-actions hidden group-hover:flex group-focus-within:flex items-center gap-0.5 animate-fade-in">
            {/* Play Next (Bump to top of upcoming) */}
            {relativeIndex > 0 && (
              <button
                onClick={() => onPlayNext(actualIndex)}
                title="Play Next"
                aria-label={`Play ${track.title} next`}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ArrowUpToLine className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Move Up */}
            {relativeIndex > 0 && (
              <button
                onClick={() => onMoveUp(actualIndex)}
                title="Move Up"
                aria-label={`Move ${track.title} up`}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Move Down */}
            {relativeIndex < totalUpcoming - 1 && (
              <button
                onClick={() => onMoveDown(actualIndex)}
                title="Move Down"
                aria-label={`Move ${track.title} down`}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            )}

            {/* About This Song */}
            <button
              onClick={() => onOpenAbout(track)}
              title="About This Song"
              aria-label={`About ${track.title}`}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            {/* Remove */}
            <button
              onClick={() => onRemove(actualIndex)}
              title="Remove from queue"
              aria-label={`Remove ${track.title} from queue`}
              className="p-1 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }
);
QueueTrackRow.displayName = 'QueueTrackRow';

// Reusable Queue Workstation Component
export const QueueWorkstationContent: React.FC<{
  onClose?: () => void;
  isCompactHeader?: boolean;
}> = ({ onClose, isCompactHeader = false }) => {
  const navigate = useNavigate();
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    togglePlay,
    queue,
    currentIndex,
    shuffleMode,
    cycleShuffleMode,
    repeatMode,
    toggleRepeat,
    autoplayEnabled,
    toggleAutoplay,
    playQueueIndex,
    playTrack,
    moveQueueItem,
    removeFromQueue,
    clearQueue,
    openAbout,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLibraryStore();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showPlayed, setShowPlayed] = useState(false);

  const playedTracks = currentIndex > 0 ? queue.slice(0, currentIndex) : [];
  const upNextTracks = currentIndex >= 0 ? queue.slice(currentIndex + 1) : queue;
  const totalUpcomingDuration = formatTotalDuration(upNextTracks);
  const isCurrentLiked = currentTrack ? isLiked(currentTrack.videoId) : false;

  // Drag-and-drop event handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      const fromIndexStr = e.dataTransfer.getData('text/plain');
      const fromIndex = parseInt(fromIndexStr, 10);
      if (!isNaN(fromIndex) && fromIndex !== targetIndex) {
        moveQueueItem(fromIndex, targetIndex);
      }
      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [moveQueueItem]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  // Row item actions
  const handlePlayIndex = useCallback(
    (idx: number) => {
      playQueueIndex(idx);
    },
    [playQueueIndex]
  );

  const handlePlayNext = useCallback(
    (actualIndex: number) => {
      moveQueueItem(actualIndex, currentIndex + 1);
    },
    [moveQueueItem, currentIndex]
  );

  const handleMoveUp = useCallback(
    (actualIndex: number) => {
      moveQueueItem(actualIndex, actualIndex - 1);
    },
    [moveQueueItem]
  );

  const handleMoveDown = useCallback(
    (actualIndex: number) => {
      moveQueueItem(actualIndex, actualIndex + 1);
    },
    [moveQueueItem]
  );

  const handleRemove = useCallback(
    (actualIndex: number) => {
      removeFromQueue(actualIndex);
    },
    [removeFromQueue]
  );

  const handleOpenAbout = useCallback(
    (trk: Track) => {
      openAbout(trk);
    },
    [openAbout]
  );

  return (
    <div className="flex flex-col h-full min-w-0 select-none">
      {/* ====================================================================
          HEADER BAR
          ==================================================================== */}
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 text-neutral-300">
            <Music2 className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-bold text-sm sm:text-base text-white truncate">
              Queue
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-neutral-400 font-semibold shrink-0">
              {queue.length} {queue.length === 1 ? 'track' : 'tracks'}
            </span>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1.5">
          {queue.length > 1 && (
            <button
              onClick={() => clearQueue(false)}
              aria-label="Clear upcoming queue"
              title="Clear all upcoming tracks"
              className="px-2.5 py-1 text-xs font-medium text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close Queue Panel"
              className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.12] border border-white/[0.08] transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* ====================================================================
          PLAYBACK & SHUFFLE TOOLBAR
          ==================================================================== */}
      <div className="px-5 py-2.5 border-b border-white/[0.06] bg-white/[0.01] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Shuffle Mode Cycle (Off -> Standard -> Smart) */}
          <button
            onClick={cycleShuffleMode}
            title={
              shuffleMode === 'smart'
                ? 'Smart Shuffle (Curated AI Order)'
                : shuffleMode === 'standard'
                ? 'Standard Shuffle'
                : 'Shuffle Off'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all ${
              shuffleMode === 'smart'
                ? 'bg-white/20 border-white/30 text-white font-semibold shadow-sm'
                : shuffleMode === 'standard'
                ? 'bg-white/10 border-white/20 text-white font-medium'
                : 'bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-white'
            }`}
          >
            {shuffleMode === 'smart' ? (
              <Sparkles className="w-3.5 h-3.5 text-white" />
            ) : (
              <Shuffle className="w-3.5 h-3.5" />
            )}
            <span className="capitalize">
              {shuffleMode === 'off'
                ? 'Shuffle'
                : shuffleMode === 'smart'
                ? 'Smart'
                : 'Shuffled'}
            </span>
          </button>

          {/* Repeat Mode Cycle (Off -> Queue -> Track) */}
          <button
            onClick={toggleRepeat}
            title={
              repeatMode === 'track'
                ? 'Repeat Current Track'
                : repeatMode === 'queue'
                ? 'Repeat Entire Queue'
                : 'Repeat Off'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all ${
              repeatMode !== 'off'
                ? 'bg-white/20 border-white/30 text-white font-semibold shadow-sm'
                : 'bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-white'
            }`}
          >
            {repeatMode === 'track' ? (
              <Repeat1 className="w-3.5 h-3.5" />
            ) : (
              <Repeat className="w-3.5 h-3.5" />
            )}
            <span className="capitalize">
              {repeatMode === 'off' ? 'Repeat' : repeatMode}
            </span>
          </button>
        </div>

        {/* Autoplay Toggle */}
        <button
          onClick={toggleAutoplay}
          title={
            autoplayEnabled
              ? 'Autoplay Active: keeps playing similar tracks'
              : 'Autoplay Off'
          }
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all ${
            autoplayEnabled
              ? 'bg-white/15 border-white/25 text-white font-medium'
              : 'bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-white'
          }`}
        >
          <InfinityIcon className="w-3.5 h-3.5" />
          <span>Autoplay</span>
        </button>
      </div>

      {/* ====================================================================
          SCROLLABLE QUEUE WORKSTATION BODY
          ==================================================================== */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-6 scroll-smooth focus:outline-none">
        {/* SECTION 1: CURRENTLY PLAYING HERO */}
        {currentTrack && (
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
                Currently Playing
              </span>
              {currentTrack.duration && (
                <span className="text-[11px] font-mono text-neutral-500">
                  {currentTrack.duration}
                </span>
              )}
            </div>

            <div className="group relative flex items-center justify-between gap-3.5 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-md transition-all hover:bg-white/[0.06]">
              {/* Artwork with status indicator */}
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 border border-white/10 shrink-0 shadow-inner">
                <ArtworkImage
                  src={getArtworkUrl(currentTrack) || currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />

                {/* Playing Equalizer Overlay */}
                {isPlaying && !isBuffering && (
                  <div className="absolute inset-0 bg-black/40 flex items-end justify-center pb-1.5 gap-[3px]">
                    <span className="w-1 rounded-full eq-hybrid-1" />
                    <span className="w-1 rounded-full eq-hybrid-2" />
                    <span className="w-1 rounded-full eq-hybrid-3" />
                  </div>
                )}
                {isBuffering && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  </div>
                )}
                {!isPlaying && !isBuffering && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Pause className="w-3.5 h-3.5 text-white/80 fill-current" />
                  </div>
                )}
              </div>

              {/* Title, Artist, Album */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                  {currentTrack.title}
                </h3>
                <p className="text-[11px] text-neutral-300 truncate mt-0.5">
                  {currentTrack.artists?.map((a) => a.name).join(', ') || 'Artist'}
                </p>
                {currentTrack.album && (
                  <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                    {currentTrack.album}
                  </p>
                )}
              </div>

              {/* Quick Hero Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Play/Pause Button */}
                <button
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                  )}
                </button>

                {/* Like Button */}
                <button
                  onClick={() => toggleLike(currentTrack)}
                  title={isCurrentLiked ? 'Remove Like' : 'Like'}
                  className={`p-1.5 rounded-full transition-colors ${
                    isCurrentLiked
                      ? 'text-rose-500 bg-rose-500/10'
                      : 'text-neutral-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isCurrentLiked ? 'fill-current' : ''}`} />
                </button>

                {/* About This Song */}
                <button
                  onClick={() => openAbout(currentTrack)}
                  title="About This Song"
                  className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 2: PREVIOUSLY PLAYED (Collapsible) */}
        {playedTracks.length > 0 && (
          <section className="space-y-2">
            <button
              onClick={() => setShowPlayed((prev) => !prev)}
              className="w-full flex items-center justify-between px-1 text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-semibold hover:text-neutral-200 transition-colors"
            >
              <span>Previously Played ({playedTracks.length})</span>
              {showPlayed ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showPlayed && (
              <div className="space-y-1 pl-1">
                {playedTracks.map((trk, pIdx) => (
                  <div
                    key={`${trk.videoId}-played-${pIdx}`}
                    onClick={() => handlePlayIndex(pIdx)}
                    className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white/[0.015] hover:bg-white/[0.05] text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer opacity-70 hover:opacity-100"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-neutral-900 shrink-0">
                        <ArtworkImage
                          src={getArtworkUrl(trk) || trk.thumbnail}
                          alt={trk.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate">{trk.title}</div>
                        <div className="text-[10px] text-neutral-500 truncate">
                          {trk.artists?.map((a) => a.name).join(', ')}
                        </div>
                      </div>
                    </div>
                    {trk.duration && (
                      <span className="text-[10px] font-mono text-neutral-600">
                        {trk.duration}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* SECTION 3: UP NEXT */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
              Up Next ({upNextTracks.length})
            </span>
            {totalUpcomingDuration && (
              <span className="text-[11px] font-mono text-neutral-500">
                {totalUpcomingDuration}
              </span>
            )}
          </div>

          {upNextTracks.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] p-6 text-neutral-400">
              <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-neutral-400">
                <Music2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-neutral-200">
                  Your queue is empty
                </h4>
                <p className="text-[11px] text-neutral-500 max-w-xs leading-relaxed">
                  {autoplayEnabled
                    ? 'Autoplay is active. Similar music will begin playing automatically when the current track finishes.'
                    : 'Add tracks from search or playlists to build your session.'}
                </p>
              </div>

              <button
                onClick={() => {
                  onClose?.();
                  navigate('/search');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 text-xs font-semibold text-neutral-200 hover:text-white transition-all mt-1"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Discover Music</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {upNextTracks.map((track, relIdx) => {
                const actualIdx = currentIndex + 1 + relIdx;
                const isItemDragging = draggedIndex === actualIdx;
                const isItemDragOver = dragOverIndex === actualIdx;

                return (
                  <QueueTrackRow
                    key={`${track.videoId}-${actualIdx}`}
                    track={track}
                    actualIndex={actualIdx}
                    relativeIndex={relIdx}
                    totalUpcoming={upNextTracks.length}
                    isDragging={isItemDragging}
                    isDragOver={isItemDragOver}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    onPlay={handlePlayIndex}
                    onPlayNext={handlePlayNext}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    onRemove={handleRemove}
                    onOpenAbout={handleOpenAbout}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

// Main Queue Floating Spatial Panel
export const QueuePanel: React.FC = () => {
  const { isQueueOpen, toggleQueue, atmospherePalette } = usePlayerStore();
  const panelRef = useRef<HTMLElement>(null);

  // Accessibility: Escape key closes queue panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isQueueOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        toggleQueue();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQueueOpen, toggleQueue]);

  if (!isQueueOpen) return null;

  return (
    <AnimatePresence>
      <motion.aside
        ref={panelRef}
        role="dialog"
        aria-label="Play Queue"
        initial={{ opacity: 0, x: 24, scale: 0.98 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 24, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="edition-drawer fixed top-3 right-3 bottom-24 md:bottom-28 w-[380px] lg:w-[420px] max-w-[calc(100vw-24px)] z-40 rounded-[28px] bg-[#0c0d12]/92 backdrop-blur-3xl border border-white/[0.09] shadow-[0_32px_96px_rgba(0,0,0,0.85)] flex flex-col text-white overflow-hidden"
      >
        {/* Ambient atmospheric aura behind the panel */}
        {atmospherePalette && (
          <div
            className="absolute inset-0 opacity-10 pointer-events-none blur-[80px] -z-10"
            style={{
              background: `radial-gradient(circle at 70% 20%, ${atmospherePalette.glow || atmospherePalette.primary} 0%, transparent 70%)`,
            }}
          />
        )}

        <QueueWorkstationContent onClose={toggleQueue} />
      </motion.aside>
    </AnimatePresence>
  );
};
