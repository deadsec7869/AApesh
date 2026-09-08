import React from 'react';
import {
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
  Music2,
  Sparkles,
  Infinity as InfinityIcon,
  Shuffle,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';

export const QueuePanel: React.FC = () => {
  const {
    isQueueOpen,
    toggleQueue,
    currentTrack,
    isPlaying,
    queue,
    currentIndex,
    shuffleMode,
    cycleShuffleMode,
    autoplayEnabled,
    toggleAutoplay,
    playTrack,
    removeFromQueue,
    clearQueue,
    moveQueueItem,
  } = usePlayerStore();

  if (!isQueueOpen) return null;

  const upNextTracks = queue.slice(currentIndex + 1);

  return (
    <aside
      aria-label="Play Queue"
      className="fixed top-0 right-0 bottom-24 md:bottom-28 w-80 md:w-96 z-40 glass-elevated border-l border-white/[0.08] p-5 flex flex-col animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Music2 className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-base">Play Queue</h2>
          <span className="text-xs text-neutral-400 font-mono">({queue.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          {queue.length > 1 && (
            <button
              onClick={() => clearQueue()}
              className="px-2.5 py-1 text-xs text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={toggleQueue}
            aria-label="Close Queue"
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Smart Playback Switches in Queue Header */}
      <div className="py-3 border-b border-white/[0.06] flex items-center justify-between text-xs text-neutral-300">
        {/* Autoplay Toggle */}
        <button
          onClick={toggleAutoplay}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
            autoplayEnabled
              ? 'bg-white/20 border-white/30 text-white font-semibold'
              : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
          }`}
          title="Autoplay keeps music playing after queue ends"
        >
          <InfinityIcon className="w-3.5 h-3.5" />
          <span>Autoplay {autoplayEnabled ? 'On' : 'Off'}</span>
        </button>

        {/* Smart Shuffle Cycle */}
        <button
          onClick={cycleShuffleMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
            shuffleMode === 'smart'
              ? 'bg-white/20 border-white/30 text-white font-semibold'
              : shuffleMode === 'standard'
              ? 'bg-white/10 border-white/20 text-white'
              : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
          }`}
          title="Cycle: Off, Standard, Smart Shuffle"
        >
          {shuffleMode === 'smart' ? (
            <Sparkles className="w-3.5 h-3.5 text-white" />
          ) : (
            <Shuffle className="w-3.5 h-3.5" />
          )}
          <span className="capitalize">{shuffleMode === 'off' ? 'Shuffle Off' : `${shuffleMode} Shuffle`}</span>
        </button>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto pt-4 flex flex-col gap-5 pr-1">
        {/* Now Playing */}
        {currentTrack && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Now Playing
            </span>
            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.08] border border-white/10 shadow-sm">
              <img
                src={currentTrack.thumbnail || ''}
                alt={currentTrack.title}
                className="w-11 h-11 rounded-xl object-cover bg-charcoal-800 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-white truncate">
                  {currentTrack.title}
                </div>
                <div className="text-xs text-neutral-400 truncate mt-0.5">
                  {currentTrack.artists?.map((a) => a.name).join(', ')}
                </div>
              </div>

              {/* Equalizer Indicator */}
              {isPlaying && (
                <div className="flex items-end gap-[3px] h-4 pr-1">
                  <span className="w-1 rounded-full eq-hybrid-1" />
                  <span className="w-1 rounded-full eq-hybrid-2" />
                  <span className="w-1 rounded-full eq-hybrid-3" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Up Next */}
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Up Next ({upNextTracks.length})
            </span>
          </div>

          {upNextTracks.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center gap-2 text-xs text-neutral-500">
              <Music2 className="w-6 h-6 text-neutral-600" />
              <span>Queue is empty.</span>
              {autoplayEnabled && (
                <span className="text-neutral-400 text-[11px]">
                  Autoplay is on. Similar tracks will start automatically!
                </span>
              )}
            </div>
          ) : (
            upNextTracks.map((track, relativeIndex) => {
              const actualIndex = currentIndex + 1 + relativeIndex;
              return (
                <div
                  key={`${track.videoId}-${actualIndex}`}
                  className="group flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-white/[0.05] transition-colors"
                >
                  <div
                    onClick={() => playTrack(track)}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <img
                      src={track.thumbnail || ''}
                      alt={track.title}
                      className="w-10 h-10 rounded-lg object-cover bg-charcoal-800 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-neutral-200 group-hover:text-white truncate">
                        {track.title}
                      </div>
                      <div className="text-xs text-neutral-400 truncate">
                        {track.artists?.map((a) => a.name).join(', ')}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {relativeIndex > 0 && (
                      <button
                        onClick={() => moveQueueItem(actualIndex, actualIndex - 1)}
                        className="p-1 rounded text-neutral-500 hover:text-white hover:bg-white/10"
                        title="Move up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {relativeIndex < upNextTracks.length - 1 && (
                      <button
                        onClick={() => moveQueueItem(actualIndex, actualIndex + 1)}
                        className="p-1 rounded text-neutral-500 hover:text-white hover:bg-white/10"
                        title="Move down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => removeFromQueue(actualIndex)}
                      className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-red-500/10"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};
