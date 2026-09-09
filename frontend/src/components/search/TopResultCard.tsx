import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Heart, User, Disc, ListMusic } from 'lucide-react';
import { Track, AlbumBasic, PlaylistSummary, ArtistSearchResult, TopResultData } from '@/types/music';
import { ArtworkImage } from '@/components/common/ArtworkImage';
import { getArtworkUrl } from '@/utils/artwork';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { SpotlightCard } from '@/components/react-bits';

interface TopResultProps {
  type: 'song' | 'artist' | 'album' | 'playlist' | string;
  data: TopResultData | null;
  contextSongs?: Track[];
}

export const TopResultCard: React.FC<TopResultProps> = ({
  type,
  data,
  contextSongs = [],
}) => {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { isLiked, toggleLike } = useLibraryStore();

  if (!data) return null;

  if (type === 'song') {
    const track = data as Track;
    const isCurrent = currentTrack?.videoId === track.videoId;
    const isThisPlaying = isCurrent && isPlaying;
    const liked = isLiked(track.videoId);

    return (
      <div className="flex flex-col gap-2.5 w-full">
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1">
          Top Result
        </span>
        <SpotlightCard
          onClick={() => {
            if (isCurrent) {
              togglePlay();
            } else {
              playTrack(track, contextSongs);
            }
          }}
          spotlightColor="rgba(255, 255, 255, 0.08)"
          spotlightRadius={260}
          className="flex items-center justify-between gap-5 p-4 rounded-2xl bg-[#0f1118]/80 hover:bg-[#141722]/90 backdrop-blur-2xl border border-white/[0.08] hover:border-white/20 transition-all duration-200 group max-w-xl cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-charcoal-800 shadow-md border border-white/5">
              <ArtworkImage
                item={track}
                src={getArtworkUrl(track)}
                alt={track.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                fallbackIconClassName="w-8 h-8 text-neutral-500"
              />
            </div>
            <div className="min-w-0">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-neutral-300 uppercase tracking-wider mb-1">
                Song
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {track.title}
              </h2>
              <p className="text-xs text-neutral-400 truncate mt-0.5">
                {track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                {track.duration ? ` • ${track.duration}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleLike(track);
              }}
              aria-label={liked ? 'Unlike track' : 'Like track'}
              className={`p-2 rounded-full transition-colors ${
                liked
                  ? 'text-rose-500'
                  : 'text-neutral-500 hover:text-white hover:bg-white/10'
              }`}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isCurrent) {
                  togglePlay();
                } else {
                  playTrack(track, contextSongs);
                }
              }}
              aria-label={isThisPlaying ? 'Pause' : `Play ${track.title}`}
              className="btn-play-aapesh w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-black shadow-xl hover:scale-105 active:scale-95 transition-transform shrink-0"
            >
              {isThisPlaying ? (
                <Pause className="w-5 h-5 fill-current text-black" />
              ) : (
                <Play className="w-5 h-5 fill-current translate-x-0.5 text-black" />
              )}
            </button>
          </div>
        </SpotlightCard>
      </div>
    );
  }

  if (type === 'artist') {
    const artist = data as ArtistSearchResult;

    return (
      <div className="flex flex-col gap-2.5 w-full">
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1">
          Top Result
        </span>
        <SpotlightCard
          onClick={() => navigate(`/artist/${artist.channelId}`)}
          spotlightColor="rgba(255, 255, 255, 0.08)"
          spotlightRadius={260}
          className="flex items-center justify-between gap-5 p-4 rounded-2xl bg-[#0f1118]/80 hover:bg-[#141722]/90 backdrop-blur-2xl border border-white/[0.08] hover:border-white/20 transition-all duration-200 group max-w-xl cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden shrink-0 bg-charcoal-800 shadow-md border border-white/5">
              <ArtworkImage
                item={artist}
                src={getArtworkUrl(artist)}
                alt={artist.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                fallbackIcon={<User className="w-8 h-8 text-neutral-500" />}
              />
            </div>
            <div className="min-w-0">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-neutral-300 uppercase tracking-wider mb-1">
                Artist
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {artist.name}
              </h2>
              {artist.subscribers && (
                <p className="text-xs text-neutral-400 truncate mt-0.5">
                  {artist.subscribers}
                </p>
              )}
            </div>
          </div>
        </SpotlightCard>
      </div>
    );
  }

  if (type === 'album') {
    const album = data as AlbumBasic;

    return (
      <div className="flex flex-col gap-2.5 w-full">
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1">
          Top Result
        </span>
        <SpotlightCard
          onClick={() => navigate(`/album/${album.browseId}`)}
          spotlightColor="rgba(255, 255, 255, 0.08)"
          spotlightRadius={260}
          className="flex items-center justify-between gap-5 p-4 rounded-2xl bg-[#0f1118]/80 hover:bg-[#141722]/90 backdrop-blur-2xl border border-white/[0.08] hover:border-white/20 transition-all duration-200 group max-w-xl cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-charcoal-800 shadow-md border border-white/5">
              <ArtworkImage
                item={album}
                src={getArtworkUrl(album)}
                alt={album.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                fallbackIcon={<Disc className="w-8 h-8 text-neutral-500" />}
              />
            </div>
            <div className="min-w-0">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-neutral-300 uppercase tracking-wider mb-1">
                Album
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {album.title}
              </h2>
              <p className="text-xs text-neutral-400 truncate mt-0.5">
                {album.artists?.map((a) => a.name).join(', ') || 'Various Artists'}
                {album.year ? ` • ${album.year}` : ''}
              </p>
            </div>
          </div>
        </SpotlightCard>
      </div>
    );
  }

  if (type === 'playlist') {
    const playlist = data as PlaylistSummary;

    return (
      <div className="flex flex-col gap-2.5 w-full">
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1">
          Top Result
        </span>
        <SpotlightCard
          onClick={() => navigate(`/playlist/${playlist.id}`)}
          spotlightColor="rgba(255, 255, 255, 0.08)"
          spotlightRadius={260}
          className="flex items-center justify-between gap-5 p-4 rounded-2xl bg-[#0f1118]/80 hover:bg-[#141722]/90 backdrop-blur-2xl border border-white/[0.08] hover:border-white/20 transition-all duration-200 group max-w-xl cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-charcoal-800 shadow-md border border-white/5">
              <ArtworkImage
                item={playlist}
                src={getArtworkUrl(playlist)}
                alt={playlist.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                fallbackIcon={<ListMusic className="w-8 h-8 text-neutral-500" />}
              />
            </div>
            <div className="min-w-0">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-neutral-300 uppercase tracking-wider mb-1">
                Playlist
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {playlist.title}
              </h2>
              <p className="text-xs text-neutral-400 truncate mt-0.5">
                {playlist.author || (playlist.itemCount ? `${playlist.itemCount} tracks` : 'Playlist')}
              </p>
            </div>
          </div>
        </SpotlightCard>
      </div>
    );
  }

  return null;
};
