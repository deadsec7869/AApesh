import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { AlbumBasic } from '@/types/music';
import { api } from '@/api/client';
import { usePlayerStore } from '@/stores/usePlayerStore';

interface AlbumCardProps {
  album: AlbumBasic;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({ album }) => {
  const navigate = useNavigate();
  const { playTrack } = usePlayerStore();

  const handleCardClick = () => {
    navigate(`/album/${album.browseId}`);
  };

  const handleQuickPlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const fullAlbum = await api.getAlbum(album.browseId);
      if (fullAlbum.tracks && fullAlbum.tracks.length > 0) {
        playTrack(fullAlbum.tracks[0], fullAlbum.tracks);
      }
    } catch (err) {
      console.error('Failed to quick play album:', err);
    }
  };

  const artistNames = album.artists?.map((a) => a.name).join(', ') || 'Various Artists';

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col gap-2.5 p-2.5 rounded-xl transition-all duration-200 ease-out-expo cursor-pointer hover:bg-white/[0.04]"
    >
      {/* Artwork Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-charcoal-800 shadow-artwork">
        {album.thumbnail ? (
          <img
            src={album.thumbnail}
            alt={album.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-charcoal-800 text-neutral-600">
            Album
          </div>
        )}

        {/* Ambient Hover Overlay & Floating Play Button */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <button
            onClick={handleQuickPlay}
            aria-label={`Play ${album.title}`}
            className="w-11 h-11 rounded-full bg-white/90 text-black flex items-center justify-center shadow-play-btn transition-transform duration-200 ease-out-expo scale-90 group-hover:scale-100 hover:scale-105"
          >
            <Play className="w-5 h-5 fill-current translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-col min-w-0">
        <h3 className="font-semibold text-sm text-neutral-100 truncate group-hover:text-white transition-colors">
          {album.title}
        </h3>
        <p className="text-xs text-neutral-400 truncate mt-0.5">
          {album.year ? `${album.year} • ` : ''}
          {artistNames}
        </p>
      </div>
    </div>
  );
};
