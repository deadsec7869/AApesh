import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Shuffle, Disc, Clock, Heart } from 'lucide-react';
import { api } from '@/api/client';
import { Album } from '@/types/music';
import { TrackRow } from '@/components/music/TrackRow';
import { SkeletonHero, SkeletonList } from '@/components/common/Skeletons';
import { usePlayerStore } from '@/stores/usePlayerStore';

export const AlbumPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { playTrack } = usePlayerStore();

  const [album, setAlbum] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    api
      .getAlbum(id)
      .then(setAlbum)
      .catch((err) => {
        console.error('Failed to load album:', err);
        setError('Unable to load album details.');
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="p-6 md:p-10 flex flex-col gap-10">
        <SkeletonHero />
        <SkeletonList count={8} />
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="p-12 text-center text-neutral-400">
        <Disc className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Album not found</h2>
        <p className="text-sm text-neutral-500 mt-1">{error || 'Could not load album metadata.'}</p>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (album.tracks && album.tracks.length > 0) {
      playTrack(album.tracks[0], album.tracks);
    }
  };

  const handleShuffle = () => {
    if (album.tracks && album.tracks.length > 0) {
      const shuffled = [...album.tracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  return (
    <div className="p-6 md:p-10 flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-6 md:gap-8 p-6 md:p-8 rounded-3xl glass-elevated border border-white/10 shadow-2xl overflow-hidden">
        {/* Background Aura */}
        <div
          className="absolute inset-0 opacity-25 blur-3xl scale-125 pointer-events-none"
          style={{
            backgroundImage: `url(${album.thumbnail})`,
            backgroundSize: 'cover',
          }}
        />

        {/* Artwork */}
        <div className="relative z-10 w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden bg-charcoal-800 shadow-2xl shrink-0 border border-white/10">
          {album.thumbnail ? (
            <img src={album.thumbnail} alt={album.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-charcoal-800 text-neutral-500">
              <Disc className="w-16 h-16" />
            </div>
          )}
        </div>

        {/* Metadata & Controls */}
        <div className="relative z-10 flex flex-col gap-2.5 text-center sm:text-left min-w-0 flex-1">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Album
          </span>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight break-words">
            {album.title}
          </h1>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-neutral-300">
            <span className="font-semibold text-white">
              {album.artists?.map((artist, idx) => (
                <React.Fragment key={idx}>
                  {artist.id ? (
                    <Link to={`/artist/${artist.id}`} className="hover:underline">
                      {artist.name}
                    </Link>
                  ) : (
                    <span>{artist.name}</span>
                  )}
                  {idx < (album.artists?.length || 1) - 1 ? ', ' : ''}
                </React.Fragment>
              ))}
            </span>
            {album.year && <span>• {album.year}</span>}
            {album.trackCount && <span>• {album.trackCount} songs</span>}
            {album.duration && <span>• {album.duration}</span>}
          </div>

          {/* Action Buttons */}
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
              title="Shuffle Album"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Track List */}
      <section className="flex flex-col gap-2">
        {/* Table Header */}
        <div className="flex items-center gap-4 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 border-b border-white/[0.08]">
          <span className="w-7 text-center">#</span>
          <span className="flex-1">Title</span>
          <span className="w-10 text-right">
            <Clock className="w-3.5 h-3.5 inline text-neutral-400" />
          </span>
          <span className="w-14" />
        </div>

        {/* Rows */}
        <div className="flex flex-col gap-1">
          {album.tracks?.map((track, idx) => (
            <TrackRow
              key={track.videoId || idx}
              track={track}
              index={idx}
              showCover={false}
              showAlbum={false}
              contextQueue={album.tracks}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
