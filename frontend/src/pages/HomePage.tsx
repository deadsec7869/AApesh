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
import { getArtworkUrl } from '@/utils/artwork';

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
  const [artistPhotos, setArtistPhotos] = useState<Record<string, string>>({});

  const displayedRecs = recommendations.length > 0 ? recommendations : DEFAULT_TOP_TRACKS;

  // Derive dynamic real artists from library or live API data (No hardcoded mock data)
  const displayedArtists = React.useMemo(() => {
    if (followedArtists.length > 0) return followedArtists;
    const list: any[] = [];
    homeData?.shelves?.forEach((shelf) => {
      shelf.contents?.forEach((item) => {
        if (item.type === 'artist' && !list.find((a) => a.name === item.title)) {
          list.push({
            id: item.id || item.browseId || item.title,
            name: item.title,
            thumbnail: getArtworkUrl(item),
            browseId: item.browseId,
          });
        }
      });
    });
    if (list.length === 0 && recommendations.length > 0) {
      recommendations.forEach((rec) => {
        rec.artists?.forEach((a) => {
          if (a.name && !list.find((x) => x.name === a.name)) {
            list.push({
              id: a.id || a.name,
              name: a.name,
              browseId: a.id?.startsWith('UC') ? a.id : undefined,
              thumbnail: undefined,
            });
          }
        });
      });
    }
    return list.slice(0, 12);
  }, [followedArtists, homeData, recommendations]);

  // Asynchronously resolve authentic artist portraits for artists with genuine channel IDs
  useEffect(() => {
    displayedArtists.forEach((artist: any) => {
      const channelId = artist.browseId || (artist.id?.startsWith('UC') ? artist.id : null);
      if (!channelId || artistPhotos[channelId]) return;

      api.getArtist(channelId)
        .then((artistData) => {
          const photo = getArtworkUrl(artistData);
          if (photo) {
            setArtistPhotos((prev) => ({ ...prev, [channelId]: photo }));
          }
        })
        .catch(() => {});
    });
  }, [displayedArtists, artistPhotos]);

  const continueTrack = recentlyPlayed.length > 0 ? recentlyPlayed[0] : recommendations[0] || null;

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
    <div className="flex flex-col gap-8 animate-in fade-in duration-300 max-w-full overflow-x-hidden select-none">
      {/* ====================================================================
          1. TOP RECOMMENDATION SHELF (Screenshots 3 & 4)
          ==================================================================== */}
      <section className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Top Recommendation
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scrollContainer(topMixesRef, 'left')}
              aria-label="Previous recommendations"
              className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.12] text-neutral-400 hover:text-white flex items-center justify-center transition-colors border border-white/[0.06]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => scrollContainer(topMixesRef, 'right')}
              aria-label="Next recommendations"
              className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.12] text-neutral-400 hover:text-white flex items-center justify-center transition-colors border border-white/[0.06]"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Shelf of Compact Cards (6 visible at desktop) */}
        <div
          ref={topMixesRef}
          className="flex items-stretch gap-3.5 overflow-x-auto pb-2 pr-6 scroll-smooth no-scrollbar w-full"
        >
          {displayedRecs.map((item, idx) => (
            <div
              key={item.videoId || item.title || idx}
              onClick={() => {
                playTrack(item, displayedRecs);
              }}
              className="group relative w-[170px] sm:w-[185px] md:w-[195px] shrink-0 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.07] hover:border-white/15 transition-all duration-200 cursor-pointer flex flex-col gap-2.5"
            >
              {/* Artwork Container with Top-Left Play Badge */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-charcoal-800 shadow-md">
                <ArtworkImage
                  item={item}
                  src={getArtworkUrl(item)}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out-expo"
                  fallbackIconClassName="w-6 h-6 text-neutral-400"
                />
                {/* Subtle top-left play icon badge */}
                <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10">
                  <Play className="w-2.5 h-2.5 fill-current text-white translate-x-0.5" />
                </div>
                {/* Hover Play Button Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full btn-play-aapesh flex items-center justify-center shadow-xl scale-95 group-hover:scale-100 transition-transform">
                    <Play className="w-4 h-4 fill-current translate-x-0.5 text-black" />
                  </div>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="flex flex-col min-w-0 px-0.5">
                <h3 className="font-semibold text-xs sm:text-sm text-white truncate group-hover:text-white transition-colors" title={item.title}>
                  {item.title}
                </h3>
                <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                  {item.album || item.artists?.map((a: any) => a.name).join(', ') || 'Playlist'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================================
          2. FOLLOWING ARTISTS & CONTINUE PLAYING (Screenshots 3 & 4 Grid)
          ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Following Artists Horizontal Circular Rail (~60% width) */}
        <section className="lg:col-span-7 flex flex-col gap-3.5 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Following Artists
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollContainer(followedArtistsRef, 'left')}
                aria-label="Previous artists"
                className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.12] text-neutral-400 hover:text-white flex items-center justify-center transition-colors border border-white/[0.06]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => scrollContainer(followedArtistsRef, 'right')}
                aria-label="Next artists"
                className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.12] text-neutral-400 hover:text-white flex items-center justify-center transition-colors border border-white/[0.06]"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={followedArtistsRef}
            className="flex gap-4 overflow-x-auto pb-2 pr-6 scroll-smooth no-scrollbar w-full"
          >
            {displayedArtists.map((artist: any, artistIdx: number) => {
              const artistPhoto =
                artist.thumbnail ||
                (artist.browseId ? artistPhotos[artist.browseId] : null) ||
                (artist.id ? artistPhotos[artist.id] : null);

              return (
                <div
                  key={`${artist.id || artist.name}-${artistIdx}`}
                  onClick={() => navigate(artist.browseId ? `/artist/${artist.browseId}` : `/search/${encodeURIComponent(artist.name)}`)}
                  className="group flex flex-col items-center text-center gap-2 p-1.5 rounded-2xl hover:bg-white/[0.04] transition-all cursor-pointer w-20 sm:w-24 shrink-0 min-w-0"
                >
                  {/* Circular Artwork Avatar */}
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 border border-white/15 group-hover:border-white/35 flex items-center justify-center overflow-hidden shrink-0 transition-colors shadow-md bg-charcoal-800">
                    <ArtworkImage
                      item={artist}
                      src={artistPhoto}
                      alt={artist.name}
                      className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform duration-300"
                      fallbackIcon={<User className="w-6 h-6 text-neutral-400" />}
                    />
                  </div>

                  <div className="flex flex-col items-center min-w-0 w-full">
                    <span className="font-semibold text-xs text-white truncate w-full group-hover:underline">
                      {artist.name}
                    </span>
                    <span className="text-[10px] text-neutral-400 truncate mt-0.5">
                      Artist
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* RIGHT: Continue Playing Compact Glass Row (~40% width) */}
        <section className="lg:col-span-5 flex flex-col gap-3.5 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Continue Playing
            </h2>
          </div>

          {/* Compact Glass Row (Screenshot 3 & 4 Match) */}
          {continueTrack ? (
            <div
              onClick={() => {
                playTrack(continueTrack, recentlyPlayed.length > 0 ? recentlyPlayed : displayedRecs);
              }}
              className="group relative flex items-center justify-between gap-3.5 p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/15 backdrop-blur-xl shadow-lg transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-charcoal-800 shrink-0 shadow-md">
                  <ArtworkImage
                    item={continueTrack}
                    src={getArtworkUrl(continueTrack)}
                    alt={continueTrack.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    fallbackIconClassName="w-5 h-5 text-neutral-400"
                  />
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <div className="font-semibold text-sm text-white truncate group-hover:text-white">
                    {continueTrack.title}
                  </div>
                  <div className="text-xs text-neutral-400 truncate mt-0.5">
                    {continueTrack.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist'}
                  </div>
                </div>
              </div>

              {/* Right Meta Pill: Play count + Like Heart */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-mono text-neutral-300">
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>{continueTrack.duration || '3:30'}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    useLibraryStore.getState().toggleLike(continueTrack);
                  }}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Heart className={`w-4 h-4 ${useLibraryStore.getState().isLiked(continueTrack.videoId) ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-neutral-400 flex items-center justify-between">
              <span>Select any song to begin playback.</span>
              <button onClick={() => navigate('/search')} className="text-white hover:underline font-semibold">Explore</button>
            </div>
          )}
        </section>
      </div>

      {/* ====================================================================
          3. TRENDING COMMUNITY PLAYLISTS (Screenshots 3 & 4)
          ==================================================================== */}
      <section className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Trending community playlists
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scrollContainer(recentlyPlayedRef, 'left')}
              aria-label="Previous playlists"
              className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.12] text-neutral-400 hover:text-white flex items-center justify-center transition-colors border border-white/[0.06]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => scrollContainer(recentlyPlayedRef, 'right')}
              aria-label="Next playlists"
              className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.12] text-neutral-400 hover:text-white flex items-center justify-center transition-colors border border-white/[0.06]"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Shelf of Trending Playlists */}
        <div
          ref={recentlyPlayedRef}
          className="flex items-stretch gap-3.5 overflow-x-auto pb-2 scroll-smooth no-scrollbar w-full"
        >
          {quickJumpCards.map((card, idx) => (
            <div
              key={card.title || idx}
              onClick={() => handleQuickJump(card)}
              className="group relative w-[170px] sm:w-[185px] md:w-[195px] shrink-0 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.07] hover:border-white/15 transition-all duration-200 cursor-pointer flex flex-col gap-2.5"
            >
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-charcoal-800 shadow-md">
                {card.type === 'liked' ? (
                  <div className="w-full h-full bg-charcoal-800 border-r border-white/10 flex items-center justify-center">
                    <Heart className="w-8 h-8 text-rose-500 fill-current drop-shadow-md" />
                  </div>
                ) : (
                  <ArtworkImage
                    src={card.thumbnail}
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out-expo"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full btn-play-aapesh flex items-center justify-center shadow-xl scale-95 group-hover:scale-100 transition-transform">
                    <Play className="w-4 h-4 fill-current translate-x-0.5 text-black" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col min-w-0 px-0.5">
                <h3 className="font-semibold text-xs sm:text-sm text-white truncate group-hover:text-white" title={card.title}>
                  {card.title}
                </h3>
                <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                  {card.subtitle}
                </p>
              </div>
            </div>
          ))}
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
                      item={item}
                      src={getArtworkUrl(item)}
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
