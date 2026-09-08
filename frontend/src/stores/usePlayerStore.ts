import { create } from 'zustand';
import { Track, RepeatMode } from '@/types/music';
import { defaultPlaybackEngine } from '@/services/player/YouTubeIframeProvider';
import { PlaybackProvider } from '@/services/player/PlaybackProvider';
import { extractArtworkPalette, ArtworkPalette } from '@/lib/colorExtractor';
import { ShuffleMode, smartShuffleQueue, standardShuffle } from '@/utils/smartShuffle';
import {
  StreamingQualityTier,
  EffectiveQualityResolution,
} from '@/types/quality';
import { PlaybackStatus, BufferHealth } from '@/types/playback';
import { resolveStreamingQuality } from '@/services/audio/qualityResolver';
import { api } from '@/api/client';

export interface SleepTimerState {
  durationMinutes: number;
  remainingSeconds: number;
  timerType: 'minutes' | 'track';
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  originalQueue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  playbackStatus: PlaybackStatus;
  bufferHealth: BufferHealth;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  previousVolume: number;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  shuffleMode: ShuffleMode;
  autoplayEnabled: boolean;
  sleepTimer: SleepTimerState | null;
  isPlayerExpanded: boolean;
  isQueueOpen: boolean;
  isLyricsOpen: boolean;
  isVideoDockOpen: boolean;
  isQualityModalOpen: boolean;
  streamingQuality: StreamingQualityTier;
  fullscreenTab: 'art' | 'lyrics' | 'queue' | 'video';
  atmospherePalette: ArtworkPalette | null;
  recentlyPlayed: Track[];
  bottomPlayerHeight: number;
  bottomPlayerClearance: number;
  error: string | null;

  // Actions
  setBottomPlayerDimensions: (height: number, clearance: number) => void;
  setStreamingQuality: (tier: StreamingQualityTier) => void;
  toggleQualityModal: () => void;
  setQualityModalOpen: (open: boolean) => void;
  getEffectiveQualityInfo: () => EffectiveQualityResolution;
  initEngine: () => Promise<void>;
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  addToRecentlyPlayed: (track: Track) => void;
  togglePlay: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleShuffleMode: () => void;
  setShuffleMode: (mode: ShuffleMode) => void;
  toggleRepeat: () => void;
  toggleAutoplay: () => void;
  setAutoplay: (enabled: boolean) => void;
  setSleepTimer: (duration: number | 'track') => void;
  cancelSleepTimer: () => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: (clearCurrent?: boolean) => void;
  moveQueueItem: (from: number, to: number) => void;
  reorderQueue: (from: number, to: number) => void;
  togglePlayerExpanded: () => void;
  setPlayerExpanded: (expanded: boolean) => void;
  toggleQueue: () => void;
  toggleLyrics: () => void;
  toggleVideoDock: () => void;
  setVideoDockOpen: (open: boolean) => void;
  setFullscreenTab: (tab: 'art' | 'lyrics' | 'queue' | 'video') => void;
  setError: (error: string | null) => void;
}

const STORAGE_KEYS = {
  VOLUME: 'aapesh_volume',
  REPEAT: 'aapesh_repeat',
  SHUFFLE: 'aapesh_shuffle',
  SHUFFLE_MODE: 'aapesh_shuffle_mode',
  AUTOPLAY: 'aapesh_autoplay',
  STREAMING_QUALITY: 'aapesh_streaming_quality',
  LAST_TRACK: 'aapesh_last_track',
  QUEUE: 'aapesh_queue',
  RECENTLY_PLAYED: 'aapesh_recently_played',
};

// Safe LocalStorage helpers
export const safeGetItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key) ?? window.localStorage.getItem(key.replace('aapesh_', 'aurora_'));
    }
  } catch {}
  return null;
};

export const safeSetItem = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
};

const getSavedVolume = () => {
  const val = safeGetItem(STORAGE_KEYS.VOLUME);
  return val !== null ? Number(val) : 80;
};

const getSavedRepeat = (): RepeatMode => {
  const val = safeGetItem(STORAGE_KEYS.REPEAT);
  return val === 'track' || val === 'queue' ? (val as RepeatMode) : 'off';
};

