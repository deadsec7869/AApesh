import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Pause, Heart, Radio, Disc, Mic2, Share2 } from 'lucide-react';
import { api } from '@/api/client';
import { Track, LyricsResponse } from '@/types/music';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { TrackRow } from '@/components/music/TrackRow';
import { SkeletonHero, SkeletonList } from '@/components/common/Skeletons';

export const SongPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { isLiked, toggleLike } = useLibraryStore();

  const [track, setTrack] = useState<Track | null>(null);
  const [radioTracks, setRadioTracks] = useState<Track[]>([]);
  const [lyrics, setLyrics] = useState<LyricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);

    Promise.all([
      api.getSong(id),
      api.getTrackRadio(id, 20).catch(() => []),
      api.getLyrics(id).catch(() => ({ videoId: id, synced: false, hasLyrics: false, lines: [] })),
    ])
      .then(([songData, radio, lyricsData]) => {
        setTrack(songData);
        setRadioTracks(radio);
        setLyrics(lyricsData);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="p-6 md:p-10 flex flex-col gap-10">
        <SkeletonHero />
        <SkeletonList count={6} />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="p-12 text-center text-neutral-400">
        <Disc className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Song not found</h2>
      </div>
    );
  }

  const isCurrent = currentTrack?.videoId === track.videoId;
  const liked = isLiked(track.videoId);

  return (
    <div className="p-6 md:p-10 flex flex-col gap-10 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-6 md:gap-8 p-6 md:p-8 rounded-3xl glass-elevated border border-white/10 shadow-2xl overflow-hidden">
        <div className="relative z-10 w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden bg-charcoal-800 shadow-2xl shrink-0 border border-white/10">
          <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
        </div>

        <div className="relative z-10 flex flex-col gap-2.5 text-center sm:text-left min-w-0 flex-1">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Song
          </span>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight break-words">
            {track.title}
          </h1>

          <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-neutral-300">
            {track.artists?.map((a, i) => (
              <span key={i} className="font-semibold text-white">
                {a.name}
              </span>
            ))}
            {track.duration && <span>• {track.duration}</span>}
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-3 pt-4">
            <button
              onClick={() => (isCurrent ? togglePlay() : playTrack(track, radioTracks))}
              className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-white text-black font-semibold text-sm transition-all duration-200 ease-out-expo shadow-play-btn hover:scale-[1.03] active:scale-[0.97]"
            >
              {isCurrent && isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current translate-x-0.5" />
              )}
              <span>{isCurrent && isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              onClick={() => toggleLike(track)}
              className={`p-3 rounded-full border border-white/10 transition-colors ${
                liked
                  ? 'text-rose-500 bg-rose-500/10'
                  : 'text-neutral-300 hover:text-white bg-white/10'
              }`}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Lyrics Preview if available */}
      {lyrics?.lyrics && (
        <section className="p-6 rounded-3xl glass-surface border border-white/10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Mic2 className="w-4 h-4 text-neutral-400" />
            <span>Lyrics</span>
          </div>
          <div className="text-neutral-200 whitespace-pre-line text-sm max-h-48 overflow-y-auto leading-relaxed">
            {lyrics.lyrics}
          </div>
        </section>
      )}

      {/* Recommended Radio Tracks */}
      {radioTracks.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-white" />
            <h2 className="text-xl font-bold text-white tracking-tight">Song Radio</h2>
          </div>
          <div className="flex flex-col gap-1">
            {radioTracks.map((rTrack, idx) => (
              <TrackRow
                key={`${rTrack.videoId}-${idx}`}
                track={rTrack}
                index={idx}
                contextQueue={radioTracks}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
