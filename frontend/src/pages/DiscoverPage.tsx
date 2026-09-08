import React, { useEffect, useState } from 'react';
import { Compass, Trophy, Users, Sparkles, Music2 } from 'lucide-react';
import { api } from '@/api/client';
import { Track } from '@/types/music';
import { TrackRow } from '@/components/music/TrackRow';
import { ArtistCard } from '@/components/music/ArtistCard';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { SkeletonList, SkeletonCard } from '@/components/common/Skeletons';

export const DiscoverPage: React.FC = () => {
  const [charts, setCharts] = useState<{ country: string; videos: Track[]; artists: any[] } | null>(null);
  const [moodCategories, setMoodCategories] = useState<Record<string, any> | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodPlaylists, setMoodPlaylists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMoodPlaylists, setLoadingMoodPlaylists] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      api.getCharts('ZZ').catch(() => ({ country: 'ZZ', videos: [], artists: [] })),
      api.getMoods().catch(() => ({})),
    ])
      .then(([chartsRes, moodsRes]) => {
        if (isMounted) {
          setCharts(chartsRes);
          setMoodCategories(moodsRes);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectMood = async (params: string, label: string) => {
    setSelectedMood(label);
    setLoadingMoodPlaylists(true);
    try {
      const playlists = await api.getMoodPlaylists(params);
      setMoodPlaylists(playlists);
    } catch (err) {
      console.warn('Failed to load mood playlists:', err);
      setMoodPlaylists([]);
    } finally {
      setLoadingMoodPlaylists(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-10 flex flex-col gap-10">
        <div className="flex flex-col gap-4">
          <div className="h-8 w-48 bg-white/10 rounded shimmer" />
          <SkeletonList count={5} />
        </div>
      </div>
    );
  }

  // Extract mood tags
  const moodsAndMoments = moodCategories?.['Moods & moments'] || [];
  const genres = moodCategories?.['Genres'] || [];

  return (
    <div className="p-6 md:p-10 flex flex-col gap-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          <Compass className="w-4 h-4" />
          <span>Global Charts & Discovery</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          Discover
        </h1>
        <p className="text-sm text-neutral-400 max-w-xl">
          Explore what is trending worldwide, top artists breaking records, and playlists tuned to every mood.
        </p>
      </div>

      {/* Moods & Moments Tag Cloud */}
      {(moodsAndMoments.length > 0 || genres.length > 0) && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Moods & Moments
            </h2>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {moodsAndMoments.slice(0, 14).map((item: any, idx: number) => {
              const isSelected = selectedMood === item.title;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectMood(item.params, item.title)}
                  className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white text-black shadow-play-btn'
                      : 'bg-white/[0.05] hover:bg-white/[0.09] text-neutral-300 hover:text-white border border-white/10'
                  }`}
                >
                  {item.title}
                </button>
              );
            })}
          </div>

          {/* Mood Playlists Browser */}
          {selectedMood && (
            <div className="mt-4 flex flex-col gap-4 p-6 rounded-2xl glass-surface border border-white/10">
              <div className="flex items-center gap-2">
                <Music2 className="w-5 h-5 text-white" />
                <h3 className="font-bold text-white text-base">
                  {selectedMood} Playlists
                </h3>
              </div>

              {loadingMoodPlaylists ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : moodPlaylists.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {moodPlaylists.map((pl) => (
                    <PlaylistCard key={pl.id} playlist={pl} />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No playlists found for this mood category.
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Top Trending Music Videos / Songs */}
      {charts?.videos && charts.videos.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-white" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                Top Trending Charts
              </h2>
            </div>
            <span className="text-xs text-neutral-500">Updated Daily</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {charts.videos.slice(0, 10).map((track, idx) => (
              <TrackRow
                key={track.videoId}
                track={track}
                index={idx}
                contextQueue={charts.videos}
              />
            ))}
          </div>
        </section>
      )}

      {/* Top Artists Charts */}
      {charts?.artists && charts.artists.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-white" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                Top Charting Artists
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {charts.artists.slice(0, 6).map((artist, idx) => (
              <ArtistCard key={artist.channelId || idx} artist={artist} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
