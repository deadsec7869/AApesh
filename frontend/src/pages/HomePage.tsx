import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Play,
  ChevronLeft,
  ChevronRight,
  Radio,
  Clock,
  Heart,
  RotateCw,
  Headphones,
  User,
} from 'lucide-react';
import { api } from '@/api/client';
import { HomeResponse, Track, ShelfItem } from '@/types/music';
import { SkeletonHero, SkeletonCard } from '@/components/common/Skeletons';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { TrackRow } from '@/components/music/TrackRow';
import { ArtworkImage } from '@/components/common/ArtworkImage';

const DEFAULT_TOP_TRACKS: Track[] = [
  {
    videoId: '4NRXx6U8ABQ',
    title: 'Blinding Lights',
    artists: [{ name: 'The Weeknd' }],
    album: 'After Hours',
    duration: '3:20',
    duration_seconds: 200,
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&h=400&q=80',
  },
  {
    videoId: 'nYh-n7EOtMA',
    title: 'SICKO MODE',
    artists: [{ name: 'Travis Scott' }],
    album: 'ASTROWORLD',
    duration: '5:12',
    duration_seconds: 312,
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&h=400&q=80',
  },
  {
    videoId: 'JGwWNGJdvx8',
    title: 'Shape of You',
    artists: [{ name: 'Ed Sheeran' }],
    album: '÷ (Divide)',
    duration: '3:53',
    duration_seconds: 233,
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&h=400&q=80',
  },
  {
    videoId: 'L3wKzyIN1yk',
    title: 'Starboy',
    artists: [{ name: 'The Weeknd, Daft Punk' }],
    album: 'Starboy',
    duration: '3:50',
    duration_seconds: 230,
    thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&h=400&q=80',
  },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { playTrack, recentlyPlayed } = usePlayerStore();
  const { followedArtists } = useLibraryStore();

  const [homeData, setHomeData] = useState<HomeResponse | null>(null);
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const displayedRecs = recommendations.length > 0 ? recommendations : DEFAULT_TOP_TRACKS;

  const topMixesRef = useRef<HTMLDivElement>(null);
  const recentlyPlayedRef = useRef<HTMLDivElement>(null);
  const followedArtistsRef = useRef<HTMLDivElement>(null);

  const categories = ['All', 'Music', 'Chill', 'Focus', 'Energy', 'Late Night'];

  // Dynamic time-based greeting (Apple Music + Spotify hallmark)
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      api.getHome(6).catch(() => ({ shelves: [] })),
      api.getRecommendations(12).catch(() => []),
    ])
      .then(([homeRes, recs]) => {
        if (isMounted) {
          setHomeData(homeRes);
          setRecommendations(recs);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleShelfItemClick = (item: ShelfItem) => {
    if (item.type === 'song' && item.videoId) {
      playTrack({
        videoId: item.videoId,
        title: item.title,
        artists: item.artists || [],
        thumbnail: item.thumbnail,
      });
    } else if (item.type === 'album' && item.browseId) {
      navigate(`/album/${item.browseId}`);
    } else if (item.type === 'artist' && item.browseId) {
      navigate(`/artist/${item.browseId}`);
    } else if (item.type === 'playlist' && (item.id || item.browseId)) {
      navigate(`/playlist/${item.id || item.browseId}`);
    }
  };

  // Play a mix using recommendations or search
  const handlePlayMix = (mixTitle: string, query: string) => {
    if (recommendations.length > 0) {
      playTrack(
        {
          videoId: recommendations[0].videoId,
          title: mixTitle,
          artists: [{ name: 'Curated by AAPESH' }],
          thumbnail: recommendations[0].thumbnail,
        },
        recommendations
      );
    } else {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  // 6-Card Quick-Jump Items
  const quickJumpCards = [
    {
      title: 'Liked Songs',
      subtitle: 'Your Saved Tracks',
      type: 'liked',
      path: '/library/liked',
    },
    {
      title: 'Late Night Essentials',
      subtitle: 'Curated Night Moods',
      thumbnail:
        'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=200&h=200&q=80',
      query: 'late night chill beats',
    },
    {
      title: 'Discover Weekly',
      subtitle: 'Weekly Fresh Indiscovery',
      thumbnail:
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=200&h=200&q=80',
      query: 'discover weekly mix',
    },
    {
      title: 'Daily Mix 1',
      subtitle: 'Bonobo, Tycho, ODESZA',
      thumbnail:
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=200&h=200&q=80',
      query: 'Bonobo Tycho Odesza',
    },
    {
      title: 'Chill Study Beats',
      subtitle: 'Lofi & Deep Instrumental',
      thumbnail:
        'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=200&h=200&q=80',
      query: 'lofi chill study beats relaxing',
    },
    {
      title: 'Focus Flow',
      subtitle: 'Ambient Concentration',
      thumbnail:
        'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=200&h=200&q=80',
      query: 'ambient focus flow instrumental',
    },
  ];

  const handleQuickJump = (card: (typeof quickJumpCards)[0]) => {
    if (card.path) {
      navigate(card.path);
    } else if (card.query) {
      handlePlayMix(card.title, card.query);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-10 flex flex-col gap-10 pb-28">
        <SkeletonHero />
        <div className="flex flex-col gap-4">
          <div className="h-6 w-40 bg-white/10 rounded shimmer" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 flex flex-col gap-9 animate-in fade-in duration-300 max-w-full overflow-x-hidden">
      {/* ====================================================================
          1. HEADER: Dynamic Time-Based Greeting + Category Pills
          ==================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
              Guest Mode • Unlimited Spatial Streaming
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
            {getGreeting()}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl">
            Stream millions of tracks ad-free with lossless clarity in open guest mode.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-xs rounded-full transition-all duration-200 ${
                selectedCategory === cat
                  ? 'glass-ios28-pill-active'
                  : 'glass-ios28-pill text-neutral-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ====================================================================
          2. QUICK RECOMMENDATION / CONTENT AREA (Quick-Jump Grid)
          ==================================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {quickJumpCards.map((card) => (
          <div
            key={card.title}
            onClick={() => handleQuickJump(card)}
            className="group relative flex items-center gap-3.5 pr-4 rounded-2xl glass-ios28-surface-interactive overflow-hidden cursor-pointer"
          >
            {/* Left Image Container */}
            <div className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 bg-charcoal-800 flex items-center justify-center overflow-hidden">
              {card.type === 'liked' ? (
                <div className="w-full h-full bg-charcoal-800 border-r border-white/10 flex items-center justify-center">
                  <Heart className="w-7 h-7 text-rose-500 fill-current drop-shadow-md" />
                </div>
              ) : (
                <ArtworkImage
                  src={card.thumbnail}
                  alt={card.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out-expo"
                />
              )}
            </div>

            {/* Middle Title & Subtitle */}
            <div className="min-w-0 flex-1 py-2">
              <div className="font-bold text-sm text-white truncate group-hover:text-white transition-colors">
                {card.title}
              </div>
              <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                {card.subtitle}
              </div>
            </div>

            {/* Right Play Button (Reveals on Hover) */}
            <div className="opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 ease-out-expo shrink-0">
              <div className="w-10 h-10 rounded-full btn-play-aapesh flex items-center justify-center shadow-lg">
                <Play className="w-4 h-4 fill-current translate-x-0.5 text-black" />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ====================================================================
          3. RECENTLY PLAYED SECTION (Real History, Denser Layout & Error Fallback)
          ==================================================================== */}
      <section className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-300" />
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Recently Played
            </h2>
          </div>
          {recentlyPlayed.length > 5 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollContainer(recentlyPlayedRef, 'left')}
                aria-label="Previous recently played"
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollContainer(recentlyPlayedRef, 'right')}
                aria-label="Next recently played"
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {recentlyPlayed.length > 0 ? (
          <div
            ref={recentlyPlayedRef}
            className="flex gap-3.5 overflow-x-auto pb-3 pt-1 pr-4 scroll-smooth no-scrollbar w-full"
          >
            {recentlyPlayed.map((track) => (
              <div
                key={track.videoId}
                onClick={() => playTrack(track, recentlyPlayed)}
                className="group relative flex flex-col p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/15 transition-all duration-200 cursor-pointer w-32 sm:w-36 md:w-40 shrink-0 min-w-0"
              >
                {/* Artwork Container */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-charcoal-800 shadow-md mb-2">
                  <ArtworkImage
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out-expo"
                    fallbackIconClassName="w-5 h-5 text-neutral-400"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full btn-play-aapesh flex items-center justify-center shadow-lg scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-3.5 h-3.5 fill-current translate-x-0.5 text-black" />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-col min-w-0 px-0.5">
                  <div className="font-semibold text-xs sm:text-sm text-white truncate group-hover:text-white">
                    {track.title}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-neutral-400 truncate mt-0.5">
                    {track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-neutral-400 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-white">Nothing played yet</span>
              <span className="text-xs text-neutral-400 mt-0.5">
                Start listening and your recent tracks will appear here.
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ====================================================================
          4. FOLLOWING ARTISTS SECTION (Real Followed Artists & Compact Rail)
          ==================================================================== */}
      <section className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-300" />
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Following Artists
            </h2>
          </div>
          {followedArtists.length > 5 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollContainer(followedArtistsRef, 'left')}
                aria-label="Previous following artists"
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollContainer(followedArtistsRef, 'right')}
                aria-label="Next following artists"
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {followedArtists.length > 0 ? (
          <div
            ref={followedArtistsRef}
            className="flex gap-4 overflow-x-auto pb-3 pt-1 pr-4 scroll-smooth no-scrollbar w-full"
          >
            {followedArtists.map((artist) => (
              <div
                key={artist.id}
                onClick={() => navigate(`/artist/${artist.id}`)}
                className="group flex flex-col items-center text-center gap-2 p-2 rounded-2xl hover:bg-white/[0.04] transition-all cursor-pointer w-24 sm:w-28 shrink-0 min-w-0"
              >
                {/* Circular Artwork */}
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 border border-white/15 group-hover:border-white/35 flex items-center justify-center overflow-hidden shrink-0 transition-colors shadow-md">
                  <ArtworkImage
                    src={artist.thumbnail}
                    alt={artist.name}
                    className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform duration-300"
                    fallbackIconClassName="w-5 h-5 text-neutral-400"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                    <Play className="w-4 h-4 text-white fill-current translate-x-0.5" />
                  </div>
                </div>

                <div className="flex flex-col items-center min-w-0 w-full px-1">
                  <span className="font-semibold text-xs text-white truncate w-full group-hover:underline">
                    {artist.name}
                  </span>
                  <span className="text-[10px] text-neutral-400 truncate mt-0.5">
                    {artist.songs || 'Artist'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-neutral-400 shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-white">No followed artists</span>
              <span className="text-xs text-neutral-400 mt-0.5">
                Follow artists to build your artist rail.
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ====================================================================
          5. TOP RECOMMENDATION / DISCOVERY CONTENT
          ==================================================================== */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Top Recommendation
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsLoading(true);
                api.getRecommendations(12).then(setRecommendations).finally(() => setIsLoading(false));
              }}
              aria-label="Refresh recommendations"
              className="p-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Compact Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
          {displayedRecs.slice(0, 4).map((item) => (
            <div
              key={item.videoId || item.title}
              onClick={() => {
                playTrack(item, displayedRecs);
              }}
              className="group relative flex flex-col p-3 sm:p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/15 transition-all duration-200 overflow-hidden cursor-pointer"
            >
              {/* Artwork Container */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-charcoal-800 shadow-lg mb-3">
                <ArtworkImage
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out-expo"
                  fallbackIconClassName="w-6 h-6 text-neutral-400"
                />
                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full btn-play-aapesh flex items-center justify-center shadow-xl scale-95 group-hover:scale-100 transition-transform">
                    <Play className="w-4 h-4 fill-current translate-x-0.5 text-black" />
                  </div>
                </div>
              </div>

              {/* Title & Artist */}
              <div className="flex flex-col min-w-0">
                <h3 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-white transition-colors">
                  {item.title}
                </h3>
                <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                  {item.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================================
          6. CURATED HERO MIXES: Wide Hero Mix + Carousel Cards
          ==================================================================== */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Trending Community Playlists</span>
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scrollContainer(topMixesRef, 'left')}
              aria-label="Previous mixes"
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollContainer(topMixesRef, 'right')}
              aria-label="Next mixes"
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Carousel Row */}
        <div
          ref={topMixesRef}
          className="flex items-stretch gap-4 overflow-x-auto pb-2 scroll-smooth no-scrollbar w-full"
        >
          {/* A. Wide Hero Card */}
          <div
            onClick={() => handlePlayMix('Late Night Essentials', 'late night chill beats')}
            className="group relative w-[300px] sm:w-[380px] md:w-[420px] aspect-[16/10] squircle-28 overflow-hidden shadow-2xl cursor-pointer shrink-0 border border-white/10 bg-charcoal-800"
          >
            <img
              src="https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=700&h=420&q=80"
              alt="Late Night Essentials"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out-expo"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="w-14 h-14 rounded-full btn-play-aapesh flex items-center justify-center shadow-xl scale-95 group-hover:scale-100 transition-transform duration-200">
                <Play className="w-5 h-5 fill-current translate-x-0.5 text-black" />
              </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 p-5 flex flex-col gap-1 z-10">
              <h3 className="text-xl md:text-2xl font-extrabold text-white tracking-tight drop-shadow-md">
                Late Night Essentials
              </h3>
              <p className="text-[10px] md:text-xs font-semibold tracking-wider text-neutral-300 uppercase">
                Curated for you • 60 songs
              </p>
            </div>
          </div>

          {/* B. Daily Mix 1 */}
          <div
            onClick={() => handlePlayMix('Daily Mix 1', 'Bonobo Tycho Odesza')}
            className="group relative w-44 md:w-52 squircle-24 p-3.5 glass-ios28-surface-interactive flex flex-col gap-3 cursor-pointer shrink-0"
          >
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-charcoal-800 shadow-artwork">
              <img
                src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=350&h=350&q=80"
                alt="Daily Mix 1"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white">
                Daily Mix 1
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <div className="w-10 h-10 rounded-full btn-play-aapesh flex items-center justify-center shadow-lg">
                  <Play className="w-4 h-4 fill-current translate-x-0.5 text-black" />
                </div>
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white truncate">Daily Mix 1</span>
              <span className="text-xs text-neutral-400 truncate mt-0.5">Bonobo, Tycho, ODESZA</span>
            </div>
          </div>

          {/* C. Discover Weekly */}
          <div
            onClick={() => handlePlayMix('Discover Weekly', 'discover weekly mix')}
            className="group relative w-44 md:w-52 squircle-24 p-3.5 glass-ios28-surface-interactive flex flex-col gap-3 cursor-pointer shrink-0"
          >
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-charcoal-800 shadow-artwork">
              <img
                src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=350&h=350&q=80"
                alt="Discover Weekly"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white">
                Discover Weekly
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <div className="w-10 h-10 rounded-full btn-play-aapesh flex items-center justify-center shadow-lg">
                  <Play className="w-4 h-4 fill-current translate-x-0.5 text-black" />
                </div>
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white truncate">Discover Weekly</span>
              <span className="text-xs text-neutral-400 truncate mt-0.5">Weekly fresh tracks</span>
            </div>
          </div>

          {/* D. Aesthetic Beats */}
          <div
            onClick={() => handlePlayMix('Aesthetic Beats', 'aesthetic chill synthwave')}
            className="group relative w-44 md:w-52 squircle-24 p-3.5 glass-ios28-surface-interactive flex flex-col gap-3 cursor-pointer shrink-0"
          >
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-charcoal-800 shadow-artwork">
              <img
                src="https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=350&h=350&q=80"
                alt="Aesthetic Beats"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white">
                Aesthetic Beats
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <div className="w-10 h-10 rounded-full btn-play-aapesh flex items-center justify-center shadow-lg">
                  <Play className="w-4 h-4 fill-current translate-x-0.5 text-black" />
                </div>
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white truncate">Aesthetic Beats</span>
              <span className="text-xs text-neutral-400 truncate mt-0.5">Lofi chill instrumentals</span>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          7. QUICK PICKS (Live Recommendations from YouTube Music)
          ==================================================================== */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-white" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Quick Picks for You
            </h2>
          </div>
          <span className="text-xs text-neutral-400">Stream now</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {displayedRecs.slice(0, 8).map((track, idx) => (
            <TrackRow
              key={track.videoId}
              track={track}
              index={idx}
              contextQueue={displayedRecs}
            />
          ))}
        </div>
      </section>

      {/* ====================================================================
          8. LIVE YOUTUBE MUSIC CURATED SHELVES
          ==================================================================== */}
      {homeData?.shelves?.map((shelf, shelfIdx) => {
        if (!shelf.contents || shelf.contents.length === 0) return null;
        return (
          <section key={shelfIdx} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-neutral-400" />
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {shelf.title}
                </h2>
              </div>
            </div>

            {/* Horizontal Scroll */}
            <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth no-scrollbar w-full">
              {shelf.contents.map((item, itemIdx) => (
                <div
                  key={`${item.id}-${itemIdx}`}
                  onClick={() => handleShelfItemClick(item)}
                  className="group relative flex flex-col gap-2.5 p-2.5 rounded-2xl transition-all duration-200 ease-out-expo cursor-pointer bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] w-40 sm:w-44 md:w-48 shrink-0"
                >
                  <div
                    className={`relative aspect-square w-full overflow-hidden bg-charcoal-800 shadow-artwork ${
                      item.type === 'artist' ? 'rounded-full' : 'rounded-xl'
                    }`}
                  >
                    <ArtworkImage
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      fallbackIconClassName="w-5 h-5 text-neutral-400"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="w-10 h-10 rounded-full btn-play-aapesh flex items-center justify-center shadow-lg">
                        <Play className="w-4 h-4 fill-current translate-x-0.5 text-black" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-white">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {item.subtitle || item.artists?.map((a) => a.name).join(', ') || ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};
