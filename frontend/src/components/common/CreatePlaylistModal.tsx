import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import {
  modalBackdropVariants,
  modalSurfaceVariants,
  controlButtonHover,
  controlButtonTap,
} from '@/lib/motion';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (playlistId: string) => void;
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createPlaylist } = useLibraryStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const pl = await createPlaylist(title.trim(), description.trim());
      if (pl && onCreated) {
        onCreated(pl.id);
      }
      setTitle('');
      setDescription('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="relative w-full max-w-md rounded-2xl glass-modal border border-white/10 p-6 shadow-2xl"
          >
            <motion.button
              whileHover={controlButtonHover}
              whileTap={controlButtonTap}
              onClick={onClose}
              className="absolute top-5 right-5 p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </motion.button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center border border-white/10 shadow-sm">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Create Playlist</h2>
                <p className="text-xs text-neutral-400">Add a new collection to your personal library</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Late Night Synthwave"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Add an optional description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 text-sm transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-white hover:bg-neutral-100 disabled:opacity-50 text-black transition-opacity shadow-play-btn"
                >
                  {isSubmitting ? 'Creating...' : 'Create Playlist'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
