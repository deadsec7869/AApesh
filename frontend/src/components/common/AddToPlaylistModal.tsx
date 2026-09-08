import React, { useState } from 'react';
import { X, Plus, Check, ListMusic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Track } from '@/types/music';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { CreatePlaylistModal } from './CreatePlaylistModal';
import {
  modalBackdropVariants,
  modalSurfaceVariants,
  controlButtonHover,
  controlButtonTap,
} from '@/lib/motion';

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

  const handleSelectPlaylist = async (playlistId: string) => {
    if (!track) return;
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
      <AnimatePresence>
        {isOpen && track && (
          <motion.div
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <motion.div
              variants={modalSurfaceVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl glass-modal border border-white/10 p-6 shadow-2xl flex flex-col max-h-[80vh]"
            >
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={onClose}
                className="absolute top-5 right-5 p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>

              <h2 className="text-lg font-bold text-white mb-1">Add to Playlist</h2>
              <p className="text-xs text-neutral-400 truncate mb-4">
                Select a playlist for <span className="text-neutral-200 font-medium">"{track.title}"</span>
              </p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setCreateModalOpen(true)}
                className="flex items-center gap-3 p-3 mb-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-medium text-sm transition-colors border border-white/[0.08]"
              >
                <Plus className="w-4 h-4" />
                <span>New Playlist</span>
              </motion.button>

              <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
                {playlists.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500">
                    No playlists yet. Create one above!
                  </div>
                ) : (
                  playlists.map((pl) => {
                    const isAdded = addedIds.has(pl.id);
                    return (
                      <motion.button
                        key={pl.id}
                        whileHover={{ x: 2, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectPlaylist(pl.id)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-left transition-colors group"
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
                      </motion.button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CreatePlaylistModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(id) => handleSelectPlaylist(id)}
      />
    </>
  );
};
