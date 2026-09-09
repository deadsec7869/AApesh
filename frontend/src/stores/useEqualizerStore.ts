import { create } from 'zustand';
import { defaultPlaybackEngine } from '@/services/player/YouTubeIframeProvider';

export type EqualizerPreset =
  | 'Flat'
  | 'Bass Boost'
  | 'Rock'
  | 'Pop'
  | 'Classical'
  | 'Electronic'
  | 'Hip Hop'
  | 'Vocal Booster'
  | 'Acoustic'
  | 'Jazz';

export interface EqualizerBands {
  preamp: number;
  b32: number;
  b64: number;
  b125: number;
  b250: number;
  b500: number;
  b1k: number;
  b2k: number;
  b4k: number;
  b8k: number;
  b16k: number;
}

export const PRESET_VALUES: Record<EqualizerPreset, EqualizerBands> = {
  Flat: {
    preamp: 0,
    b32: 0,
    b64: 0,
    b125: 0,
    b250: 0,
    b500: 0,
    b1k: 0,
    b2k: 0,
    b4k: 0,
    b8k: 0,
    b16k: 0,
  },
  'Bass Boost': {
    preamp: 1.5,
    b32: 6.0,
    b64: 5.5,
    b125: 4.0,
    b250: 2.5,
    b500: 1.0,
    b1k: 0,
    b2k: 0,
    b4k: 0,
    b8k: 1.0,
    b16k: 1.5,
  },
  Rock: {
    preamp: 0,
    b32: 4.5,
    b64: 3.5,
    b125: 1.5,
    b250: -0.5,
    b500: -1.5,
    b1k: -0.5,
    b2k: 1.5,
    b4k: 3.0,
    b8k: 4.0,
    b16k: 4.5,
  },
  Pop: {
    preamp: 0,
    b32: 1.5,
    b64: 2.5,
    b125: 3.0,
    b250: 2.0,
    b500: 0,
    b1k: 1.0,
    b2k: 2.0,
    b4k: 3.0,
    b8k: 2.5,
    b16k: 2.0,
  },
  Classical: {
    preamp: 0,
    b32: 3.5,
    b64: 2.5,
    b125: 1.5,
    b250: 0,
    b500: 0,
    b1k: 0.5,
    b2k: 1.5,
    b4k: 2.5,
    b8k: 3.5,
    b16k: 4.0,
  },
  Electronic: {
    preamp: 1.0,
    b32: 5.5,
    b64: 4.5,
    b125: 2.0,
    b250: 0,
    b500: -1.0,
    b1k: 1.0,
    b2k: 2.5,
    b4k: 4.0,
    b8k: 4.5,
    b16k: 5.0,
  },
  'Hip Hop': {
    preamp: 1.0,
    b32: 6.5,
    b64: 5.5,
    b125: 3.5,
    b250: 1.5,
    b500: 0,
    b1k: 1.0,
    b2k: 2.0,
    b4k: 2.5,
    b8k: 3.5,
    b16k: 4.0,
  },
  'Vocal Booster': {
    preamp: 0,
    b32: -2.0,
    b64: -1.0,
    b125: 0,
    b250: 2.0,
    b500: 4.0,
    b1k: 4.5,
    b2k: 3.5,
    b4k: 2.0,
    b8k: 0.5,
    b16k: 0,
  },
  Acoustic: {
    preamp: 0,
    b32: 2.0,
    b64: 2.0,
    b125: 1.5,
    b250: 1.0,
    b500: 2.0,
    b1k: 2.0,
    b2k: 2.5,
    b4k: 3.0,
    b8k: 3.0,
    b16k: 2.5,
  },
  Jazz: {
    preamp: 0,
    b32: 3.0,
    b64: 2.5,
    b125: 1.5,
    b250: 1.0,
    b500: 0,
    b1k: 0,
    b2k: 1.0,
    b4k: 2.0,
    b8k: 3.0,
    b16k: 3.0,
  },
};

interface EqualizerState {
  isOpen: boolean;
  activePreset: EqualizerPreset;
  bands: EqualizerBands;
  stereoBalance: number; // -100 (L) to +100 (R)
  playbackSpeed: number; // 0.75, 1, 1.25, 1.5, 2
  spatialAudio: boolean;
  concentricMode: boolean;

  // Actions
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setPreset: (preset: EqualizerPreset) => void;
  setBand: (band: keyof EqualizerBands, value: number) => void;
  setStereoBalance: (balance: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleSpatialAudio: () => void;
  setSpatialAudio: (enabled: boolean) => void;
  toggleConcentricMode: () => void;
  resetAll: () => void;
}

const STORAGE_KEY = 'aapesh_equalizer_state';

const loadSavedState = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    }
  } catch {}
  return null;
};

const saved = loadSavedState();

export const useEqualizerStore = create<EqualizerState>((set, get) => ({
  isOpen: false,
  activePreset: saved?.activePreset || 'Flat',
  bands: saved?.bands || { ...PRESET_VALUES.Flat },
  stereoBalance: saved?.stereoBalance ?? 0,
  playbackSpeed: saved?.playbackSpeed ?? 1,
  spatialAudio: saved?.spatialAudio ?? false,
  concentricMode: saved?.concentricMode ?? false,

  setOpen: (isOpen) => set({ isOpen }),
  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),

  setPreset: (preset) => {
    const newBands = { ...PRESET_VALUES[preset] };
    set({ activePreset: preset, bands: newBands });
    try {
      const state = { ...get(), activePreset: preset, bands: newBands };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  },

  setBand: (band, value) => {
    const newBands = { ...get().bands, [band]: value };
    set({ bands: newBands });
    try {
      const state = { ...get(), bands: newBands };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  },

  setStereoBalance: (stereoBalance) => {
    set({ stereoBalance });
    try {
      const state = { ...get(), stereoBalance };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  },

  setPlaybackSpeed: (playbackSpeed) => {
    set({ playbackSpeed });
    try {
      defaultPlaybackEngine.setPlaybackRate?.(playbackSpeed);
      const state = { ...get(), playbackSpeed };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  },

  toggleSpatialAudio: () => {
    const next = !get().spatialAudio;
    set({ spatialAudio: next });
    try {
      const state = { ...get(), spatialAudio: next };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  },

  setSpatialAudio: (spatialAudio) => {
    set({ spatialAudio });
    try {
      const state = { ...get(), spatialAudio };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  },

  toggleConcentricMode: () => {
    set((s) => ({ concentricMode: !s.concentricMode }));
  },

  resetAll: () => {
    const resetBands = { ...PRESET_VALUES.Flat };
    set({
      activePreset: 'Flat',
      bands: resetBands,
      stereoBalance: 0,
      playbackSpeed: 1,
      spatialAudio: false,
      concentricMode: false,
    });
    try {
      defaultPlaybackEngine.setPlaybackRate?.(1);
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  },
}));