const getSavedShuffle = () => {
  return safeGetItem(STORAGE_KEYS.SHUFFLE) === 'true';
};

const getSavedShuffleMode = (): ShuffleMode => {
  const val = safeGetItem(STORAGE_KEYS.SHUFFLE_MODE);
  if (val === 'smart' || val === 'standard' || val === 'off') return val;
  return safeGetItem(STORAGE_KEYS.SHUFFLE) === 'true' ? 'standard' : 'off';
};

const getSavedAutoplay = (): boolean => {
  return safeGetItem(STORAGE_KEYS.AUTOPLAY) !== 'false';
};

const getSavedStreamingQuality = (): StreamingQualityTier => {
  const val = safeGetItem(STORAGE_KEYS.STREAMING_QUALITY);
  if (
    val === 'auto' ||
    val === 'low' ||
    val === 'normal' ||
    val === 'high' ||
    val === 'always_high' ||
    val === 'very_high' ||
    val === 'lossless' ||
    val === 'hi_res'
  ) {
    return val;
  }
  return 'auto';
};

const getSavedRecentlyPlayed = (): Track[] => {
  try {
    const saved = safeGetItem(STORAGE_KEYS.RECENTLY_PLAYED);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
};

let engineInitialized = false;
let playbackEngine: PlaybackProvider = defaultPlaybackEngine;
let sleepTimerInterval: any = null;
let prefetchedNextTrackId: string | null = null;

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  originalQueue: [],
  currentIndex: -1,
  isPlaying: false,
  isBuffering: false,
  playbackStatus: 'idle',
  bufferHealth: {
    loadedFraction: null,
    bufferAheadSeconds: null,
    targetBufferSeconds: 10,
    networkTier: 'unknown',
    isPrebuffering: false,
  },
  currentTime: 0,
  duration: 0,
  volume: getSavedVolume(),
  isMuted: false,
  previousVolume: 80,
  repeatMode: getSavedRepeat(),
  shuffleEnabled: getSavedShuffleMode() !== 'off',
  shuffleMode: getSavedShuffleMode(),
  autoplayEnabled: getSavedAutoplay(),
  sleepTimer: null,
  isPlayerExpanded: false,
  isQueueOpen: false,
  isLyricsOpen: false,
  isVideoDockOpen: false,
  isQualityModalOpen: false,
  streamingQuality: getSavedStreamingQuality(),
  fullscreenTab: 'art',
  atmospherePalette: null,
  recentlyPlayed: getSavedRecentlyPlayed(),
  bottomPlayerHeight: 76,
  bottomPlayerClearance: 128,
  error: null,

  setBottomPlayerDimensions: (height: number, clearance: number) => {
    set({ bottomPlayerHeight: height, bottomPlayerClearance: clearance });
  },

  setStreamingQuality: (tier: StreamingQualityTier) => {
    safeSetItem(STORAGE_KEYS.STREAMING_QUALITY, tier);
    set({ streamingQuality: tier });
    if (playbackEngine && typeof playbackEngine.setPreferredQuality === 'function') {
      playbackEngine.setPreferredQuality(tier);
    }
  },

  toggleQualityModal: () => {
    set((s) => ({ isQualityModalOpen: !s.isQualityModalOpen }));
  },

  setQualityModalOpen: (open: boolean) => {
    set({ isQualityModalOpen: open });
  },

  getEffectiveQualityInfo: () => {
    const requested = get().streamingQuality;
    return resolveStreamingQuality(requested, playbackEngine);
  },

  initEngine: async () => {
    if (engineInitialized) return;
    engineInitialized = true;

    // If local history is empty, try loading backend history
    if (get().recentlyPlayed.length === 0) {
      try {
        const res = await fetch('/api/history?limit=30');
        if (res.ok) {
          const histData = await res.json();
          if (Array.isArray(histData) && histData.length > 0) {
            const tracks: Track[] = histData.map((h: any) => ({
              videoId: h.video_id,
              title: h.title,
              artists: [{ name: h.artist }],
              album: h.album,
              thumbnail: h.thumbnail_url,
              duration: h.duration,
            }));
            set({ recentlyPlayed: tracks });
            safeSetItem(STORAGE_KEYS.RECENTLY_PLAYED, JSON.stringify(tracks));
          }
        }
      } catch {}
    }

    await playbackEngine.init({
      onStateChange: (isPlaying, isBuffering) => {
        set({ isPlaying, isBuffering });
        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
          navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        }
      },
      onStatusChange: (playbackStatus) => {
        set({ playbackStatus });
      },
      onBufferHealth: (bufferHealth) => {
        set({ bufferHealth });
      },
      onTimeUpdate: (currentTime, duration) => {
        const state = get();
        set({
          currentTime,
          duration: duration > 0 ? duration : state.duration,
        });

        // Predictive Audio Prefetching: Preload lyrics & artwork when >70% elapsed
        const actualDur = duration > 0 ? duration : state.duration;
        if (actualDur > 12 && currentTime / actualDur > 0.7) {
          const nextTrack = state.queue[state.currentIndex + 1];
          if (nextTrack && prefetchedNextTrackId !== nextTrack.videoId) {
            prefetchedNextTrackId = nextTrack.videoId;
            api.getLyrics(nextTrack.videoId).catch(() => {});
            if (nextTrack.thumbnail) {
              const img = new Image();
              img.src = nextTrack.thumbnail;
            }
          }
        }
      },
      onEnded: () => {
        const { repeatMode, sleepTimer } = get();
        if (sleepTimer && sleepTimer.timerType === 'track') {
          get().pause();
          get().cancelSleepTimer();
          return;
        }
        if (repeatMode === 'track') {
          playbackEngine.seek(0);
          playbackEngine.play();
        } else {
          get().next();
        }
      },
      onError: (error) => {
        set({ error, isPlaying: false, isBuffering: false, playbackStatus: 'error' });
      },
    });

    playbackEngine.setVolume(get().volume);

    // Setup Media Session Handlers
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => get().play());
      navigator.mediaSession.setActionHandler('pause', () => get().pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => get().previous());
      navigator.mediaSession.setActionHandler('nexttrack', () => get().next());
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skip = details.seekOffset || 10;
        get().seek(Math.max(0, get().currentTime - skip));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skip = details.seekOffset || 10;
        get().seek(Math.min(get().duration, get().currentTime + skip));
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          get().seek(details.seekTime);
        }
      });
    }

    // Try restoring last saved track / queue
    try {
      const savedLast = safeGetItem(STORAGE_KEYS.LAST_TRACK);
      const savedQueue = safeGetItem(STORAGE_KEYS.QUEUE);
      if (savedLast) {
        const track = JSON.parse(savedLast);
        const queue = savedQueue ? JSON.parse(savedQueue) : [track];
        const idx = queue.findIndex((t: Track) => t.videoId === track.videoId);
        set({
          currentTrack: track,
          queue,
          originalQueue: queue,
          currentIndex: idx !== -1 ? idx : 0,
          duration: track.duration_seconds || 0,
        });
      }
    } catch (e) {
      console.warn('Failed to load saved queue:', e);
    }
  },

  playTrack: async (track: Track, newQueue?: Track[]) => {
    await get().initEngine();

    let queue = newQueue ? [...newQueue] : [...get().queue];
    let originalQueue = newQueue ? [...newQueue] : [...get().originalQueue];

    let index = queue.findIndex((t) => t.videoId === track.videoId);

    if (index === -1) {
      if (newQueue) {
        queue = [track, ...queue];
        originalQueue = [track, ...originalQueue];
        index = 0;
      } else {
        queue.push(track);
        originalQueue.push(track);
        index = queue.length - 1;
      }
    }

    // If newQueue is provided and shuffle is active, shuffle upcoming tracks
    if (newQueue && get().shuffleMode !== 'off' && queue.length > index + 1) {
      if (get().shuffleMode === 'smart') {
        queue = smartShuffleQueue(queue, index, { currentTrack: track });
      } else {
        const past = queue.slice(0, index + 1);
        const upcoming = standardShuffle(queue.slice(index + 1));
        queue = [...past, ...upcoming];
      }
    }

    prefetchedNextTrackId = null;

    set({
      currentTrack: track,
      queue,
      originalQueue: originalQueue.length > 0 ? originalQueue : queue,
      currentIndex: index,
      isPlaying: true,
      isBuffering: true,
      playbackStatus: 'prebuffering',
      currentTime: 0,
      duration: track.duration_seconds || 0,
      error: null,
    });

    // Extract dynamic artwork palette asynchronously
    extractArtworkPalette(track.thumbnail, track.title).then((palette) => {
      set({ atmospherePalette: palette });
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--ambient-glow', palette.glow);
        document.documentElement.style.setProperty('--ambient-accent', palette.primary);
      }
    });

    // Save to localStorage
    try {
      safeSetItem(STORAGE_KEYS.LAST_TRACK, JSON.stringify(track));
      safeSetItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
    } catch {}

    // Update Recently Played: Deduplicate to front, max 30 items
    get().addToRecentlyPlayed(track);

    // Update Media Session
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
      const artistName = track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: artistName,
        album: track.album || '',
        artwork: track.thumbnail
          ? [{ src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      });
    }

    await playbackEngine.load(track);
    await playbackEngine.play();

    // Record to history on backend
    try {
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: track.videoId,
          title: track.title,
          artist: track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
          album: track.album || '',
          thumbnail_url: track.thumbnail || '',
          duration: track.duration || '0:00',
        }),
      }).catch(() => {});
    } catch {}
  },

  addToRecentlyPlayed: (track: Track) => {
    const current = get().recentlyPlayed;
    const filtered = current.filter((t) => t.videoId !== track.videoId);
    const updated = [track, ...filtered].slice(0, 30);
    set({ recentlyPlayed: updated });
    try {
      safeSetItem(STORAGE_KEYS.RECENTLY_PLAYED, JSON.stringify(updated));
    } catch {}
  },

  togglePlay: async () => {
    const { isPlaying, currentTrack, queue } = get();
    if (!currentTrack && queue.length > 0) {
      await get().playTrack(queue[0]);
      return;
    }
    if (isPlaying) {
      get().pause();
    } else {
      await get().play();
    }
  },

  play: async () => {
    const { currentTrack } = get();
    if (!currentTrack) return;
    set({ isPlaying: true });
    await playbackEngine.play();
  },

  pause: () => {
    set({ isPlaying: false });
    playbackEngine.pause();
  },

  next: async () => {
    const { queue, currentIndex, repeatMode, autoplayEnabled } = get();
    if (queue.length === 0) return;

    let nextIndex = currentIndex + 1;

    if (nextIndex >= queue.length) {
      if (repeatMode === 'queue') {
        nextIndex = 0;
      } else if (autoplayEnabled) {
        // Autoplay: fetch recommendations from backend and append to queue
        try {
          const recs = await api.getRecommendations(10);
          if (recs && recs.length > 0) {
            const existingIds = new Set(queue.map((t) => t.videoId));
            const fresh = recs.filter((t) => !existingIds.has(t.videoId));
            if (fresh.length > 0) {
              const updated = [...queue, ...fresh];
              set({ queue: updated, originalQueue: updated });
              await get().playTrack(fresh[0], updated);
              return;
            }
          }
        } catch (e) {
          console.warn('Autoplay recommendation fetch failed:', e);
        }
        get().pause();
        return;
      } else {
        get().pause();
        return;
      }
    }

    if (queue[nextIndex]) {
      get().playTrack(queue[nextIndex]);
    }
  },

  previous: () => {
    const { queue, currentIndex, currentTime } = get();
    if (queue.length === 0) return;

    // If more than 3 seconds into track, restart track
    if (currentTime > 3) {
      get().seek(0);
      return;
    }

    const prevIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    if (queue[prevIndex]) {
      get().playTrack(queue[prevIndex]);
    }
  },

  seek: (seconds: number) => {
    set({ currentTime: seconds });
    playbackEngine.seek(seconds);
  },

  setVolume: (volume: number) => {
    const clamped = Math.max(0, Math.min(100, volume));
    set({ volume: clamped, isMuted: clamped === 0 });
    playbackEngine.setVolume(clamped);
    safeSetItem(STORAGE_KEYS.VOLUME, String(clamped));
  },

  toggleMute: () => {
    const { isMuted, volume, previousVolume } = get();
    if (isMuted) {
      const restoreVol = previousVolume > 0 ? previousVolume : 50;
      set({ isMuted: false, volume: restoreVol });
      playbackEngine.setVolume(restoreVol);
    } else {
      set({ isMuted: true, previousVolume: volume, volume: 0 });
      playbackEngine.setVolume(0);
    }
  },

  toggleShuffle: () => {
    const current = get().shuffleMode;
    if (current === 'off') {
      get().setShuffleMode('standard');
    } else {
      get().setShuffleMode('off');
    }
  },

  cycleShuffleMode: () => {
    const current = get().shuffleMode;
    const nextMode: ShuffleMode =
      current === 'off' ? 'standard' : current === 'standard' ? 'smart' : 'off';
    get().setShuffleMode(nextMode);
  },

  setShuffleMode: (mode: ShuffleMode) => {
    const { queue, originalQueue, currentIndex, currentTrack } = get();
    safeSetItem(STORAGE_KEYS.SHUFFLE_MODE, mode);
    safeSetItem(STORAGE_KEYS.SHUFFLE, mode !== 'off' ? 'true' : 'false');

    if (mode === 'off') {
      if (originalQueue.length > 0 && currentTrack) {
        const curIdxInOrig = originalQueue.findIndex((t) => t.videoId === currentTrack.videoId);
        set({
          shuffleMode: 'off',
          shuffleEnabled: false,
          queue: originalQueue,
          currentIndex: curIdxInOrig !== -1 ? curIdxInOrig : currentIndex,
        });
      } else {
        set({ shuffleMode: 'off', shuffleEnabled: false });
      }
    } else if (mode === 'standard') {
      const baseQueue = originalQueue.length === queue.length ? originalQueue : [...queue];
      const past = baseQueue.slice(0, currentIndex + 1);
      const upcoming = standardShuffle(baseQueue.slice(currentIndex + 1));
      set({
        shuffleMode: 'standard',
        shuffleEnabled: true,
        originalQueue: baseQueue,
        queue: [...past, ...upcoming],
      });
    } else if (mode === 'smart') {
      const baseQueue = originalQueue.length === queue.length ? originalQueue : [...queue];
      const smartQ = smartShuffleQueue(baseQueue, currentIndex, { currentTrack });
      set({
        shuffleMode: 'smart',
        shuffleEnabled: true,
        originalQueue: baseQueue,
        queue: smartQ,
      });
    }
  },

  toggleAutoplay: () => {
    const nextVal = !get().autoplayEnabled;
    set({ autoplayEnabled: nextVal });
    safeSetItem(STORAGE_KEYS.AUTOPLAY, String(nextVal));
  },

  setAutoplay: (enabled: boolean) => {
    set({ autoplayEnabled: enabled });
    safeSetItem(STORAGE_KEYS.AUTOPLAY, String(enabled));
  },

  setSleepTimer: (duration: number | 'track') => {
    if (sleepTimerInterval) {
      clearInterval(sleepTimerInterval);
      sleepTimerInterval = null;
    }

    if (duration === 'track') {
      set({
        sleepTimer: {
          durationMinutes: 0,
          remainingSeconds: 0,
          timerType: 'track',
        },
      });
      return;
    }

    const durationMinutes = Number(duration);
    const remainingSeconds = durationMinutes * 60;

    set({
      sleepTimer: {
        durationMinutes,
        remainingSeconds,
        timerType: 'minutes',
      },
    });

    sleepTimerInterval = setInterval(() => {
      const { sleepTimer } = get();
      if (!sleepTimer || sleepTimer.timerType !== 'minutes') {
        if (sleepTimerInterval) clearInterval(sleepTimerInterval);
        return;
      }

      const nextSec = sleepTimer.remainingSeconds - 1;
      if (nextSec <= 0) {
        if (sleepTimerInterval) {
          clearInterval(sleepTimerInterval);
          sleepTimerInterval = null;
        }
        get().pause();
        set({ sleepTimer: null });
      } else {
        set({
          sleepTimer: {
            ...sleepTimer,
            remainingSeconds: nextSec,
          },
        });
      }
    }, 1000);
  },

  cancelSleepTimer: () => {
    if (sleepTimerInterval) {
      clearInterval(sleepTimerInterval);
      sleepTimerInterval = null;
    }
    set({ sleepTimer: null });
  },

  toggleRepeat: () => {
    const current = get().repeatMode;
    const next: RepeatMode = current === 'off' ? 'queue' : current === 'queue' ? 'track' : 'off';
    set({ repeatMode: next });
    safeSetItem(STORAGE_KEYS.REPEAT, next);
  },

  addToQueue: (track: Track) => {
    const queue = [...get().queue, track];
    const originalQueue = [...get().originalQueue, track];
    set({ queue, originalQueue });
    try {
      safeSetItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
    } catch {}
  },

  playNext: (track: Track) => {
    const { queue, originalQueue, currentIndex } = get();
    const newQueue = [...queue];
    newQueue.splice(currentIndex + 1, 0, track);

    const newOrig = [...originalQueue];
    const origIdx = originalQueue.findIndex((t) => t.videoId === queue[currentIndex]?.videoId);
    if (origIdx !== -1) {
      newOrig.splice(origIdx + 1, 0, track);
    } else {
      newOrig.push(track);
    }

    set({ queue: newQueue, originalQueue: newOrig });
    try {
      safeSetItem(STORAGE_KEYS.QUEUE, JSON.stringify(newQueue));
    } catch {}
  },

  removeFromQueue: (index: number) => {
    const { queue, originalQueue, currentIndex } = get();
    const removedTrack = queue[index];
    const newQueue = queue.filter((_, idx) => idx !== index);

    let newIndex = currentIndex;
    if (index < currentIndex) {
      newIndex = currentIndex - 1;
    } else if (index === currentIndex && newQueue.length > 0) {
      newIndex = Math.min(currentIndex, newQueue.length - 1);
    }

    const newOrig = originalQueue.filter((t) => t.videoId !== removedTrack?.videoId);

    set({ queue: newQueue, originalQueue: newOrig, currentIndex: newIndex });
    try {
      safeSetItem(STORAGE_KEYS.QUEUE, JSON.stringify(newQueue));
    } catch {}
  },

  clearQueue: (clearCurrent = false) => {
    const { currentTrack } = get();
    const queue = (!clearCurrent && currentTrack) ? [currentTrack] : [];
    set({
      queue,
      originalQueue: queue,
      currentIndex: queue.length > 0 ? 0 : -1,
      currentTrack: queue.length > 0 ? currentTrack : null,
    });
    try {
      safeSetItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
    } catch {}
  },

  moveQueueItem: (from: number, to: number) => {
    const { queue, currentIndex } = get();
    const newQueue = [...queue];
    const [moved] = newQueue.splice(from, 1);
    newQueue.splice(to, 0, moved);

    let newCurrent = currentIndex;
    if (currentIndex === from) {
      newCurrent = to;
    } else if (from < currentIndex && to >= currentIndex) {
      newCurrent--;
    } else if (from > currentIndex && to <= currentIndex) {
      newCurrent++;
    }

    set({ queue: newQueue, currentIndex: newCurrent });
    try {
      safeSetItem(STORAGE_KEYS.QUEUE, JSON.stringify(newQueue));
    } catch {}
  },

  reorderQueue: (from: number, to: number) => {
    get().moveQueueItem(from, to);
  },

  togglePlayerExpanded: () => set((s) => ({ isPlayerExpanded: !s.isPlayerExpanded })),
  setPlayerExpanded: (isPlayerExpanded) => set({ isPlayerExpanded }),
  toggleQueue: () => set((s) => ({ isQueueOpen: !s.isQueueOpen, isLyricsOpen: false })),
  toggleLyrics: () => set((s) => ({ isLyricsOpen: !s.isLyricsOpen, isQueueOpen: false })),
  toggleVideoDock: () => set((s) => ({ isVideoDockOpen: !s.isVideoDockOpen })),
  setVideoDockOpen: (isVideoDockOpen) => set({ isVideoDockOpen }),
  setFullscreenTab: (fullscreenTab) => set({ fullscreenTab }),
  setError: (error) => set({ error }),
}));

if (typeof window !== 'undefined') {
  (window as any).__aapeshPlayerStore = usePlayerStore;
  (window as any).__auroraPlayerStore = usePlayerStore;
}
