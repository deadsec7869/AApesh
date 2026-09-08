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
} from 'lucide-react';
import { api } from '@/api/client';
import { HomeResponse, Track, ShelfItem } from '@/types/music';
import { SkeletonHero, SkeletonCard } from '@/components/common/Skeletons';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { TrackRow } from '@/components/music/TrackRow';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { playTrack } = usePlayerStore();

  const [homeData, setHomeData] = useState<HomeResponse | null>(null);
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const topMixesRef = useRef<HTMLDivElement>(null);

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

  const scrollMixes = (direction: 'left' | 'right') => {
    if (topMixesRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      topMixesRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
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

  // Spotify-Style 6-Card Quick-Jump Items
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

  // Visual Reference Image 2: Top Recommendation Cards
  const topRecommendations = [
    {
      title: 'Devil In A New Dress (feat. Rick Ross)',
      artist: 'Kanye West',
      thumbnail:
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&h=400&q=80',
      query: 'Kanye West Devil In A New Dress',
      accentColor: '#dc2626',
    },
    {
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      thumbnail:
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&h=400&q=80',
      query: 'The Weeknd Blinding Lights',
      accentColor: '#f59e0b',
    },
    {
      title: 'Memory Reboot',
      artist: 'VØJ, Narvent',
      thumbnail:
        'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&h=400&q=80',
      query: 'VOJ Narvent Memory Reboot',
      accentColor: '#06b6d4',
    },
  ];

  // Visual Reference Image 2: Following Artists
  const followingArtists = [
    {
      name: 'Linkin Park',
      songs: '241 songs',
      thumbnail:
        'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?auto=format&fit=crop&w=250&h=250&q=80',
      query: 'Linkin Park',
    },
    {
      name: 'The Weeknd',
      songs: '147 songs',
      thumbnail:
        'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=250&h=250&q=80',
      query: 'The Weeknd',
    },
    {
      name: 'Greyhounds',
      songs: '412 songs',
      thumbnail:
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=250&h=250&q=80',
      query: 'Greyhounds band',
    },
    {
      name: 'Tesco Disco',
      songs: '29 songs',
      thumbnail:
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=250&h=250&q=80',
      query: 'Tesco Disco',
    },
    {
      name: 'Ferrari Boyz',
      songs: '725 songs',
      thumbnail:
        'https://images.unsplash.com/photo-1445985543470-41fdd6ce755a?auto=format&fit=crop&w=250&h=250&q=80',
      query: 'Ferrari Boyz Gucci Mane',
    },
    {
      name: 'White Mustang',
      songs: '780 songs',
      thumbnail:
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=250&h=250&q=80',
      query: 'White Mustang Lana Del Rey',
    },
  ];

  // Visual Reference Image 2: Continue Playing Track Rows
  const continuePlayingTracks = [
    {
      title: 'Devil In A New Dress (feat. Rick Ross)',
      artist: 'Kanye West',
      thumbnail:
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=200&h=200&q=80',
      plays: '120k',
      query: 'Kanye West Devil In A New Dress',
    },
    {
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      thumbnail:
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&h=200&q=80',
      plays: '120k',
      query: 'The Weeknd Blinding Lights',
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6 md:p-10 flex flex-col gap-10">
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
    <div className="p-6 md:p-10 flex flex-col gap-9 animate-in fade-in duration-300">
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
          2. SPOTIFY-STYLE 6-CARD QUICK JUMP GRID (iOS 28 Liquid Glass Squircles)
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
                <img
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
          3. TOP RECOMMENDATION SHELF (Exact Visual Direction: Screenshot 3)
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

        {/* 4 Compact Squircle Cards (as shown in Screenshot 3) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
          {(recommendations.length >= 4 ? recommendations.slice(0, 4) : [
            {
              videoId: 'dummy-1',
              title: 'Lahanga Se Mahanga (feat. Niharica Raizada)',
              artists: [{ name: 'Pawan Singh, Shivani Singh' }],
              thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&h=400&q=80',
            },
            {
              videoId: 'dummy-2',
              title: 'HIGHEST IN THE ROOM',
              artists: [{ name: 'Travis Scott' }],
              thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&h=400&q=80',
            },
            {
              videoId: 'dummy-3',
              title: 'SICKO MODE',
              artists: [{ name: 'Travis Scott' }],
              thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&h=400&q=80',
            },
            {
              videoId: 'dummy-4',
              title: 'Magnolia',
              artists: [{ name: 'Playboi Carti' }],
              thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&h=400&q=80',
            },
          ]).map((item: any) => (
            <div
              key={item.videoId || item.title}
              onClick={() => {
                if (item.videoId && !item.videoId.startsWith('dummy')) {
                  playTrack(item, recommendations);
                } else {
                  handlePlayMix(item.title, `${item.title} ${item.artists?.[0]?.name || ''}`);
                }
              }}
              className="group relative flex flex-col p-3 sm:p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/15 transition-all duration-200 overflow-hidden cursor-pointer"
            >
              {/* Artwork Container */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-charcoal-800 shadow-lg mb-3">
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out-expo"
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
                  {item.artists?.map((a: any) => a.name).join(', ') || item.artist}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================================
          4. FOLLOWING ARTISTS & CONTINUE PLAYING (Exact Visual Direction: Image 2)
          ==================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left (2/3 width on xl): Circular Following Artists */}
        <section className="xl:col-span-2 flex flex-col gap-4 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Following Artists
          </h2>

          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 min-w-0">
            {followingArtists.map((artist) => (
              <div
                key={artist.name}
                onClick={() => navigate(`/search?q=${encodeURIComponent(artist.query)}`)}
                className="group flex flex-col items-center text-center gap-2 p-1.5 rounded-2xl hover:bg-white/[0.04] transition-all cursor-pointer min-w-0"
              >
                {/* Circular Avatar */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 aapesh-avatar-ring flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={artist.thumbnail}
                    alt={artist.name}
                    className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                    <Play className="w-5 h-5 text-white fill-current translate-x-0.5" />
                  </div>
                </div>

                <div className="flex flex-col items-center min-w-0 w-full px-1">
                  <span className="font-bold text-xs sm:text-sm text-white truncate w-full group-hover:underline">
                    {artist.name}
                  </span>
                  <span className="text-[11px] text-neutral-400 truncate flex items-center gap-1 mt-0.5">
                    <Headphones className="w-3 h-3 shrink-0" />
                    <span className="truncate">{artist.songs}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right (1/3 width on xl): Continue Playing Track Rows */}
        <section className="flex flex-col gap-4 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Continue Playing
          </h2>

          <div className="flex flex-col gap-2.5 min-w-0">
            {continuePlayingTracks.map((item) => (
              <div
                key={item.title}
                onClick={() => handlePlayMix(item.title, item.query)}
                className="group flex items-center justify-between gap-3 p-3 rounded-2xl glass-ios28-surface-interactive cursor-pointer min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-12 h-12 rounded-xl object-cover shrink-0 bg-charcoal-800 shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-white truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {item.artist}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 bg-white/[0.06] hover:bg-white/10 px-2.5 py-1.5 rounded-full shrink-0 border border-white/[0.06] transition-colors">
                  <Play className="w-3 h-3 fill-current text-white" />
                  <span>{item.plays}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ====================================================================
          5. CURATED HERO MIXES: Wide Hero Mix + Carousel Cards
          ==================================================================== */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Trending Community Playlists</span>
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scrollMixes('left')}
              aria-label="Previous mixes"
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollMixes('right')}
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
          className="flex items-stretch gap-4 overflow-x-auto pb-2 scroll-smooth no-scrollbar"
        >
          {/* A. Wide Hero Card: Late Night Essentials */}
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
          6. QUICK PICKS (Live Recommendations from YouTube Music)
          ==================================================================== */}
      {recommendations.length > 0 && (
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
            {recommendations.slice(0, 8).map((track, idx) => (
              <TrackRow
                key={track.videoId}
                track={track}
                index={idx}
                contextQueue={recommendations}
              />
            ))}
          </div>
        </section>
      )}

      {/* ====================================================================
          7. LIVE YOUTUBE MUSIC CURATED SHELVES
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
            <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth no-scrollbar">
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
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-charcoal-700 text-neutral-500 text-sm">
                        ♪
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <button
                        aria-label={`Play ${item.title}`}
                        className="w-10 h-10 rounded-full btn-play-aapesh flex items-center justify-center shadow-play-btn scale-90 group-hover:scale-100 transition-transform duration-200 ease-out-expo"
                      >
                        <Play className="w-4 h-4 fill-current translate-x-0.5 text-black" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <h3 className="font-semibold text-xs sm:text-sm text-neutral-100 truncate group-hover:text-white transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-neutral-400 truncate mt-0.5">
                      {item.subtitle || (item.type.charAt(0).toUpperCase() + item.type.slice(1))}
                    </p>
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
