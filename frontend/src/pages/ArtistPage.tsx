import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Shuffle, Check, Disc, Headphones, RotateCw, User } from 'lucide-react';
import { api } from '@/api/client';
import { Artist } from '@/types/music';
import { TrackRow } from '@/components/music/TrackRow';
import { AlbumCard } from '@/components/music/AlbumCard';
import { SkeletonHero, SkeletonList } from '@/components/common/Skeletons';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { formatCompactNumber } from '@/lib/utils';

export const ArtistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playTrack } = usePlayerStore();
  const { followArtist, unfollowArtist, isFollowingArtist } = useLibraryStore();

  const [artist, setArtist] = useState<Artist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'related' | 'lyrics'>('overview');

  const isFollowing = id ? isFollowingArtist(id) : false;

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    api
      .getArtist(id)
      .then(setArtist)
      .catch((err) => {
        console.error('Failed to load artist:', err);
        setError('Unable to load artist profile.');
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

  if (error || !artist) {
    return (
      <div className="p-12 text-center text-neutral-400">
        <User className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Artist not found</h2>
        <p className="text-sm text-neutral-500 mt-1">{error || 'Could not load artist profile.'}</p>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (artist.topSongs && artist.topSongs.length > 0) {
      playTrack(artist.topSongs[0], artist.topSongs);
    }
  };

  const handleShuffle = () => {
    if (artist.topSongs && artist.topSongs.length > 0) {
      const shuffled = [...artist.topSongs].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  const songCount = artist.topSongs ? artist.topSongs.length : 5;

  return (
    <div className="p-6 md:p-10 flex flex-col gap-9 animate-in fade-in duration-300">
      {/* ====================================================================
          1. CINEMATIC ARTIST HERO (Exact Visual Direction: Image 1)
          ==================================================================== */}
      <div className="relative min-h-[340px] md:min-h-[400px] rounded-3xl overflow-hidden glass-floating border border-white/10 shadow-2xl flex flex-col justify-between p-6 md:p-10">
        {/* Cinematic Backdrop Image with Lighting Leaks */}
        {artist.thumbnail && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 scale-105 pointer-events-none transition-transform duration-700"
            style={{ backgroundImage: `url(${artist.thumbnail})` }}
          />
        )}
        {/* Soft Vignette & Stage Lighting Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/90 via-transparent to-[#050505]/40 pointer-events-none" />

        {/* Top Right Tabs: Overview, Related Artist, Lyrics */}
        <div className="relative z-10 flex justify-end">
          <div className="flex items-center gap-6 text-xs md:text-sm font-semibold tracking-wide">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-1 transition-all ${
                activeTab === 'overview'
                  ? 'text-white border-b-2 border-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => {
                setActiveTab('related');
                navigate(`/search?q=${encodeURIComponent(artist.name + ' radio')}`);
              }}
              className={`pb-1 transition-all ${
                activeTab === 'related'
                  ? 'text-white border-b-2 border-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Related Artist
            </button>
            <button
              onClick={() => {
                setActiveTab('lyrics');
                if (artist.topSongs && artist.topSongs.length > 0) {
                  playTrack(artist.topSongs[0], artist.topSongs);
                  usePlayerStore.getState().toggleLyrics();
                }
              }}
              className={`pb-1 transition-all ${
                activeTab === 'lyrics'
                  ? 'text-white border-b-2 border-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Lyrics
            </button>
          </div>
        </div>

        {/* Bottom Hero Metadata & Actions */}
        <div className="relative z-10 flex flex-col gap-3.5 max-w-2xl">
          <span className="text-xs uppercase tracking-widest font-semibold text-neutral-400">
            Artist
          </span>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-md">
            {artist.name}
          </h1>

          <div className="flex items-center gap-2 text-xs md:text-sm text-neutral-300 font-medium">
            <Headphones className="w-4 h-4 text-neutral-400" />
            <span>
              {songCount} songs Total
              {artist.subscribers ? ` • ${formatCompactNumber(artist.subscribers)} listeners` : ''}
            </span>
          </div>

          {/* Action Buttons: Following + Play all */}
          <div className="flex items-center gap-3 pt-3">
            <button
              onClick={() => {
                if (!id || !artist) return;
                if (isFollowing) {
                  unfollowArtist(id);
                } else {
                  followArtist({
                    id,
                    name: artist.name,
                    thumbnail: artist.thumbnail,
                    subscribers: artist.subscribers,
                    songs: `${songCount} songs`,
                  });
                }
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 ${
                isFollowing
                  ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
                  : 'bg-white text-black hover:bg-white/90'
              }`}
            >
              {isFollowing && <Check className="w-4 h-4" />}
              <span>{isFollowing ? 'Following' : 'Follow'}</span>
            </button>

            <button
              onClick={handlePlayAll}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full btn-play-aapesh text-xs md:text-sm font-bold text-black shadow-xl hover:scale-105 active:scale-95 transition-transform"
            >
              <Play className="w-4 h-4 fill-current translate-x-0.5 text-black" />
              <span>Play all</span>
            </button>

            <button
              onClick={handleShuffle}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/15 text-neutral-200 hover:text-white transition-all border border-white/10"
              title="Shuffle all"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          2. TOP PLAYLIST / POPULAR TRACKS SHELF (Exact Visual Direction: Image 1)
          ==================================================================== */}
      {artist.topSongs && artist.topSongs.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Top Playlist
            </h2>
            <button
              onClick={handleShuffle}
              aria-label="Refresh / Shuffle playlist"
              className="p-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Translucent Rounded Container (Image 1 Shelf) */}
          <div className="glass-shelf p-3 md:p-5 flex flex-col gap-1.5 shadow-xl">
            {artist.topSongs.slice(0, 10).map((track, idx) => (
              <TrackRow
                key={track.videoId || idx}
                track={track}
                index={idx}
                contextQueue={artist.topSongs}
              />
            ))}
          </div>
        </section>
      )}

      {/* ====================================================================
          3. ALBUMS & DISCOGRAPHY
          ==================================================================== */}
      {artist.albums && artist.albums.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Disc className="w-5 h-5 text-white" />
            <h2 className="text-xl font-bold text-white tracking-tight">Albums</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {artist.albums.map((album) => (
              <AlbumCard key={album.browseId} album={album} />
            ))}
          </div>
        </section>
      )}

      {/* Singles & EPs */}
      {artist.singles && artist.singles.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Singles & EPs</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {artist.singles.map((single) => (
              <AlbumCard key={single.browseId} album={single} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
