import { create } from 'zustand';
import { Track, CustomPlaylist } from '@/types/music';

interface LibraryState {
  likedTracks: Track[];
  likedSet: Set<string>;
  playlists: CustomPlaylist[];
  isLoading: boolean;
  error: string | null;

  fetchLibrary: () => Promise<void>;
  fetchPlaylists: () => Promise<void>;
  fetchLikedTracks: () => Promise<void>;
  isLiked: (videoId: string) => boolean;
  toggleLike: (track: Track) => Promise<boolean>;
  createPlaylist: (title: string, description?: string) => Promise<CustomPlaylist | null>;
  deletePlaylist: (playlistId: string) => Promise<boolean>;
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<boolean>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<boolean>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  likedTracks: [],
  likedSet: new Set<string>(),
  playlists: [],
  isLoading: false,
  error: null,

  fetchLibrary: async () => {
    set({ isLoading: true });
    try {
      await Promise.all([get().fetchLikedTracks(), get().fetchPlaylists()]);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchLikedTracks: async () => {
    try {
      const res = await fetch('/api/library/liked');
      if (res.ok) {
        const rawTracks = await res.json();
        const tracks: Track[] = rawTracks.map((t: any) => ({
          videoId: t.video_id,
          title: t.title,
          artists: [{ name: t.artist }],
          album: t.album,
          thumbnail: t.thumbnail_url,
          duration: t.duration,
          duration_seconds: t.duration_seconds,
        }));
        const likedSet = new Set<string>(tracks.map((t) => t.videoId));
        set({ likedTracks: tracks, likedSet });
      }
    } catch (e) {
      console.warn('Failed to fetch liked tracks:', e);
    }
  },

  fetchPlaylists: async () => {
    try {
      const res = await fetch('/api/playlists');
      if (res.ok) {
        const playlists = await res.json();
        set({ playlists });
      }
    } catch (e) {
      console.warn('Failed to fetch playlists:', e);
    }
  },

  isLiked: (videoId: string) => {
    return get().likedSet.has(videoId);
  },

  toggleLike: async (track: Track) => {
    const isCurrentlyLiked = get().isLiked(track.videoId);
    const newLikedSet = new Set(get().likedSet);

    // Optimistic Update
    if (isCurrentlyLiked) {
      newLikedSet.delete(track.videoId);
      set({
        likedSet: newLikedSet,
        likedTracks: get().likedTracks.filter((t) => t.videoId !== track.videoId),
      });

      try {
        const res = await fetch(`/api/library/like/${track.videoId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        return false;
      } catch {
        // Rollback
        newLikedSet.add(track.videoId);
        set({ likedSet: newLikedSet });
        return true;
      }
    } else {
      newLikedSet.add(track.videoId);
      set({
        likedSet: newLikedSet,
        likedTracks: [track, ...get().likedTracks],
      });

      try {
        const res = await fetch('/api/library/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: track.videoId,
            title: track.title,
            artist: track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
            album: track.album || '',
            thumbnail_url: track.thumbnail || '',
            duration: track.duration || '0:00',
            duration_seconds: track.duration_seconds || 0,
          }),
        });
        if (!res.ok) throw new Error();
        return true;
      } catch {
        // Rollback
        newLikedSet.delete(track.videoId);
        set({
          likedSet: newLikedSet,
          likedTracks: get().likedTracks.filter((t) => t.videoId !== track.videoId),
        });
        return false;
      }
    }
  },

  createPlaylist: async (title: string, description: string = '') => {
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      if (res.ok) {
        const newPl = await res.json();
        set((s) => ({ playlists: [newPl, ...s.playlists] }));
        return newPl;
      }
    } catch (e) {
      console.error('Failed to create playlist:', e);
    }
    return null;
  },

  deletePlaylist: async (playlistId: string) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, { method: 'DELETE' });
      if (res.ok) {
        set((s) => ({ playlists: s.playlists.filter((p) => p.id !== playlistId) }));
        return true;
      }
    } catch (e) {
      console.error('Failed to delete playlist:', e);
    }
    return false;
  },

  addTrackToPlaylist: async (playlistId: string, track: Track) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: track.videoId,
          title: track.title,
          artist: track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
          album: track.album || '',
          thumbnail_url: track.thumbnail || '',
          duration: track.duration || '0:00',
          duration_seconds: track.duration_seconds || 0,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        set((s) => ({
          playlists: s.playlists.map((p) => (p.id === playlistId ? updated : p)),
        }));
        return true;
      }
    } catch (e) {
      console.error('Failed to add track to playlist:', e);
    }
    return false;
  },

  removeTrackFromPlaylist: async (playlistId: string, trackId: string) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/tracks/${trackId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const updated = await res.json();
        set((s) => ({
          playlists: s.playlists.map((p) => (p.id === playlistId ? updated : p)),
        }));
        return true;
      }
    } catch (e) {
      console.error('Failed to remove track from playlist:', e);
    }
    return false;
  },
}));
