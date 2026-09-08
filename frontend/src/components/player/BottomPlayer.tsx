import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  ListMusic,
  Mic2,
  Heart,
  Loader2,
  FolderPlus,
  Tv,
  Music,
  Sparkles,
  Moon,
  SlidersHorizontal,
  Headphones,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useEqualizerStore } from '@/stores/useEqualizerStore';
import { formatTime } from '@/lib/utils';
import { AddToPlaylistModal } from '@/components/common/AddToPlaylistModal';
import { SleepTimerModal } from '@/components/common/SleepTimerModal';
import { api } from '@/api/client';

export const BottomPlayer: React.FC = () => {
  const {
    currentTrack,
    atmospherePalette,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    shuffleMode,
    sleepTimer,
    isQueueOpen,
    isLyricsOpen,
    isVideoDockOpen,
    togglePlay,
    playTrack,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    cycleShuffleMode,
    toggleRepeat,
    toggleQueue,
    toggleLyrics,
    toggleVideoDock,
    togglePlayerExpanded,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLibraryStore();
  const { toggleOpen: toggleEqualizer, spatialAudio, toggleSpatialAudio } = useEqualizerStore();

  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [sleepTimerModalOpen, setSleepTimerModalOpen] = useState(false);
  const [scrubValue, setScrubValue] = useState<number | null>(null);

  if (!currentTrack) {
    return (
      <footer
        aria-label="Audio Player Standby"
        className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] md:w-[68%] max-w-5xl h-16 md:h-18 z-40 bg-[#12151c]/90 backdrop-blur-2xl rounded-[24px] border border-white/[0.09] shadow-[0_20px_60px_rgba(0,0,0,0.8)] px-5 flex items-center justify-between pointer-events-auto"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white shadow-sm">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold tracking-wide text-white">AAPESH Workstation</div>
            <div className="text-[11px] text-neutral-400">Spatial sound engine ready • Select any track to start</div>
          </div>
        </div>

        <button
          onClick={() => {
            api
              .getRecommendations(5)
              .then((recs) => {
                if (recs && recs.length > 0) {
                  playTrack(recs[0], recs);
                }
              })
              .catch(() => {});
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-full btn-play-aapesh font-bold text-xs transition-all duration-200 ease-out-expo shadow-lg hover:scale-105 active:scale-95 text-black"
        >
          <Play className="w-3.5 h-3.5 fill-current translate-x-0.5 text-black" />
          <span>Quick Play</span>
        </button>
      </footer>
    );
  }

  const liked = isLiked(currentTrack.videoId);
  const displayedTime = scrubValue !== null ? scrubValue : currentTime;
  const progressPercent = duration > 0 ? (displayedTime / duration) * 100 : 0;
  const currentVolume = isMuted ? 0 : volume;

  return (
    <>
      <footer
        aria-label="Floating Audio Console"
        className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] md:w-[72%] max-w-5xl h-18 md:h-[76px] z-40 bg-[#12151c]/90 backdrop-blur-2xl rounded-[24px] border border-white/[0.10] shadow-[0_24px_64px_rgba(0,0,0,0.85)] px-3 md:px-5 flex items-center justify-between transition-all duration-300 pointer-events-auto select-none"
      >
        {/* Subtle Ambient Artwork Glow */}
        {atmospherePalette && (
          <div
            className="absolute -inset-1 rounded-[24px] opacity-30 blur-2xl pointer-events-none -z-10 transition-all duration-700"
            style={{
              background: `radial-gradient(circle at 50% 100%, ${atmospherePalette.glow} 0%, transparent 70%)`,
            }}
          />
        )}

        {/* Ambient Top Glow Progress Accent */}
        <div className="absolute top-0 left-6 right-6 h-[2px] rounded-full bg-white/[0.06] overflow-hidden pointer-events-none">
          <div
            className="h-full bg-white/40 transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* ====================================================================
            1. LEFT: Transport Controls (Shuffle, Prev, Play/Pause, Next, Repeat) (Screenshot 3)
            ==================================================================== */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Shuffle / Smart Shuffle */}
          <button
            onClick={cycleShuffleMode}
            aria-label={`Shuffle: ${shuffleMode}`}
            title={
              shuffleMode === 'smart'
                ? 'Smart Shuffle: Active'
                : shuffleMode === 'standard'
                ? 'Standard Shuffle'
                : 'Shuffle Off'
            }
            className={`p-2 rounded-full transition-all ${
              shuffleMode === 'smart'
                ? 'text-white bg-white/20 ring-1 ring-white/30 shadow-sm'
                : shuffleMode === 'standard'
                ? 'text-white bg-white/15'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {shuffleMode === 'smart' ? (
              <Sparkles className="w-3.5 h-3.5 text-white" />
            ) : (
              <Shuffle className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Previous Track */}
          <button
            onClick={previous}
            aria-label="Previous Track"
            className="p-2 text-neutral-300 hover:text-white transition-colors"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          {/* Focal Play/Pause Button (Solid White Circle with Black Icon) */}
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="btn-play-aapesh w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
          >
            {isBuffering ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 fill-current text-black" />
            ) : (
              <Play className="w-4 h-4 fill-current translate-x-0.5 text-black" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={next}
            aria-label="Next Track"
            className="p-2 text-neutral-300 hover:text-white transition-colors"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={toggleRepeat}
            aria-label={`Repeat: ${repeatMode}`}
            title={`Repeat: ${repeatMode}`}
            className={`p-2 rounded-full transition-all ${
              repeatMode !== 'off'
                ? 'text-white bg-white/20 ring-1 ring-white/30 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {repeatMode === 'track' ? (
              <Repeat1 className="w-3.5 h-3.5" />
            ) : (
              <Repeat className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* ====================================================================
            2. CENTER-LEFT: Small Artwork Thumbnail & Track Info (Screenshot 3)
            ==================================================================== */}
        <div className="flex items-center gap-2.5 min-w-0 max-w-[200px] lg:max-w-[240px] px-2">
          <div
            onClick={togglePlayerExpanded}
            className="group relative w-10 h-10 rounded-xl overflow-hidden bg-charcoal-800 shadow-md shrink-0 cursor-pointer border border-white/10"
          >
            <img
              src={currentTrack.thumbnail || ''}
              alt={currentTrack.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div
              onClick={togglePlayerExpanded}
              className="font-bold text-xs text-white truncate cursor-pointer hover:underline"
              title={currentTrack.title}
            >
              {currentTrack.title}
            </div>
            <div className="text-[11px] text-neutral-400 truncate mt-0.5" title={currentTrack.artists?.map((a) => a.name).join(', ')}>
              {currentTrack.artists?.map((a) => a.name).join(', ')}
            </div>
          </div>
        </div>

        {/* ====================================================================
            3. CENTER-RIGHT: Thin Scrubber with Timestamps (Screenshot 3)
            ==================================================================== */}
        <div className="hidden md:flex items-center gap-2.5 flex-1 max-w-sm px-2">
          <span className="text-[10px] tabular-nums font-mono text-neutral-400 w-8 text-right select-none">
            {formatTime(displayedTime)}
          </span>
          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={displayedTime}
              onPointerDown={() => setScrubValue(currentTime)}
              onChange={(e) => setScrubValue(Number(e.target.value))}
              onPointerUp={(e) => {
                const val = Number((e.target as HTMLInputElement).value);
                seek(val);
                setScrubValue(null);
              }}
              onKeyUp={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                  const val = Number((e.target as HTMLInputElement).value);
                  seek(val);
                  setScrubValue(null);
                }
              }}
              aria-label="Progress Bar"
              className="scrubber-slider-aapesh w-full cursor-pointer"
              style={{
                background: `linear-gradient(to right, #ffffff ${progressPercent}%, rgba(255, 255, 255, 0.12) ${progressPercent}%)`,
              }}
            />
          </div>
          <span className="text-[10px] tabular-nums font-mono text-neutral-400 w-8 text-left select-none">
            {formatTime(duration)}
          </span>
        </div>

        {/* ====================================================================
            4. RIGHT: Utilities (Spatial, Lyrics, Queue, EQ, Volume, Fullscreen) (Screenshot 3)
            ==================================================================== */}
        <div className="flex items-center justify-end gap-1 sm:gap-1.5 shrink-0">
          {/* Spatial Audio Pill */}
          <button
            onClick={toggleSpatialAudio}
            aria-label="Spatial Audio"
            title="Spatial Sound DSP"
            className={`hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-all ${
              spatialAudio
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold'
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span className="w-1 h-1 rounded-full bg-rose-500" />
          </button>

          {/* Lyrics Button */}
          <button
            onClick={toggleLyrics}
            aria-label="Lyrics"
            title="Synced Lyrics"
            className={`p-1.5 rounded-full transition-colors ${
              isLyricsOpen
                ? 'text-white bg-white/20 ring-1 ring-white/25'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Mic2 className="w-4 h-4" />
          </button>

          {/* Queue Button */}
          <button
            onClick={toggleQueue}
            aria-label="Queue"
            title="Play Queue"
            className={`p-1.5 rounded-full transition-colors ${
              isQueueOpen
                ? 'text-white bg-white/20 ring-1 ring-white/25'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ListMusic className="w-4 h-4" />
          </button>

          {/* Equalizer Modal Trigger */}
          <button
            onClick={toggleEqualizer}
            aria-label="Equalizer"
            title="10-Band Graphic Pro Equalizer"
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4 text-rose-500" />
          </button>

          {/* Volume Control */}
          <div className="hidden xl:flex items-center gap-1.5 ml-1">
            <button
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className="text-neutral-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-neutral-500" />
              ) : volume < 50 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={currentVolume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume Slider"
              className="scrubber-slider-aapesh w-16"
              style={{
                background: `linear-gradient(to right, #ffffff ${currentVolume}%, rgba(255, 255, 255, 0.12) ${currentVolume}%)`,
              }}
            />
          </div>

          {/* Expand Fullscreen Player */}
          <button
            onClick={togglePlayerExpanded}
            aria-label="Expand Fullscreen Player"
            title="Expand Fullscreen"
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/5 transition-colors ml-0.5"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        track={currentTrack}
        isOpen={playlistModalOpen}
        onClose={() => setPlaylistModalOpen(false)}
      />

      {/* Sleep Timer Modal */}
      <SleepTimerModal
        isOpen={sleepTimerModalOpen}
        onClose={() => setSleepTimerModalOpen(false)}
      />
    </>
  );
};
