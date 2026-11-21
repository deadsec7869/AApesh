import { create } from 'zustand';
import { Track, RepeatMode } from '@/types/music';
import { playbackController } from '@/services/player/runtime';
import type { PlaybackPhase } from '@/services/player/PlaybackStateMachine';
import { PlaybackProvider } from '@/services/player/PlaybackProvider';
import { extractArtworkPalette, ArtworkPalette } from '@/lib/colorExtractor';
import { getArtworkUrl } from '@/utils/artwork';
import { ShuffleMode, smartShuffleQueue, standardShuffle } from '@/utils/smartShuffle';
import {
  StreamingQualityTier,
  EffectiveQualityResolution,
} from '@/types/quality';
import { PlaybackStatus, BufferHealth } from '@/types/playback';
import { resolveStreamingQuality } from '@/services/audio/qualityResolver';
import { api } from '@/api/client';
import { useUIStore } from '@/stores/useUIStore';

export interface SleepTimerState {
  durationMinutes: number;
  remainingSeconds: number;
  timerType: 'minutes' | 'track';
}

interface PlayerState {
  currentTrack: Track | null;
  playbackRequestId: number;
  playbackPhase: PlaybackPhase;
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
  isAboutOpen: boolean;
  aboutTrack: Track | null;
  streamingQuality: StreamingQualityTier;
  fullscreenTab: 'art' | 'lyrics' | 'queue' | 'video';
  atmospherePalette: ArtworkPalette | null;
  recentlyPlayed: Track[];
  bottomPlayerHeight: number;
  bottomPlayerClearance: number;
  error: string | null;

  // Waveform for interactive scrubber
  waveformData: number[] | null;
  waveformLoading: boolean;

  // Actions
  setBottomPlayerDimensions: (height: number, clearance: number) => void;
  setStreamingQuality: (tier: StreamingQualityTier) => void;
  toggleQualityModal: () => void;
  setQualityModalOpen: (open: boolean) => void;
  getEffectiveQualityInfo: () => EffectiveQualityResolution;
  initEngine: () => Promise<void>;
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  playQueueIndex: (index: number) => Promise<void>;
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
  toggleAbout: () => void;
  setAboutOpen: (open: boolean) => void;
  openAbout: (track?: Track) => void;
  toggleVideoDock: () => void;
  setVideoDockOpen: (open: boolean) => void;
  setFullscreenTab: (tab: 'art' | 'lyrics' | 'queue' | 'video') => void;
  setError: (error: string | null) => void;
  incrementPlaybackRequestId: () => void;

  // Waveform
  setWaveformData: (data: number[] | null) => void;
  setWaveformLoading: (loading: boolean) => void;
  fetchWaveform: (videoId: string) => Promise<void>;

  // Optimistic Sync Helpers (instant UI, backend sync in background)
  optimisticLike: (track: Track, liked: boolean) => void;
  optimisticQueueAdd: (track: Track) => void;
  optimisticQueueRemove: (index: number) => void;
  optimisticQueueReorder: (from: number, to: number) => void;
  optimisticQueuePlayNext: (track: Track) => void;
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

let engineInitialization: Promise<void> | null = null;
const playbackEngine: PlaybackProvider = playbackController;
let selectionGeneration = 0;
let sleepTimerInterval: any = null;
let prefetchedNextTrackId: string | null = null;

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  playbackRequestId: 0,
  playbackPhase: 'IDLE',
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
  isAboutOpen: false,
  aboutTrack: null,
  streamingQuality: getSavedStreamingQuality(),
  fullscreenTab: 'art',
  atmospherePalette: null,
  recentlyPlayed: getSavedRecentlyPlayed(),
  bottomPlayerHeight: 76,
  bottomPlayerClearance: 128,
  error: null,

