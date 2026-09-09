import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Shuffle,
  Check,
  Disc,
  Headphones,
  RotateCw,
  User,
  Share2,
  Users,
  ChevronLeft,
  ChevronRight,
  Music2,
  Radio,
} from 'lucide-react';
import { api } from '@/api/client';
import { Artist, Track } from '@/types/music';
import { TrackRow } from '@/components/music/TrackRow';
import { AlbumCard } from '@/components/music/AlbumCard';
import { ArtworkImage } from '@/components/common/ArtworkImage';
import { SkeletonHero, SkeletonCard } from '@/components/common/Skeletons';
import { TiltedCard } from '@/components/react-bits';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { formatCompactNumber } from '@/lib/utils';
import { controlButtonHover, controlButtonTap, playButtonHover, playButtonTap } from '@/lib/motion';

export const ArtistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Scoped Zustand selectors to prevent playback timer re-renders
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.videoId);

  const followArtist = useLibraryStore((s) => s.followArtist);
  const unfollowArtist = useLibraryStore((s) => s.unfollowArtist);
  const isFollowingArtist = useLibraryStore((s) => s.isFollowingArtist);

  const [artist, setArtist] = useState<Artist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'discography' | 'related'>('overview');
  const [shareToast, setShareToast] = useState(false);

  const albumsScrollRef = useRef<HTMLDivElement>(null);
  const singlesScrollRef = useRef<HTMLDivElement>(null);
  const relatedScrollRef = useRef<HTMLDivElement>(null);

  const isFollowing = id ? isFollowingArtist(id) : false;

  const loadArtist = () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    api
      .getArtist(id)
      .then((data) => {
        setArtist(data);
      })
      .catch((err) => {
        console.error('Failed to load artist:', err);
        setError('Unable to load artist profile.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadArtist();
  }, [id]);

  const scrollShelf = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -360 : 360;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handlePlayAll = () => {
    if (artist?.topSongs && artist.topSongs.length > 0) {
      playTrack(artist.topSongs[0], artist.topSongs);
    }
  };

  const handleShuffle = () => {
    if (artist?.topSongs && artist.topSongs.length > 0) {
      const shuffled = [...artist.topSongs].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  const handleToggleFollow = () => {
    if (!id || !artist) return;
    if (isFollowing) {
      unfollowArtist(id);
    } else {
      followArtist({
        id,
        name: artist.name,
        thumbnail: artist.thumbnail,
        subscribers: artist.subscribers,
        songs: artist.topSongs?.length ? `${artist.topSongs.length} songs` : 'Artist',
      });
    }
  };

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2200);
    }
  };

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 pb-12 animate-pulse">
        {/* Hero Skeleton */}
        <div className="relative min-h-[300px] md:min-h-[360px] rounded-3xl bg-white/[0.03] border border-white/[0.06] p-6 md:p-10 flex flex-col justify-end">
          <div className="h-4 w-20 bg-white/10 rounded-full mb-3" />
          <div className="h-10 md:h-14 w-64 md:w-96 bg-white/15 rounded-2xl mb-4" />
          <div className="h-4 w-40 bg-white/10 rounded-full mb-6" />
          <div className="flex gap-3">
            <div className="h-10 w-28 bg-white/20 rounded-full" />
            <div className="h-10 w-28 bg-white/10 rounded-full" />
          </div>
        </div>

        {/* Top Tracks Skeleton */}
        <div className="flex flex-col gap-3">
          <div className="h-6 w-36 bg-white/10 rounded-lg" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-2xl bg-white/[0.02] border border-white/[0.04]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error State with Retry
  if (error || !artist) {
    return (
      <div className="p-12 md:p-16 text-center flex flex-col items-center justify-center gap-4 min-h-[50vh]">
        <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-neutral-400">
          <User className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-white">Artist Profile Unavailable</h2>
          <p className="text-sm text-neutral-400 max-w-sm">
            {error || 'Could not load artist data from the network.'}
          </p>
        </div>
        <button
          onClick={loadArtist}
          className="mt-2 flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold transition-all duration-200"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const hasTopSongs = Boolean(artist.topSongs && artist.topSongs.length > 0);
  const hasAlbums = Boolean(artist.albums && artist.albums.length > 0);
  const hasSingles = Boolean(artist.singles && artist.singles.length > 0);
  const hasRelated = Boolean(artist.relatedArtists && artist.relatedArtists.length > 0);

  return (
    <div className="flex flex-col gap-8 pb-12 select-none">
      {/* ====================================================================
          1. CINEMATIC ARTIST HERO SECTION
          ==================================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative min-h-[320px] md:min-h-[380px] rounded-[28px] overflow-hidden bg-[#12141a]/90 border border-white/[0.08] shadow-[0_24px_64px_rgba(0,0,0,0.8)] flex flex-col justify-between p-6 md:p-10"
      >
        {/* Local Scoped Atmospheric Backdrop Image */}
        {artist.thumbnail && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 scale-105 pointer-events-none transition-transform duration-1000 blur-sm"
            style={{ backgroundImage: `url(${artist.thumbnail})` }}
          />
        )}

        {/* Soft Vignette & Stage Shading Gradient Layers */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10]/70 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0c10]/95 via-[#0a0c10]/40 to-transparent pointer-events-none" />

        {/* Top-Right: Section Navigation Tabs & Share Action */}
        <div className="relative z-10 flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-neutral-300">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>ARTIST</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Share Control */}
            <motion.button
              whileHover={controlButtonHover}
              whileTap={controlButtonTap}
              onClick={handleShare}
              aria-label="Share Artist Profile"
              title="Share Link"
              className="w-9 h-9 rounded-full bg-white/[0.07] hover:bg-white/[0.15] border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all shadow-md relative"
            >
              <Share2 className="w-4 h-4" />
              <AnimatePresence>
                {shareToast && (
                  <motion.span
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="absolute -bottom-8 right-0 px-2.5 py-1 rounded-md bg-white text-black text-[10px] font-bold whitespace-nowrap shadow-lg z-50"
                  >
                    Link Copied!
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Bottom Hero Metadata & Action Controls */}
        <div className="relative z-10 flex items-end gap-5 max-w-4xl mt-auto pt-8">
          {artist.thumbnail && (
            <TiltedCard
              maxTilt={6}
              className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden shrink-0 border border-white/15 shadow-2xl bg-charcoal-800 hidden sm:block"
            >
              <ArtworkImage
                src={artist.thumbnail}
                alt={artist.name}
                className="w-full h-full object-cover"
                fallbackIconClassName="w-10 h-10 text-neutral-400"
              />
            </TiltedCard>
          )}

          <div className="flex flex-col gap-2.5 min-w-0 flex-1">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-md truncate">
              {artist.name}
            </h1>

          {/* Genuine Real Metadata Only */}
          <div className="flex items-center gap-3 text-xs sm:text-sm text-neutral-300 font-medium">
            {artist.subscribers && (
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-neutral-400" />
                <span>{artist.subscribers}</span>
              </div>
            )}
            {hasTopSongs && (
              <div className="flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5 text-neutral-400" />
                <span>{artist.topSongs.length} Top Songs</span>
              </div>
            )}
            {artist.views && (
              <span className="text-neutral-400 text-xs hidden sm:inline">
                • {artist.views}
              </span>
            )}
          </div>

          {/* Action Buttons: Follow, Play All, Shuffle */}
          <div className="flex items-center gap-3 pt-2">
            {/* Prominent Restrained Follow Toggle */}
            <motion.button
              whileHover={controlButtonHover}
              whileTap={controlButtonTap}
              onClick={handleToggleFollow}
              aria-label={isFollowing ? `Unfollow ${artist.name}` : `Follow ${artist.name}`}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 shadow-md ${
                isFollowing
                  ? 'bg-white/15 hover:bg-white/20 text-white border border-white/25 ring-1 ring-white/20'
                  : 'bg-white text-black hover:bg-white/90'
              }`}
            >
              {isFollowing && <Check className="w-4 h-4" />}
              <span>{isFollowing ? 'Following' : 'Follow'}</span>
            </motion.button>

            {/* Play All Button */}
            {hasTopSongs && (
              <motion.button
                whileHover={playButtonHover}
                whileTap={playButtonTap}
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-5 sm:px-6 py-2 rounded-full btn-play-aapesh text-xs sm:text-sm font-bold text-black shadow-xl"
              >
                <Play className="w-4 h-4 fill-current translate-x-0.5 text-black" />
                <span>Play all</span>
              </motion.button>
            )}

            {/* Shuffle Button */}
            {hasTopSongs && (
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={handleShuffle}
                aria-label="Shuffle artist tracks"
                title="Shuffle all"
                className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/15 text-neutral-200 hover:text-white transition-all border border-white/10 flex items-center justify-center"
              >
                <Shuffle className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>

      {/* ====================================================================
          2. TOP POPULAR TRACKS (Queue 2.0 Density)
          ==================================================================== */}
      {hasTopSongs && (
        <section className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4.5 h-4.5 text-white" />
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Top Tracks
              </h2>
            </div>
            <span className="text-xs text-neutral-400">
              {artist.topSongs.length} popular tracks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
          3. ALBUMS (Horizontal Shelf with Controls)
          ==================================================================== */}
      {hasAlbums && (
        <section className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Disc className="w-4.5 h-4.5 text-white" />
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Albums
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollShelf(albumsScrollRef, 'left')}
                aria-label="Previous albums"
                className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.12] text-neutral-400 hover:text-white flex items-center justify-center transition-colors border border-white/[0.06]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => scrollShelf(albumsScrollRef, 'right')}
                aria-label="Next albums"
                className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.12] text-neutral-400 hover:text-white flex items-center justify-center transition-colors border border-white/[0.06]"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={albumsScrollRef}
            className="flex items-stretch gap-4 overflow-x-auto pb-2 scroll-smooth no-scrollbar w-full"
          >
            {artist.albums.map((album) => (
              <div key={album.browseId} className="w-40 sm:w-44 md:w-48 shrink-0">
                <AlbumCard album={album} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ====================================================================
          4. SINGLES & EPS (Rendered only if available)
          ==================================================================== */}
      {hasSingles && (
        <section className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music2 className="w-4.5 h-4.5 text-white" />
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Singles & EPs
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollShelf(singlesScrollRef, 'left')}
                aria-label="Previous singles"
                className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.12] text-neutral-400 hover:text-white flex items-center justify-center transition-colors border border-white/[0.06]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => scrollShelf(singlesScrollRef, 'right')}
                aria-label="Next singles"
                className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.12] text-neutral-400 hover:text-white flex items-center justify-center transition-colors border border-white/[0.06]"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={singlesScrollRef}
            className="flex items-stretch gap-4 overflow-x-auto pb-2 scroll-smooth no-scrollbar w-full"
          >
            {artist.singles.map((single) => (
              <div key={single.browseId} className="w-40 sm:w-44 md:w-48 shrink-0">
                <AlbumCard album={single} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ====================================================================
          5. RELATED ARTISTS (Circular Avatars)
          ==================================================================== */}
      {hasRelated && (
        <section className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-white" />
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Fans Also Like
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollShelf(relatedScrollRef, 'left')}
                aria-label="Previous related artists"
                className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.12] text-neutral-400 hover:text-white flex items-center justify-center transition-colors border border-white/[0.06]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => scrollShelf(relatedScrollRef, 'right')}
                aria-label="Next related artists"
                className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.12] text-neutral-400 hover:text-white flex items-center justify-center transition-colors border border-white/[0.06]"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={relatedScrollRef}
            className="flex gap-4 overflow-x-auto pb-2 scroll-smooth no-scrollbar w-full"
          >
            {artist.relatedArtists.map((relArtist) => (
              <div
                key={relArtist.id || relArtist.name}
                onClick={() => {
                  if (relArtist.id) {
                    navigate(`/artist/${relArtist.id}`);
                  } else {
                    navigate(`/search/${encodeURIComponent(relArtist.name)}`);
                  }
                }}
                className="group flex flex-col items-center text-center gap-2 p-2 rounded-2xl hover:bg-white/[0.04] transition-all cursor-pointer w-24 sm:w-28 shrink-0 min-w-0"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0.5 border border-white/15 group-hover:border-white/35 flex items-center justify-center overflow-hidden shrink-0 transition-colors shadow-md bg-charcoal-800">
                  <ArtworkImage
                    src={undefined}
                    alt={relArtist.name}
                    className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform duration-300"
                    fallbackIconClassName="w-6 h-6 text-neutral-400"
                  />
                </div>

                <div className="flex flex-col items-center min-w-0 w-full">
                  <span className="font-semibold text-xs text-white truncate w-full group-hover:underline">
                    {relArtist.name}
                  </span>
                  <span className="text-[10px] text-neutral-400 truncate mt-0.5">
                    Artist
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State when no content is present */}
      {!hasTopSongs && !hasAlbums && !hasSingles && (
        <div className="p-8 text-center text-neutral-400 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
          <p className="text-sm">No tracks or albums are currently listed for this artist.</p>
        </div>
      )}
    </div>
  );
};
