import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  ListPlus,
  Heart,
  User,
  Disc,
  Share2,
  FolderPlus,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Track } from '@/types/music';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';

interface ContextMenuProps {
  track: Track;
  isOpen: boolean;
  onClose: () => void;
  position?: { x: number; y: number };
  onAddToPlaylist?: () => void;
  onRemoveFromPlaylist?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  track,
  isOpen,
  onClose,
  position,
  onAddToPlaylist,
  onRemoveFromPlaylist,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { playTrack, playNext, addToQueue } = usePlayerStore();
  const { isLiked, toggleLike } = useLibraryStore();

  const liked = isLiked(track.videoId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePlay = () => {
    playTrack(track);
    onClose();
  };

  const handlePlayNext = () => {
    playNext(track);
    onClose();
  };

  const handleAddToQueue = () => {
    addToQueue(track);
    onClose();
  };

  const handleToggleLike = () => {
    toggleLike(track);
    onClose();
  };

  const handleGoToArtist = () => {
    if (track.artists && track.artists[0]?.id) {
      navigate(`/artist/${track.artists[0].id}`);
    }
    onClose();
  };

  const handleGoToAlbum = () => {
    if (track.albumId) {
      navigate(`/album/${track.albumId}`);
    }
    onClose();
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/song/${track.videoId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: track.title,
          text: `Listen to ${track.title} on AAPESH`,
          url: shareUrl,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
    onClose();
  };

  const style: React.CSSProperties = position
    ? {
        position: 'fixed',
        top: Math.min(position.y, window.innerHeight - 280),
        left: Math.min(position.x, window.innerWidth - 220),
        zIndex: 9999,
      }
    : {
        position: 'absolute',
        right: 0,
        top: '100%',
        zIndex: 9999,
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          style={style}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          className="w-52 rounded-xl glass-modal p-1.5 shadow-2xl border border-white/10 text-sm"
        >
          <button
            onClick={handlePlay}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-neutral-200 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <Play className="w-4 h-4 text-white fill-current" />
            <span>Play</span>
          </button>

          <button
            onClick={handlePlayNext}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-neutral-200 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <Play className="w-4 h-4 rotate-90" />
            <span>Play Next</span>
          </button>

          <button
            onClick={handleAddToQueue}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-neutral-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ListPlus className="w-4 h-4 text-neutral-400" />
            <span>Add to Queue</span>
          </button>

          <div className="h-px bg-white/10 my-1" />

          {onAddToPlaylist && (
            <button
              onClick={() => {
                onAddToPlaylist();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-neutral-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-neutral-400" />
              <span>Add to Playlist</span>
            </button>
          )}

          {onRemoveFromPlaylist && (
            <button
              onClick={() => {
                onRemoveFromPlaylist();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>Remove from Playlist</span>
            </button>
          )}

          <button
            onClick={handleToggleLike}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-neutral-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Heart
              className={`w-4 h-4 ${
                liked ? 'text-pink-500 fill-pink-500' : 'text-neutral-400'
              }`}
            />
            <span>{liked ? 'Remove from Liked' : 'Save to Liked Songs'}</span>
          </button>

          {track.artists && track.artists[0]?.id && (
            <button
              onClick={handleGoToArtist}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-neutral-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <User className="w-4 h-4 text-neutral-400" />
              <span>Go to Artist</span>
            </button>
          )}

          {track.albumId && (
            <button
              onClick={handleGoToAlbum}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-neutral-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Disc className="w-4 h-4 text-neutral-400" />
              <span>Go to Album</span>
            </button>
          )}

          <div className="h-px bg-white/10 my-1" />

          <button
            onClick={handleShare}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-neutral-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Share2 className="w-4 h-4 text-neutral-400" />
            <span>Share</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