  // Waveform
  waveformData: null,
  waveformLoading: false,

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
    if (engineInitialization) return engineInitialization;
    engineInitialization = (async () => {

    // History enrichment must not block engine initialization.
    void (async () => {
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
            const distinct = tracks.filter((t, i) => tracks.findIndex(x=>x.videoId===t.videoId)===i);
            set({ recentlyPlayed: distinct });
            safeSetItem(STORAGE_KEYS.RECENTLY_PLAYED, JSON.stringify(distinct));
          }
        }
      } catch {}
    }

    })();

    await playbackEngine.init({
      onStateChange: (isPlaying, isBuffering) => {
        set({ isPlaying, isBuffering });
        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
          try { navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'; } catch {}
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
        if (duration > 0 && Number.isFinite(duration)) {
          try { navigator.mediaSession?.setPositionState?.({ duration, position: Math.max(0, Math.min(duration, currentTime)), playbackRate: playbackController.getPlaybackRate() }); } catch {}
        }

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

        // Smart Next-Track Prebuffering at >=85% elapsed or <=15s remaining
        if (actualDur > 12 && (currentTime / actualDur >= 0.85 || actualDur - currentTime <= 15)) {
          const nextTrack = state.queue[state.currentIndex + 1];
          if (nextTrack && typeof playbackEngine.prebufferTrack === 'function') {
            void playbackEngine.prebufferTrack(nextTrack).catch(() => {});
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
          void playbackEngine.play().catch(() => {});
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
      safeMediaHandler('play', () => get().play());
      safeMediaHandler('pause', () => get().pause());
      safeMediaHandler('stop', () => get().pause());
      safeMediaHandler('previoustrack', () => get().previous());
      safeMediaHandler('nexttrack', () => get().next());
      safeMediaHandler('seekbackward', (details) => {
        const skip = details.seekOffset || 10;
        get().seek(Math.max(0, get().currentTime - skip));
      });
      safeMediaHandler('seekforward', (details) => {
        const skip = details.seekOffset || 10;
        get().seek(Math.min(get().duration, get().currentTime + skip));
      });
      safeMediaHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          get().seek(details.seekTime);
        }
      });
    }

    // Try restoring last saved track / queue
    try {
      const savedLast = safeGetItem(STORAGE_KEYS.LAST_TRACK);
      const savedQueue = safeGetItem(STORAGE_KEYS.QUEUE);
      if (savedLast && !get().currentTrack) {
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
    })().catch((error) => { engineInitialization = null; throw error; });
    return engineInitialization;
  },

  playTrack: async (track: Track, newQueue?: Track[]) => {
    get().incrementPlaybackRequestId();
    const generation = ++selectionGeneration;
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

    // Immediately update player state and currentTrack so UI responds instantly
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

    const trackArtwork = getArtworkUrl(track) || track.thumbnail;

    // Extract dynamic artwork palette asynchronously
    extractArtworkPalette(trackArtwork, track.title).then((palette) => {
      if (generation !== selectionGeneration) return;
      set({ atmospherePalette: palette });
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--ambient-glow', palette.glow);
        document.documentElement.style.setProperty('--ambient-accent', palette.primary);
      }
    }).catch(() => {});

    // Save to localStorage
    try {
      safeSetItem(STORAGE_KEYS.LAST_TRACK, JSON.stringify(track));
      safeSetItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
    } catch {}

    // Update Recently Played: Deduplicate to front, max 30 items
    get().addToRecentlyPlayed(track);

    // Update Media Session
    try { if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
      const artistName = track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: artistName,
        album: track.album || '',
        artwork: trackArtwork
          ? [{ src: trackArtwork, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      });
    } } catch {}

    try {
      await get().initEngine();
      if (generation !== selectionGeneration) return;
      await playbackController.select(track);
    } catch (error) {
      if (generation === selectionGeneration) set({ error: error instanceof Error ? error.message : 'Playback failed', isPlaying: false, isBuffering: false, playbackStatus: 'error' });
    }
    if (generation !== selectionGeneration || track.source === 'local') return;

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

  playQueueIndex: async (index: number) => {
    const { queue } = get();
    if (!Number.isInteger(index) || !queue[index]) return;
    const work = get().playTrack(queue[index]);
    set({ currentIndex: index });
    await work;
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
    get().incrementPlaybackRequestId();
    const { isPlaying, currentTrack, queue, recentlyPlayed } = get();
    if (!currentTrack) {
      if (queue.length > 0) {
        await get().playTrack(queue[0]);
        return;
      }
      if (recentlyPlayed.length > 0) {
        await get().playTrack(recentlyPlayed[0]);
        return;
      }
      return;
    }
    if (isPlaying) {
      get().pause();
    } else {
      await get().play();
    }
  },

  play: async () => {
    get().incrementPlaybackRequestId();
    const { currentTrack } = get();
    if (!currentTrack) return;
    if (playbackController.getCurrentTrackId() !== currentTrack.videoId) {
      await get().playTrack(currentTrack);
      return;
    }
    await playbackController.play();
  },

  pause: () => {
    get().incrementPlaybackRequestId();
    ++selectionGeneration;
    set({ isPlaying: false, isBuffering: false, playbackStatus: 'paused' });
    playbackController.pause();
  },

  next: async () => {
    get().incrementPlaybackRequestId();
    const { queue, currentIndex, repeatMode, autoplayEnabled } = get();
    if (queue.length === 0) return;

    let nextIndex = currentIndex + 1;

    if (nextIndex >= queue.length) {
      if (repeatMode === 'queue') {
        nextIndex = 0;
      } else if (autoplayEnabled) {
        // Autoplay: fetch recommendations from backend and append to queue
        try {
          const generation = selectionGeneration;
          const recs = await api.getRecommendations(10);
          if (generation !== selectionGeneration || get().queue !== queue) return;
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
      await get().playQueueIndex(nextIndex);
    }
  },

  previous: () => {
    get().incrementPlaybackRequestId();
    const { queue, currentIndex, currentTime } = get();
    if (queue.length === 0) return;

    // If more than 3 seconds into track, restart track
    if (currentTime > 3) {
      get().seek(0);
      return;
    }

    const prevIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    if (queue[prevIndex]) {
      void get().playQueueIndex(prevIndex);
    }
  },

  seek: (seconds: number) => {
    if (!Number.isFinite(seconds)) return;
    get().incrementPlaybackRequestId();
    const target = Math.max(0, get().duration > 0 ? Math.min(get().duration, seconds) : seconds);
    set({ currentTime: target });
    playbackEngine.seek(target);
  },

  setVolume: (volume: number) => {
    if (!Number.isFinite(volume)) return;
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

  togglePlayerExpanded: () => {
    const next = !get().isPlayerExpanded;
    set({ isPlayerExpanded: next });
    useUIStore.getState().setIsPlayerExpanded(next);
  },
  setPlayerExpanded: (isPlayerExpanded) => {
    set({ isPlayerExpanded });
    useUIStore.getState().setIsPlayerExpanded(isPlayerExpanded);
  },
  toggleQueue: () => set((s) => ({ isQueueOpen: !s.isQueueOpen, isLyricsOpen: false })),
  toggleLyrics: () => set((s) => ({ isLyricsOpen: !s.isLyricsOpen, isQueueOpen: false })),
  toggleAbout: () =>
    set((s) => ({
      isAboutOpen: !s.isAboutOpen,
      aboutTrack: s.isAboutOpen ? null : s.aboutTrack,
    })),
  setAboutOpen: (isAboutOpen) =>
    set((s) => ({
      isAboutOpen,
      aboutTrack: isAboutOpen ? s.aboutTrack : null,
    })),
  openAbout: (track) =>
    set({
      isAboutOpen: true,
      aboutTrack: track || null,
    }),
  toggleVideoDock: () => set((s) => ({ isVideoDockOpen: !s.isVideoDockOpen })),
  setVideoDockOpen: (isVideoDockOpen) => set({ isVideoDockOpen }),
  setFullscreenTab: (fullscreenTab) => set({ fullscreenTab }),
  setError: (error) => set({ error }),
  incrementPlaybackRequestId: () => set((s) => ({ playbackRequestId: s.playbackRequestId + 1 })),

  // Waveform
  setWaveformData: (data) => set({ waveformData: data }),
  setWaveformLoading: (loading) => set({ waveformLoading: loading }),
  fetchWaveform: async (videoId: string) => {
    set({ waveformLoading: true });
    try {
      // Try to fetch waveform from backend (if endpoint exists)
      // Fallback: generate synthetic waveform from duration
      const { duration } = get();
      if (duration > 0) {
        // Generate a plausible synthetic waveform (64 points)
        const synthetic = Array.from({ length: 64 }, (_, i) => {
          const t = i / 63;
          // Simple envelope: quieter at start/end, louder in middle with some variation
          const envelope = Math.sin(t * Math.PI) * (0.3 + 0.7 * Math.random());
          return Math.max(0, Math.min(1, envelope));
        });
        set({ waveformData: synthetic, waveformLoading: false });
      } else {
        set({ waveformData: null, waveformLoading: false });
      }
    } catch {
      set({ waveformData: null, waveformLoading: false });
    }
  },

  // Optimistic Sync Helpers
  optimisticLike: (track, liked) => {
    // This is called by UI for instant feedback; backend sync happens in LibraryStore
    // We just ensure the track is in recently played
    get().addToRecentlyPlayed(track);
  },
  optimisticQueueAdd: (track) => {
    const { queue, originalQueue } = get();
    const newQueue = [...queue, track];
    const newOriginal = [...originalQueue, track];
    set({ queue: newQueue, originalQueue: newOriginal });
    try {
      safeSetItem(STORAGE_KEYS.QUEUE, JSON.stringify(newQueue));
    } catch {}
  },
  optimisticQueueRemove: (index) => {
    const { queue, originalQueue, currentIndex } = get();
    const removedTrack = queue[index];
    const newQueue = queue.filter((_, idx) => idx !== index);

    let newCurrent = currentIndex;
    if (index < currentIndex) {
      newCurrent = currentIndex - 1;
    } else if (index === currentIndex && newQueue.length > 0) {
      newCurrent = Math.min(currentIndex, newQueue.length - 1);
    }

    const newOriginal = originalQueue.filter((t) => t.videoId !== removedTrack?.videoId);
    set({ queue: newQueue, originalQueue: newOriginal, currentIndex: newCurrent });
    try {
      safeSetItem(STORAGE_KEYS.QUEUE, JSON.stringify(newQueue));
    } catch {}
  },
  optimisticQueueReorder: (from, to) => {
    get().moveQueueItem(from, to);
  },
  optimisticQueuePlayNext: (track) => {
    const { queue, originalQueue, currentIndex } = get();
    const newQueue = [...queue];
    newQueue.splice(currentIndex + 1, 0, track);

    const newOriginal = [...originalQueue];
    const origIdx = originalQueue.findIndex((t) => t.videoId === queue[currentIndex]?.videoId);
    if (origIdx !== -1) {
      newOriginal.splice(origIdx + 1, 0, track);
    } else {
      newOriginal.push(track);
    }

    set({ queue: newQueue, originalQueue: newOriginal });
    try {
      safeSetItem(STORAGE_KEYS.QUEUE, JSON.stringify(newQueue));
    } catch {}
  },
}));

if (typeof window !== 'undefined') {
  (window as any).__aapeshPlayerStore = usePlayerStore;
  (window as any).__auroraPlayerStore = usePlayerStore;
}


function safeMediaHandler(action: MediaSessionAction, handler: MediaSessionActionHandler): void {
  try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* Optional host capability. */ }
}

playbackController.subscribe(state => {
  usePlayerStore.setState({
    playbackRequestId: state.playbackRequestId,
    playbackPhase: state.phase,
    isPlaying: state.wantsPlay,
    isBuffering: state.phase === 'LOADING' || state.phase === 'BUFFERING' || state.phase === 'RECOVERING',
    error: state.error,
    playbackStatus: state.phase === 'LOADING' ? 'prebuffering' : state.phase === 'RECOVERING' ? 'buffering' : state.phase.toLowerCase() as PlaybackStatus,
  });
});
