import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Shuffle, ListMusic, Trash2, Clock, Edit2 } from 'lucide-react';
import { api } from '@/api/client';
import { Track } from '@/types/music';
import { TrackRow } from '@/components/music/TrackRow';
import { SkeletonHero, SkeletonList } from '@/components/common/Skeletons';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';

export const PlaylistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playTrack } = usePlayerStore();
  const { deletePlaylist, removeTrackFromPlaylist } = useLibraryStore();

  const [playlist, setPlaylist] = useState<any | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isCustom, setIsCustom] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlaylist = () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    api
      .getPlaylist(id)
      .then((data) => {
        setPlaylist(data);
        // Normalize tracks
        if (data.tracks) {
          const normTracks: Track[] = data.tracks.map((t: any) => ({
            videoId: t.video_id || t.videoId,
            title: t.title,
            artists: typeof t.artist === 'string' ? [{ name: t.artist }] : t.artists || [],
            album: t.album,
            thumbnail: t.thumbnail_url || t.thumbnail,
            duration: t.duration,
            duration_seconds: t.duration_seconds,
          }));
          setTracks(normTracks);
          // If created_at exists, it's a local custom playlist
          setIsCustom(Boolean(data.created_at));
        }
      })
      .catch((err) => {
        console.error('Failed to load playlist:', err);
        setError('Unable to load playlist.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadPlaylist();
  }, [id]);

  if (isLoading) {
    return (
      <div className="p-6 md:p-10 flex flex-col gap-10">
        <SkeletonHero />
        <SkeletonList count={8} />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="p-12 text-center text-neutral-400">
        <ListMusic className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Playlist not found</h2>
        <p className="text-sm text-neutral-500 mt-1">{error || 'Could not load playlist.'}</p>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

  const handleShuffle = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  const handleDeletePlaylist = async () => {
    if (window.confirm('Are you sure you want to delete this playlist?')) {
      const ok = await deletePlaylist(playlist.id);
      if (ok) {
        navigate('/library');
      }
    }
  };

  const handleRemoveTrack = async (track: Track) => {
    if (isCustom && playlist.tracks) {
      const customTrack = playlist.tracks.find((t: any) => t.video_id === track.videoId || t.id === track.videoId);
      if (customTrack) {
        await removeTrackFromPlaylist(playlist.id, customTrack.id);
        loadPlaylist();
      }
    }
  };

  return (
    <div className="p-6 md:p-10 flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-6 md:gap-8 p-6 md:p-8 rounded-3xl glass-elevated border border-white/10 shadow-2xl overflow-hidden">
        {/* Artwork */}
        <div className="relative z-10 w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden bg-charcoal-800 shadow-2xl shrink-0 border border-white/10">
          {playlist.thumbnail || playlist.thumbnail_url ? (
            <img
              src={playlist.thumbnail || playlist.thumbnail_url}
              alt={playlist.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-charcoal-800 text-neutral-500">
              <ListMusic className="w-16 h-16" />
            </div>
          )}
        </div>

        {/* Info & Controls */}
        <div className="relative z-10 flex flex-col gap-2.5 text-center sm:text-left min-w-0 flex-1">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            {isCustom ? 'Custom Playlist' : 'Public Playlist'}
          </span>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight break-words">
            {playlist.title}
          </h1>
          {playlist.description && (
            <p className="text-sm text-neutral-400 line-clamp-2">{playlist.description}</p>
          )}

          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-neutral-300">
            {playlist.author && <span>By {playlist.author} • </span>}
            <span>{tracks.length} songs</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center sm:justify-start gap-3 pt-4">
            {tracks.length > 0 && (
              <>
                <button
                  onClick={handlePlayAll}
                  className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-white text-black font-semibold text-sm transition-all duration-200 ease-out-expo shadow-play-btn hover:scale-[1.03] active:scale-[0.97]"
                >
                  <Play className="w-4 h-4 fill-current translate-x-0.5" />
                  <span>Play</span>
                </button>

                <button
                  onClick={handleShuffle}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/15 text-neutral-200 hover:text-white transition-all border border-white/10"
                  title="Shuffle"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </>
            )}

            {isCustom && (
              <button
                onClick={handleDeletePlaylist}
                className="p-3 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all"
                title="Delete Playlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tracks Table */}
      <section className="flex flex-col gap-2">
        {tracks.length === 0 ? (
          <div className="py-16 text-center text-neutral-400">
            <ListMusic className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <p className="text-base font-medium text-neutral-300">This playlist is empty</p>
            <p className="text-xs text-neutral-500 mt-1">
              Add songs to this playlist from search, albums, or discover!
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 border-b border-white/[0.08]">
              <span className="w-7 text-center">#</span>
              <span className="flex-1">Title</span>
              <span className="w-10 text-right">
                <Clock className="w-3.5 h-3.5 inline text-neutral-400" />
              </span>
              <span className="w-14" />
            </div>

            <div className="flex flex-col gap-1">
              {tracks.map((track, idx) => (
                <TrackRow
                  key={`${track.videoId}-${idx}`}
                  track={track}
                  index={idx}
                  contextQueue={tracks}
                  onRemoveFromPlaylist={isCustom ? () => handleRemoveTrack(track) : undefined}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
};
