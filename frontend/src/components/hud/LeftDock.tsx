import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, Heart, History, RotateCcw, Music, Plus,
  Search, MoreHorizontal, GripVertical, X, Play,
} from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { formatTime } from '@/lib/utils';
import { PlaylistImportModal } from '@/components/common/PlaylistImportModal';
import { CreatePlaylistModal } from '@/components/common/CreatePlaylistModal';
import { controlButtonHover, controlButtonTap } from '@/lib/motion';

interface LeftDockProps {
  className?: string;
}

const CRATES = [
  { id: 'liked', label: 'Liked Tracks', icon: Heart, countKey: 'likedTracks' },
  { id: 'recent', label: 'Recently Played', icon: History, countKey: 'recentlyPlayed' },
  { id: 'heavy', label: 'Heavy Rotation', icon: RotateCcw, countKey: 'heavyRotation' },
];

export const LeftDock: React.FC<LeftDockProps> = ({ className = '' }) => {
  const { leftDockCollapsed, setLeftDockCollapsed, toggleLeftDock, visualQuality } = useUIStore();
  const { playlists, fetchPlaylists, createPlaylist, deletePlaylist } = useLibraryStore();
  const { likedTracks, isLiked } = useLibraryStore();
  const { currentTrack, queue, playTrack, playQueueIndex, togglePlay, recentlyPlayed } = usePlayerStore();

  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [showImportPlaylist, setShowImportPlaylist] = useState(false);
  const [hoveredPlaylist, setHoveredPlaylist] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'alphabetical' | 'custom'>('custom');
  const dragRef = useRef<{ id: string; index: number } | null>(null);

  // Compute heavy rotation (most played from history)
  const heavyRotation = useRef(likedTracks.slice(0, 50));

  // Crate counts
  const crateCounts = {
    liked: likedTracks.length,
    recent: recentlyPlayed.length,
    heavy: heavyRotation.current.length,
  };

  const handleDragStart = (e: React.DragEvent, playlistId: string, index: number) => {
    dragRef.current = { id: playlistId, index };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', playlistId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || !dragRef.current || dragRef.current.id === sourceId) return;

    const sourceIndex = dragRef.current.index;
    if (sourceIndex === targetIndex) return;

    const newPlaylists = [...playlists];
    const [removed] = newPlaylists.splice(sourceIndex, 1);
    newPlaylists.splice(targetIndex, 0, removed);

    // Update order via API (optimistic UI)
    // Would call API here to persist new order
  };

  const handlePlaylistClick = (playlist: any) => {
    // Navigate to playlist page
    // navigate(`/playlist/${playlist.id}`);
  };

  const filteredPlaylists = playlists
    .filter((p) => p.title.toLowerCase().includes(filterQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'alphabetical') return a.title.localeCompare(b.title);
      if (sortOrder === 'recent') return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      // Default: maintain original order (by index in playlists array)
      return playlists.indexOf(a) - playlists.indexOf(b);
    });

  if (leftDockCollapsed) {
    return (
      <motion.aside
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 56, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-12 bottom-0 left-0 z-40 flex flex-col ${className}`}
        style={{
          background: 'rgba(14, 15, 20, 0.8)',
          backdropFilter: 'blur(32px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}
        aria-label="Navigation Rail (Collapsed)"
      >
        <div className="flex flex-col h-full">
          {/* Crates - Icon Only */}
          <nav className="flex flex-col gap-1 p-2" aria-label="Crates">
            {CRATES.map((crate) => {
              const Icon = crate.icon;
              const count = crateCounts[crate.id as keyof typeof crateCounts];
              return (
                <motion.button
                  key={crate.id}
                  whileHover={controlButtonHover}
                  whileTap={controlButtonTap}
                  className="flex items-center justify-center w-10 h-10 rounded-xl transition-all group relative"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                  aria-label={`${crate.label} (${count})`}
                >
                  <Icon className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[9px] font-mono font-bold flex items-center justify-center"
                      style={{
                        background: 'rgba(244, 63, 94, 0.9)',
                        color: 'white',
                        border: '2px solid rgba(14, 15, 20, 0.8)',
                      }}
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* Collapse/Expand Toggle */}
          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={toggleLeftDock}
            className="mx-2 mb-3 w-10 h-10 rounded-xl transition-all"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
            aria-label="Expand Library"
          >
            <ChevronLeft className="w-5 h-5 text-neutral-400" />
          </motion.button>
        </div>
      </motion.aside>
    );
  }

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 260, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-12 bottom-0 left-0 z-40 flex flex-col ${className}`}
      style={{
        width: 260,
        background: 'rgba(14, 15, 20, 0.8)',
        backdropFilter: 'blur(32px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
      }}
      aria-label="Library & Navigation"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
              <Music className="w-4 h-4 text-rose-500" />
            </div>
            <span className="font-bold text-white tracking-tight">Library</span>
          </div>
          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={toggleLeftDock}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            aria-label="Collapse Library"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Quick Access Crates */}
        <nav className="p-3 space-y-1" aria-label="Quick Access Crates">
          {CRATES.map((crate) => {
            const Icon = crate.icon;
            const count = crateCounts[crate.id as keyof typeof crateCounts];
            return (
              <motion.button
                key={crate.id}
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
                aria-label={`${crate.label} (${count} tracks)`}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Icon className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{crate.label}</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">{count} track{count !== 1 ? 's' : ''}</div>
                </div>
                {count > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-white"
                    style={{ background: 'rgba(244, 63, 94, 0.9)' }}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Custom Playlists */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* Playlist Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">Playlists</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-semibold text-neutral-500"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {playlists.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={() => setShowImportPlaylist(true)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                aria-label="Import Playlist"
              >
                <RotateCcw className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={() => setShowCreatePlaylist(true)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                aria-label="Create Playlist"
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Filter & Sort */}
          <div className="space-y-2 mb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter playlists..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs text-white placeholder-neutral-500"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-neutral-400">Sort:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="flex-1 px-2 py-1 rounded-lg text-xs text-white"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'white',
                }}
              >
                <option value="custom">Custom Order</option>
                <option value="recent">Recently Updated</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>
          </div>

          {/* Playlist List */}
          <AnimatePresence mode="popLayout">
            {filteredPlaylists.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-8 text-center text-neutral-400"
              >
                {filterQuery ? (
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 text-neutral-500" />
                    <span className="text-sm">No playlists match "{filterQuery}"</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Plus className="w-8 h-8 text-neutral-500" />
                    <span className="text-sm">No playlists yet</span>
                    <motion.button
                      whileHover={controlButtonHover}
                      whileTap={controlButtonTap}
                      onClick={() => setShowCreatePlaylist(true)}
                      className="mt-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                      style={{ background: 'rgba(244, 63, 94, 0.9)' }}
                    >
                      Create your first playlist
                    </motion.button>
                  </div>
                )}
              </motion.div>
            ) : (
              <ul className="space-y-1" role="list" aria-label="Custom Playlists">
                {filteredPlaylists.map((playlist, index) => (
                  <motion.li
                    key={playlist.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, playlist.id, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className="group relative"
                    >
                      <motion.button
                        whileHover={controlButtonHover}
                        whileTap={controlButtonTap}
                        onClick={() => handlePlaylistClick(playlist)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.04)',
                        }}
                        aria-label={`${playlist.title} (${playlist.track_count || 0} tracks)`}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          {playlist.thumbnail_url ? (
                            <img src={playlist.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Music className="w-5 h-5 text-neutral-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">{playlist.title}</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5">{playlist.track_count || 0} tracks</div>
                        </div>
                        <MoreHorizontal className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100" />
                      </motion.button>

                      {/* Hover Actions */}
                      <AnimatePresence>
                        {hoveredPlaylist === playlist.id && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 flex items-center gap-1 p-1 rounded-lg z-10"
                            style={{ background: 'rgba(14, 15, 20, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}
                          >
                            <motion.button whileHover={controlButtonHover} whileTap={controlButtonTap} className="p-1.5 rounded-lg text-neutral-400 hover:text-white" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} aria-label="Play"><Play className="w-4 h-4" /></motion.button>
                            <motion.button whileHover={controlButtonHover} whileTap={controlButtonTap} className="p-1.5 rounded-lg text-neutral-400 hover:text-white" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} aria-label="Edit"><RotateCcw className="w-4 h-4" /></motion.button>
                            <motion.button whileHover={controlButtonHover} whileTap={controlButtonTap} onClick={() => deletePlaylist(playlist.id)} className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} aria-label="Delete"><X className="w-4 h-4" /></motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse Toggle */}
        <motion.button
          whileHover={controlButtonHover}
          whileTap={controlButtonTap}
          onClick={toggleLeftDock}
          className="mx-3 mb-3 w-full h-10 rounded-xl transition-all"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
          aria-label="Collapse Library"
        >
          <ChevronLeft className="w-5 h-5 text-neutral-400 mx-auto" />
        </motion.button>
      </div>

      {/* Modals */}
      <CreatePlaylistModal
        isOpen={showCreatePlaylist}
        onClose={() => setShowCreatePlaylist(false)}
        onCreated={(playlistId) => {
          // Playlist created successfully, modal will close via onClose
          setShowCreatePlaylist(false);
        }}
      />
      <PlaylistImportModal
        isOpen={showImportPlaylist}
        onClose={() => setShowImportPlaylist(false)}
      />
    </motion.aside>
  );
};