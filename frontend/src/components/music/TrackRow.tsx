import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, Heart, MoreHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import { Track } from '@/types/music';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { ArtworkImage } from '@/components/common/ArtworkImage';
import { controlButtonTap } from '@/lib/motion';
import { ContextMenu } from './ContextMenu';

interface TrackRowProps {
  track: Track;
  index?: number;
  showCover?: boolean;
  showAlbum?: boolean;
  contextQueue?: Track[];
  onAddToPlaylist?: (track: Track) => void;
  onRemoveFromPlaylist?: (track: Track) => void;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  showCover = true,
  showAlbum = true,
  contextQueue,
  onAddToPlaylist,
  onRemoveFromPlaylist,
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { isLiked, toggleLike } = useLibraryStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | undefined>();

  const isCurrent = currentTrack?.videoId === track.videoId;
  const liked = isLiked(track.videoId);

  const handleRowClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, contextQueue);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      className={`group relative flex items-center gap-3 md:gap-4 px-3 py-2.5 rounded-2xl transition-all duration-150 ease-out-expo cursor-pointer ${
        isCurrent
          ? 'bg-white/[0.08] text-white border border-white/10 shadow-sm'
          : 'hover:bg-white/[0.04] text-neutral-300'
      }`}
    >
      {/* Play / Index / Equalizer */}
      <div
        onClick={handleRowClick}
        className="w-7 h-7 flex items-center justify-center shrink-0 text-caption-1 tabular-nums font-medium"
      >
        {isCurrent && isPlaying ? (
          <div className="flex items-end gap-[3px] h-4">
            <span className="w-1 rounded-full eq-hybrid-1" />
            <span className="w-1 rounded-full eq-hybrid-2" />
            <span className="w-1 rounded-full eq-hybrid-3" />
          </div>
        ) : (
          <>
            <span className={`group-hover:hidden tabular-nums ${isCurrent ? 'text-white font-semibold' : 'text-neutral-500'}`}>
              {index !== undefined ? index + 1 : ''}
            </span>
            <button
              aria-label="Play Track"
              className="hidden group-hover:flex items-center justify-center w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-150 ease-out-expo"
            >
              {isCurrent && isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
              )}
            </button>
          </>
        )}
      </div>

      {/* Album Cover Thumbnail */}
      {showCover && (
        <div
          onClick={handleRowClick}
          className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-charcoal-800 shadow-sm border border-white/5"
        >
          <ArtworkImage
            src={track.thumbnail}
            alt={track.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            fallbackIconClassName="w-4 h-4 text-neutral-400"
          />
        </div>
      )}

      {/* Title & Artist */}
      <div className="flex-1 min-w-0 pr-2">
        <div
          onClick={handleRowClick}
          className={`font-medium truncate text-callout ${
            isCurrent ? 'text-white font-semibold' : 'text-neutral-100 group-hover:text-white'
          }`}
        >
          {track.title}
        </div>
        <div className="flex items-center gap-1.5 text-footnote text-neutral-400 truncate mt-0.5">
          {track.isExplicit && (
            <span className="px-1 py-0.2 text-[9px] font-bold bg-neutral-700 text-neutral-300 rounded">
              E
            </span>
          )}
          <span className="truncate">
            {track.artists?.map((artist, i) => (
              <React.Fragment key={i}>
                {artist.id ? (
                  <Link
                    to={`/artist/${artist.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:underline hover:text-neutral-200 transition-colors"
                  >
                    {artist.name}
                  </Link>
                ) : (
                  <span>{artist.name}</span>
                )}
                {i < (track.artists?.length || 1) - 1 ? ', ' : ''}
              </React.Fragment>
            ))}
          </span>
        </div>
      </div>

      {/* Album Column (Desktop) */}
      {showAlbum && (
        <div className="hidden md:block w-1/4 text-footnote text-neutral-400 truncate pr-4">
          {track.albumId ? (
            <Link
              to={`/album/${track.albumId}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:underline hover:text-neutral-200"
            >
              {track.album || ''}
            </Link>
          ) : (
            <span>{track.album || ''}</span>
          )}
        </div>
      )}

      {/* Like Button */}
      <motion.button
        whileTap={controlButtonTap}
        whileHover={{ scale: 1.15 }}
        onClick={(e) => {
          e.stopPropagation();
          toggleLike(track);
        }}
        aria-label={liked ? 'Unlike track' : 'Like track'}
        className={`p-1.5 rounded-full transition-colors duration-150 ${
          liked
            ? 'text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]'
            : 'text-neutral-500 hover:text-neutral-200 opacity-0 group-hover:opacity-100'
        }`}
      >
        <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
      </motion.button>

      {/* Duration */}
      <div className="text-caption-1 text-neutral-500 font-mono tabular-nums w-10 text-right shrink-0">
        {track.duration || '0:00'}
      </div>

      {/* More Button */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuPos(undefined);
            setMenuOpen(!menuOpen);
          }}
          aria-label="More options"
          className="p-1.5 rounded-full text-neutral-500 hover:text-neutral-200 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        <ContextMenu
          track={track}
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          position={menuPos}
          onAddToPlaylist={onAddToPlaylist ? () => onAddToPlaylist(track) : undefined}
          onRemoveFromPlaylist={onRemoveFromPlaylist ? () => onRemoveFromPlaylist(track) : undefined}
        />
      </div>
    </div>
  );
};
