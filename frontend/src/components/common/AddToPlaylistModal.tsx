import React, { useState } from 'react';
import { X, Plus, Check, ListMusic } from 'lucide-react';
import { Track } from '@/types/music';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { CreatePlaylistModal } from './CreatePlaylistModal';

interface AddToPlaylistModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  track,
  isOpen,
  onClose,
}) => {
  const { playlists, addTrackToPlaylist } = useLibraryStore();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  if (!isOpen || !track) return null;

  const handleSelectPlaylist = async (playlistId: string) => {
    const success = await addTrackToPlaylist(playlistId, track);
    if (success) {
      setAddedIds((prev) => new Set(prev).add(playlistId));
      setTimeout(() => {
        onClose();
      }, 700);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-sm rounded-2xl glass-modal border border-white/10 p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-lg font-bold text-white mb-1">Add to Playlist</h2>
          <p className="text-xs text-neutral-400 truncate mb-4">
            Select a playlist for <span className="text-neutral-200 font-medium">"{track.title}"</span>
          </p>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-3 p-3 mb-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-medium text-sm transition-colors border border-white/[0.08]"
          >
            <Plus className="w-4 h-4" />
            <span>New Playlist</span>
          </button>

          <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
            {playlists.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500">
                No playlists yet. Create one above!
              </div>
            ) : (
              playlists.map((pl) => {
                const isAdded = addedIds.has(pl.id);
                return (
                  <button
                    key={pl.id}
                    onClick={() => handleSelectPlaylist(pl.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.06] text-left transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-charcoal-800 flex items-center justify-center shrink-0 text-neutral-400">
                        <ListMusic className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-neutral-200 group-hover:text-white truncate">
                          {pl.title}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {pl.track_count} tracks
                        </div>
                      </div>
                    </div>

                    {isAdded && (
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <CreatePlaylistModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(id) => handleSelectPlaylist(id)}
      />
    </>
  );
};
