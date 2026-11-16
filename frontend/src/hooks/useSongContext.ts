import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/api/client';
import { Track, SongContextResponse } from '@/types/music';

// In-memory cache for song contexts across the application lifetime
const songContextCache = new Map<string, SongContextResponse>();

export const clearSongContextCache = (): void => {
  songContextCache.clear();
};

export const getCachedSongContext = (videoId: string): SongContextResponse | undefined => {
  return songContextCache.get(videoId);
};

export const setCachedSongContext = (videoId: string, data: SongContextResponse): void => {
  songContextCache.set(videoId, data);
};

export interface UseSongContextResult {
  context: SongContextResponse | null;
  isLoading: boolean;
  error: string | null;
  isCached: boolean;
  refetch: () => void;
}

export function useSongContext(track: Track | null): UseSongContextResult {
  const [context, setContext] = useState<SongContextResponse | null>(() => {
    if (!track?.videoId) return null;
    return songContextCache.get(track.videoId) || null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (!track?.videoId) return false;
    return !songContextCache.has(track.videoId);
  });
  const [error, setError] = useState<string | null>(null);

  const activeVideoIdRef = useRef<string | null>(track?.videoId || null);
  activeVideoIdRef.current = track?.videoId || null;

  const fetchContext = useCallback(
    (videoId: string, fallbackTrack?: Track | null) => {
      // 1. If already in memory cache, deliver immediately
      const cached = songContextCache.get(videoId);
      if (cached) {
        setContext(cached);
        setIsLoading(false);
        setError(null);
        return () => {};
      }

      const controller = new AbortController();
      setIsLoading(true);
      setError(null);

      // Construct a safe initial base context from available track data
      const initialFallback: SongContextResponse = {
        videoId,
        title: fallbackTrack?.title || 'Unknown Title',
        artists: fallbackTrack?.artists || [],
        album: fallbackTrack?.album || null,
        albumId: fallbackTrack?.albumId || null,
        duration: fallbackTrack?.duration || '0:00',
        duration_seconds: fallbackTrack?.duration_seconds || 0,
        thumbnails: fallbackTrack?.thumbnails || [],
        thumbnail: fallbackTrack?.thumbnail || '',
        isExplicit: fallbackTrack?.isExplicit || false,
        artistDetails: fallbackTrack?.artists?.[0]
          ? {
              id: fallbackTrack.artists[0].id || null,
              name: fallbackTrack.artists[0].name,
            }
          : null,
      };

      api
        .getSongContext(videoId, controller.signal)
        .then((data) => {
          if (controller.signal.aborted || activeVideoIdRef.current !== videoId) {
            return;
          }
          songContextCache.set(videoId, data);
          setContext(data);
          setError(null);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted || activeVideoIdRef.current !== videoId) {
            return;
          }
          // On failure: retain fallback track metadata without breaking the player or throwing
          console.warn(`[AboutThisSong] Context fetch fallback for ${videoId}:`, err);
          setContext(initialFallback);
          setError("Some song information isn't available right now.");
        })
        .finally(() => {
          if (!controller.signal.aborted && activeVideoIdRef.current === videoId) {
            setIsLoading(false);
          }
        });

      return () => {
        controller.abort();
      };
    },
    []
  );

  useEffect(() => {
    if (!track?.videoId) {
      setContext(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const abortFn = fetchContext(track.videoId, track);
    return () => {
      if (abortFn) abortFn();
    };
  }, [track?.videoId, fetchContext]);

  const refetch = useCallback(() => {
    if (track?.videoId) {
      songContextCache.delete(track.videoId);
      fetchContext(track.videoId, track);
    }
  }, [track, fetchContext]);

  const isCached = Boolean(track?.videoId && songContextCache.has(track.videoId));

  return {
    context,
    isLoading,
    error,
    isCached,
    refetch,
  };
}
