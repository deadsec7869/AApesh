import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Library, Heart, Plus, ListMusic, Play } from 'lucide-react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { CreatePlaylistModal } from '@/components/common/CreatePlaylistModal';

export const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { playlists, likedTracks } = useLibraryStore();
  const { playTrack } = usePlayerStore();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handlePlayLiked = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (likedTracks.length > 0) {
      playTrack(likedTracks[0], likedTracks);
    }
  };

  return (
    <div className="p-6 md:p-10 flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            <Library className="w-4 h-4" />
            <span>Personal Collection</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Your Library
          </h1>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-medium text-sm transition-all duration-200 ease-out-expo shadow-play-btn hover:scale-[1.03]"
        >
          <Plus className="w-4 h-4" />
          <span>New Playlist</span>
        </button>
      </div>

      {/* Grid of Playlists & Liked Songs Hero Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Liked Songs Special Banner Card */}
        <div
          onClick={() => navigate('/library/liked')}
          className="group relative flex flex-col justify-between p-6 rounded-3xl glass-dock border border-white/10 shadow-xl cursor-pointer hover:scale-[1.02] hover:border-white/20 transition-all min-h-[220px]"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-charcoal-900 border border-white/10 flex items-center justify-center text-white shadow-md">
              <Heart className="w-6 h-6 text-rose-500 fill-current drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]" />
            </div>

            {likedTracks.length > 0 && (
              <button
                onClick={handlePlayLiked}
                aria-label="Play Liked Songs"
                className="w-12 h-12 rounded-full btn-play-aapesh text-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"
              >
                <Play className="w-5 h-5 fill-current translate-x-0.5 text-black" />
              </button>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Liked Songs</h2>
            <p className="text-sm text-neutral-400 font-medium mt-1">
              {likedTracks.length} {likedTracks.length === 1 ? 'song' : 'songs'} saved
            </p>
          </div>
        </div>

        {/* User Playlists */}
        {playlists.map((pl) => (
          <div
            key={pl.id}
            onClick={() => navigate(`/playlist/${pl.id}`)}
            className="group relative flex flex-col gap-2.5 p-2.5 rounded-xl transition-all duration-200 ease-out-expo cursor-pointer hover:bg-white/[0.04]"
          >
            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-charcoal-800 shadow-artwork">
              {pl.thumbnail_url ? (
                <img
                  src={pl.thumbnail_url}
                  alt={pl.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-charcoal-800 text-neutral-600">
                  <ListMusic className="w-16 h-16" />
                </div>
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <h3 className="font-bold text-base text-neutral-100 group-hover:text-white truncate transition-colors">
                {pl.title}
              </h3>
              <p className="text-xs text-neutral-400 truncate mt-0.5">
                {pl.track_count} {pl.track_count === 1 ? 'track' : 'tracks'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <CreatePlaylistModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
};
