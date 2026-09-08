import React from 'react';
import { Heart, Play, Shuffle, Clock } from 'lucide-react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { TrackRow } from '@/components/music/TrackRow';

export const LikedSongsPage: React.FC = () => {
  const { likedTracks } = useLibraryStore();
  const { playTrack } = usePlayerStore();

  const handlePlayAll = () => {
    if (likedTracks.length > 0) {
      playTrack(likedTracks[0], likedTracks);
    }
  };

  const handleShuffle = () => {
    if (likedTracks.length > 0) {
      const shuffled = [...likedTracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  return (
    <div className="p-6 md:p-10 flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-6 md:gap-8 p-6 md:p-8 rounded-3xl glass-floating border border-white/10 shadow-2xl overflow-hidden">
        <div className="relative z-10 w-44 h-44 sm:w-52 sm:h-52 rounded-2xl bg-charcoal-900 border border-white/10 flex items-center justify-center text-white shadow-2xl shrink-0">
          <Heart className="w-20 h-20 text-rose-500 fill-current drop-shadow-[0_0_16px_rgba(244,63,94,0.4)]" />
        </div>

        <div className="relative z-10 flex flex-col gap-2 text-center sm:text-left min-w-0 flex-1">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Playlist
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Liked Songs
          </h1>
          <p className="text-sm text-neutral-300">
            {likedTracks.length} {likedTracks.length === 1 ? 'track' : 'tracks'}
          </p>

          {likedTracks.length > 0 && (
            <div className="flex items-center justify-center sm:justify-start gap-3 pt-4">
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-white text-black font-semibold text-sm transition-all duration-200 ease-out-expo shadow-play-btn hover:scale-[1.03] active:scale-[0.97]"
              >
                <Play className="w-4 h-4 fill-current translate-x-0.5" />
                <span>Play</span>
              </button>

              <button
                onClick={handleShuffle}
                className="p-3 rounded-full bg-white/10 hover:bg-white/15 text-neutral-200 hover:text-white transition-all border border-white/10"
                title="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tracks Table */}
      <section className="flex flex-col gap-2">
        {likedTracks.length === 0 ? (
          <div className="py-20 text-center text-neutral-400">
            <Heart className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white">No liked songs yet</h2>
            <p className="text-xs text-neutral-500 mt-1">
              Songs you like by tapping the heart icon will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 border-b border-white/[0.08]">
              <span className="w-7 text-center">#</span>
              <span className="flex-1">Title</span>
              <span className="w-10 text-right">
                <Clock className="w-3.5 h-3.5 inline text-neutral-400" />
              </span>
              <span className="w-14" />
            </div>

            <div className="flex flex-col gap-1">
              {likedTracks.map((track, idx) => (
                <TrackRow
                  key={track.videoId || idx}
                  track={track}
                  index={idx}
                  contextQueue={likedTracks}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
};
