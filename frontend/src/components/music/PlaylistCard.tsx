import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ListMusic } from 'lucide-react';
import { PlaylistSummary } from '@/types/music';
import { api } from '@/api/client';
import { usePlayerStore } from '@/stores/usePlayerStore';

interface PlaylistCardProps {
  playlist: PlaylistSummary;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist }) => {
  const navigate = useNavigate();
  const { playTrack } = usePlayerStore();

  const handleCardClick = () => {
    navigate(`/playlist/${playlist.id}`);
  };

  const handleQuickPlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const fullPlaylist = await api.getPlaylist(playlist.id);
      if (fullPlaylist.tracks && fullPlaylist.tracks.length > 0) {
        playTrack(fullPlaylist.tracks[0], fullPlaylist.tracks);
      }
    } catch (err) {
      console.error('Failed to play playlist:', err);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col gap-2.5 p-2.5 rounded-xl transition-all duration-200 ease-out-expo cursor-pointer hover:bg-white/[0.04]"
    >
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-charcoal-800 shadow-artwork">
        {playlist.thumbnail ? (
          <img
            src={playlist.thumbnail}
            alt={playlist.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-charcoal-800 text-neutral-600">
            <ListMusic className="w-12 h-12" />
          </div>
        )}

        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <button
            onClick={handleQuickPlay}
            aria-label={`Play ${playlist.title}`}
            className="w-11 h-11 rounded-full bg-white/90 text-black flex items-center justify-center shadow-play-btn transition-transform duration-200 ease-out-expo scale-90 group-hover:scale-100 hover:scale-105"
          >
            <Play className="w-5 h-5 fill-current translate-x-0.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col min-w-0">
        <h3 className="font-semibold text-sm text-neutral-100 truncate group-hover:text-white transition-colors">
          {playlist.title}
        </h3>
        <p className="text-xs text-neutral-400 truncate mt-0.5">
          {playlist.author || (playlist.itemCount ? `${playlist.itemCount} tracks` : 'Playlist')}
        </p>
      </div>
    </div>
  );
};
