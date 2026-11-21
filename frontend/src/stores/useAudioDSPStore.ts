import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { playbackController as defaultPlaybackEngine, localAudioProvider } from '@/services/player/runtime';

/**
 * AAPESH Audio DSP Store — Pro Audio Control Center
 *
 * Backward-compatible replacement for useEqualizerStore.
 * Maintains all existing selectors/actions while adding:
 * - Parametric EQ bands (freq, Q, gain per band)
 * - Real-time VU meter data (input/output levels)
 * - Stereo width control
 * - Enhanced preset system with parametric configs
 */

// ============================================================================
// Types
// ============================================================================

export type EqualizerPreset =
  | 'Flat'
  | 'Sub-Bass Boost'
  | 'Vocal Clarity'
  | 'Late Night'
  | 'Studio Reference'
  | 'Bass Boost'
  | 'Rock'
  | 'Pop'
  | 'Classical'
  | 'Electronic'
  | 'Hip Hop'
  | 'Vocal Booster'
  | 'Acoustic'
  | 'Jazz';

export interface ParametricBand {
  freq: number;      // Center frequency in Hz
  q: number;         // Quality factor (bandwidth)
  gain: number;      // Gain in dB (-24 to +24)
  enabled: boolean;  // Band bypass
  type: 'peaking' | 'lowshelf' | 'highshelf' | 'lowpass' | 'highpass';
}

export interface EqualizerBands {
  preamp: number;
  // Legacy graphic EQ bands (for backward compat)
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
  // New parametric bands (10 bands)
  parametric: ParametricBand[];
}

export interface VUMeterData {
  inputL: number;   // 0-1
  inputR: number;   // 0-1
  outputL: number;  // 0-1
  outputR: number;  // 0-1
  peakL: number;    // 0-1 (peak hold)
  peakR: number;    // 0-1 (peak hold)
  timestamp: number;
}

export interface AudioDSPState {
  // UI State
  isOpen: boolean;
  isDrawerOpen: boolean;  // Slide-over drawer variant

  // Equalizer
  activePreset: EqualizerPreset;
  bands: EqualizerBands;
  parametricBands: ParametricBand[];

  // Stereo / Spatial
  stereoBalance: number;    // -100 (L) to +100 (R) — legacy
  stereoWidth: number;      // 0% (mono) to 200% (wide) — new

  // Playback
  playbackSpeed: number;    // 0.5, 0.75, 1, 1.25, 1.5, 2
  spatialAudio: boolean;    // Saved preference (YouTube IFrame: unavailable)

  // VU Meters (real-time, updated via requestAnimationFrame)
  vuMeterData: VUMeterData;

  // Concentric Rings Visualization (legacy)
  concentricMode: boolean;

  // --- Actions ---

  // UI
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;

  // Presets
  setPreset: (preset: EqualizerPreset) => void;
  saveCustomPreset: (name: string, bands: ParametricBand[]) => void;
  deleteCustomPreset: (name: string) => void;

  // Graphic EQ (Legacy - backward compat)
  setBand: (band: keyof Omit<EqualizerBands, 'parametric'>, value: number) => void;
  setPreamp: (value: number) => void;

  // Parametric EQ (New)
  setParametricBand: (index: number, band: Partial<ParametricBand>) => void;
  setParametricBandFreq: (index: number, freq: number) => void;
  setParametricBandQ: (index: number, q: number) => void;
  setParametricBandGain: (index: number, gain: number) => void;
  setParametricBandEnabled: (index: number, enabled: boolean) => void;
  setParametricBandType: (index: number, type: ParametricBand['type']) => void;
  resetParametricBands: () => void;

  // Stereo
  setStereoBalance: (balance: number) => void;      // Legacy
  setStereoWidth: (width: number) => void;          // New: 0-200%

  // Playback Speed
  setPlaybackSpeed: (speed: number) => void;

  // Spatial Audio
  toggleSpatialAudio: () => void;
  setSpatialAudio: (enabled: boolean) => void;

  // VU Meters
  updateVUMeterData: (data: Partial<VUMeterData>) => void;
  resetVUMeterPeaks: () => void;

  // Concentric Mode (Legacy)
  toggleConcentricMode: () => void;

  // Reset
  resetAll: () => void;
  resetEQOnly: () => void;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_PARAMETRIC_BANDS: ParametricBand[] = [
  { freq: 32,   q: 0.7,  gain: 0, enabled: true, type: 'lowshelf' },
  { freq: 64,   q: 1.0,  gain: 0, enabled: true, type: 'peaking' },
  { freq: 125,  q: 1.0,  gain: 0, enabled: true, type: 'peaking' },
  { freq: 250,  q: 1.0,  gain: 0, enabled: true, type: 'peaking' },
  { freq: 500,  q: 1.0,  gain: 0, enabled: true, type: 'peaking' },
  { freq: 1000, q: 1.0,  gain: 0, enabled: true, type: 'peaking' },
  { freq: 2000, q: 1.0,  gain: 0, enabled: true, type: 'peaking' },
  { freq: 4000, q: 1.0,  gain: 0, enabled: true, type: 'peaking' },
  { freq: 8000, q: 1.0,  gain: 0, enabled: true, type: 'peaking' },
  { freq: 16000, q: 0.7, gain: 0, enabled: true, type: 'highshelf' },
];

const DEFAULT_GRAPHIC_BANDS: Omit<EqualizerBands, 'parametric'> = {
  preamp: 0,
  b32: 0, b64: 0, b125: 0, b250: 0, b500: 0,
  b1k: 0, b2k: 0, b4k: 0, b8k: 0, b16k: 0,
};

const DEFAULT_VU_METER: VUMeterData = {
  inputL: 0, inputR: 0,
  outputL: 0, outputR: 0,
  peakL: 0, peakR: 0,
  timestamp: 0,
};

// Legacy preset values (kept for backward compat)
export const PRESET_VALUES: Record<EqualizerPreset, Omit<EqualizerBands, 'parametric'>> = {
  Flat: { ...DEFAULT_GRAPHIC_BANDS },
  'Sub-Bass Boost': {
    preamp: 1.5,
    b32: 8.0, b64: 6.0, b125: 3.0, b250: 1.0, b500: 0,
    b1k: 0, b2k: 0, b4k: 0, b8k: 0.5, b16k: 1.0,
  },
  'Vocal Clarity': {
    preamp: 0,
    b32: -3.0, b64: -2.0, b125: -1.0, b250: 1.0, b500: 2.0,
    b1k: 3.5, b2k: 4.0, b4k: 3.0, b8k: 1.5, b16k: 0.5,
  },
  'Late Night': {
    preamp: -2.0,
    b32: -4.0, b64: -3.0, b125: -2.0, b250: -1.0, b500: 0,
    b1k: 1.0, b2k: 1.5, b4k: 1.0, b8k: 0.5, b16k: 0,
  },
  'Studio Reference': {
    preamp: 0,
    b32: 0.5, b64: 0.5, b125: 0, b250: 0, b500: 0,
    b1k: 0, b2k: 0, b4k: 0, b8k: 0, b16k: 0,
  },
  // Legacy presets (kept for compat)
  'Bass Boost': {
    preamp: 1.5,
    b32: 6.0, b64: 5.5, b125: 4.0, b250: 2.5, b500: 1.0,
    b1k: 0, b2k: 0, b4k: 0, b8k: 1.0, b16k: 1.5,
  },
  Rock: {
    preamp: 0,
    b32: 4.5, b64: 3.5, b125: 1.5, b250: -0.5, b500: -1.5,
    b1k: -0.5, b2k: 1.5, b4k: 3.0, b8k: 4.0, b16k: 4.5,
  },
  Pop: {
    preamp: 0,
    b32: 1.5, b64: 2.5, b125: 3.0, b250: 2.0, b500: 0,
    b1k: 1.0, b2k: 2.0, b4k: 3.0, b8k: 2.5, b16k: 2.0,
  },
  Classical: {
    preamp: 0,
    b32: 3.5, b64: 2.5, b125: 1.5, b250: 0, b500: 0,
    b1k: 0.5, b2k: 1.5, b4k: 2.5, b8k: 3.5, b16k: 4.0,
  },
  Electronic: {
    preamp: 1.0,
    b32: 5.5, b64: 4.5, b125: 2.0, b250: 0, b500: -1.0,
    b1k: 1.0, b2k: 2.5, b4k: 4.0, b8k: 4.5, b16k: 5.0,
  },
  'Hip Hop': {
    preamp: 1.0,
    b32: 6.5, b64: 5.5, b125: 3.5, b250: 1.5, b500: 0,
    b1k: 1.0, b2k: 2.0, b4k: 2.5, b8k: 3.5, b16k: 4.0,
  },
  'Vocal Booster': {
    preamp: 0,
    b32: -2.0, b64: -1.0, b125: 0, b250: 2.0, b500: 4.0,
    b1k: 4.5, b2k: 3.5, b4k: 2.0, b8k: 0.5, b16k: 0,
  },
  Acoustic: {
    preamp: 0,
    b32: 2.0, b64: 2.0, b125: 1.5, b250: 1.0, b500: 2.0,
    b1k: 2.0, b2k: 2.5, b4k: 3.0, b8k: 3.0, b16k: 2.5,
  },
  Jazz: {
    preamp: 0,
    b32: 3.0, b64: 2.5, b125: 1.5, b250: 1.0, b500: 0,
    b1k: 0, b2k: 1.0, b4k: 2.0, b8k: 3.0, b16k: 3.0,
  },
};

// Parametric presets (new, more precise)
export const PARAMETRIC_PRESETS: Record<EqualizerPreset, ParametricBand[]> = {
  Flat: DEFAULT_PARAMETRIC_BANDS.map(b => ({ ...b, gain: 0 })),
  'Sub-Bass Boost': DEFAULT_PARAMETRIC_BANDS.map((b, i) => {
    const gains = [8, 5, 2, 0.5, 0, 0, 0, 0, 0, 0];
    return { ...b, gain: gains[i] };
  }),
  'Vocal Clarity': DEFAULT_PARAMETRIC_BANDS.map((b, i) => {
    const gains = [-3, -2, -1, 1, 2, 3.5, 4, 3, 1.5, 0.5];
    return { ...b, gain: gains[i] };
  }),
  'Late Night': DEFAULT_PARAMETRIC_BANDS.map((b, i) => {
    const gains = [-4, -3, -2, -1, 0, 1, 1.5, 1, 0.5, 0];
    return { ...b, gain: gains[i] };
  }),
  'Studio Reference': DEFAULT_PARAMETRIC_BANDS.map((b, i) => {
    const gains = [0.5, 0.5, 0, 0, 0, 0, 0, 0, 0, 0];
    return { ...b, gain: gains[i] };
  }),
  // Legacy mapped to parametric
  'Bass Boost': DEFAULT_PARAMETRIC_BANDS.map((b, i) => {
    const gains = [6, 5, 3.5, 2, 1, 0, 0, 0, 0.5, 1];
    return { ...b, gain: gains[i] };
  }),
  Rock: DEFAULT_PARAMETRIC_BANDS.map((b, i) => {
    const gains = [4, 3, 1.5, -0.5, -1.5, -0.5, 1.5, 3, 4, 4.5];
    return { ...b, gain: gains[i] };
  }),
  Pop: DEFAULT_PARAMETRIC_BANDS.map((b, i) => {
    const gains = [1.5, 2.5, 3, 2, 0, 1, 2, 3, 2.5, 2];
    return { ...b, gain: gains[i] };
  }),
  Classical: DEFAULT_PARAMETRIC_BANDS.map((b, i) => {
    const gains = [3.5, 2.5, 1.5, 0, 0, 0.5, 1.5, 2.5, 3.5, 4];
    return { ...b, gain: gains[i] };
  }),
  Electronic: DEFAULT_PARAMETRIC_BANDS.map((b, i) => {
    const gains = [5, 4.5, 2, 0, -1, 1, 2.5, 4, 4.5, 5];
    return { ...b, gain: gains[i] };
  }),
  'Hip Hop': DEFAULT_PARAMETRIC_BANDS.map((b, i) => {
    const gains = [6.5, 5.5, 3.5, 1.5, 0, 1, 2, 2.5, 3.5, 4];
    return { ...b, gain: gains[i] };
  }),
  'Vocal Booster': DEFAULT_PARAMETRIC_BANDS.map((b, i) => {
    const gains = [-2, -1, 0, 2, 4, 4.5, 3.5, 2, 0.5, 0];
    return { ...b, gain: gains[i] };
  }),
  Acoustic: DEFAULT_PARAMETRIC_BANDS.map((b, i) => {
    const gains = [2, 2, 1.5, 1, 2, 2, 2.5, 3, 3, 2.5];
    return { ...b, gain: gains[i] };
  }),
  Jazz: DEFAULT_PARAMETRIC_BANDS.map((b, i) => {
    const gains = [3, 2.5, 1.5, 1, 0, 0, 1, 2, 3, 3];
    return { ...b, gain: gains[i] };
  }),
};

// ============================================================================
// Storage
// ============================================================================

const STORAGE_KEY = 'aapesh_audio_dsp_state';
const CUSTOM_PRESETS_KEY = 'aapesh_custom_presets';

const loadSavedState = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    }
  } catch {}
  return null;
};

const loadCustomPresets = (): Record<string, ParametricBand[]> => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(CUSTOM_PRESETS_KEY);
      if (saved) return JSON.parse(saved);
    }
  } catch {}
  return {};
};

// ============================================================================
// Store
// ============================================================================

const saved = loadSavedState();
const customPresets = loadCustomPresets();

export const useAudioDSPStore = create<AudioDSPState>()(
  persist(
    (set, get) => ({
      // UI State
      isOpen: false,
      isDrawerOpen: false,

      // Equalizer
      activePreset: saved?.activePreset || 'Flat',
      bands: saved?.bands || { ...DEFAULT_GRAPHIC_BANDS, parametric: DEFAULT_PARAMETRIC_BANDS },
      parametricBands: saved?.parametricBands || DEFAULT_PARAMETRIC_BANDS,

      // Stereo / Spatial
      stereoBalance: saved?.stereoBalance ?? 0,
      stereoWidth: saved?.stereoWidth ?? 100,

      // Playback
      playbackSpeed: saved?.playbackSpeed ?? 1,
      spatialAudio: saved?.spatialAudio ?? false,

      // VU Meters
      vuMeterData: DEFAULT_VU_METER,

      // Concentric Mode
      concentricMode: saved?.concentricMode ?? false,

      // --- Actions ---

      // UI
      setOpen: (isOpen) => set({ isOpen }),
      toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
      setDrawerOpen: (isDrawerOpen) => set({ isDrawerOpen }),
      toggleDrawer: () => set((s) => ({ isDrawerOpen: !s.isDrawerOpen })),

      // Presets
      setPreset: (preset) => {
        const newGraphicBands = { ...PRESET_VALUES[preset] };
        const newParametricBands = PARAMETRIC_PRESETS[preset] ? [...PARAMETRIC_PRESETS[preset]] : DEFAULT_PARAMETRIC_BANDS;

        set({
          activePreset: preset,
          bands: { ...newGraphicBands, parametric: newParametricBands },
          parametricBands: newParametricBands,
        });
      },

      saveCustomPreset: (name, bands) => {
        const updated = { ...getCustomPresets(), [name]: bands };
        try {
          localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(updated));
        } catch {}
        // Custom presets are stored separately; could extend activePreset type to include them
      },

      deleteCustomPreset: (name) => {
        const updated = { ...getCustomPresets() };
        delete updated[name];
        try {
          localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(updated));
        } catch {}
      },

      // Graphic EQ (Legacy)
      setBand: (band, value) => {
        const clamped = Math.max(-24, Math.min(24, value));
        const newBands = { ...get().bands, [band]: clamped };
        set({ bands: newBands });

        // Sync parametric equivalent if it's a graphic band
        const parametricIndex = GRAPHIC_TO_PARAMETRIC_INDEX[band];
        if (parametricIndex !== undefined) {
          const newParametric = [...get().parametricBands];
          newParametric[parametricIndex] = {
            ...newParametric[parametricIndex],
            gain: clamped,
          };
          set({ parametricBands: newParametric });
        }
      },

      setPreamp: (value) => {
        const clamped = Math.max(-24, Math.min(24, value));
        set({ bands: { ...get().bands, preamp: clamped } });
      },

      // Parametric EQ (New)
      setParametricBand: (index, band) => {
        if (index < 0 || index >= 10) return;
        const newParametric = [...get().parametricBands];
        newParametric[index] = { ...newParametric[index], ...band };
        set({ parametricBands: newParametric });

        // Sync graphic equivalent
        const graphicBand = PARAMETRIC_TO_GRAPHIC_INDEX[index];
        if (graphicBand !== undefined) {
          const newBands = { ...get().bands };
          newBands[graphicBand] = newParametric[index].gain;
          set({ bands: newBands });
        }
      },

      setParametricBandFreq: (index, freq) => {
        get().setParametricBand(index, { freq: Math.max(20, Math.min(20000, freq)) });
      },

      setParametricBandQ: (index, q) => {
        get().setParametricBand(index, { q: Math.max(0.1, Math.min(10, q)) });
      },

      setParametricBandGain: (index, gain) => {
        get().setParametricBand(index, { gain: Math.max(-24, Math.min(24, gain)) });
      },

      setParametricBandEnabled: (index, enabled) => {
        get().setParametricBand(index, { enabled });
      },

      setParametricBandType: (index, type) => {
        get().setParametricBand(index, { type });
      },

      resetParametricBands: () => {
        set({ parametricBands: DEFAULT_PARAMETRIC_BANDS });
        // Sync graphic
        const newBands = { ...DEFAULT_GRAPHIC_BANDS };
        DEFAULT_PARAMETRIC_BANDS.forEach((b, i) => {
          const graphicBand = PARAMETRIC_TO_GRAPHIC_INDEX[i];
          if (graphicBand !== undefined) {
            newBands[graphicBand] = b.gain;
          }
        });
        set({ bands: { ...newBands, parametric: DEFAULT_PARAMETRIC_BANDS } });
      },

      // Stereo
      setStereoBalance: (stereoBalance) => {
        const clamped = Math.max(-100, Math.min(100, stereoBalance));
        set({ stereoBalance: clamped });
      },

      setStereoWidth: (stereoWidth) => {
        const clamped = Math.max(0, Math.min(200, stereoWidth));
        set({ stereoWidth: clamped });
      },

      // Playback Speed
      setPlaybackSpeed: (playbackSpeed) => {
        const allowed = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const clamped = allowed.includes(playbackSpeed) ? playbackSpeed : 1;
        set({ playbackSpeed: clamped });
        try {
          defaultPlaybackEngine.setPlaybackRate?.(clamped);
        } catch {}
      },

      // Spatial Audio
      toggleSpatialAudio: () => {
        const next = !get().spatialAudio;
        set({ spatialAudio: next });
      },

      setSpatialAudio: (spatialAudio) => {
        set({ spatialAudio });
      },

      // VU Meters
      updateVUMeterData: (data) => {
        set((s) => ({
          vuMeterData: {
            ...s.vuMeterData,
            ...data,
            timestamp: Date.now(),
            // Auto peak hold
            peakL: Math.max(s.vuMeterData.peakL, data.outputL ?? 0),
            peakR: Math.max(s.vuMeterData.peakR, data.outputR ?? 0),
          },
        }));
      },

      resetVUMeterPeaks: () => {
        set((s) => ({
          vuMeterData: { ...s.vuMeterData, peakL: s.vuMeterData.outputL, peakR: s.vuMeterData.outputR },
        }));
      },

      // Concentric Mode
      toggleConcentricMode: () => {
        set((s) => ({ concentricMode: !s.concentricMode }));
      },

      // Reset
      resetAll: () => {
        set({
          activePreset: 'Flat',
          bands: { ...DEFAULT_GRAPHIC_BANDS, parametric: DEFAULT_PARAMETRIC_BANDS },
          parametricBands: DEFAULT_PARAMETRIC_BANDS,
          stereoBalance: 0,
          stereoWidth: 100,
          playbackSpeed: 1,
          spatialAudio: false,
          concentricMode: false,
          vuMeterData: DEFAULT_VU_METER,
        });
        try {
          defaultPlaybackEngine.setPlaybackRate?.(1);
        } catch {}
      },

      resetEQOnly: () => {
        set({
          activePreset: 'Flat',
          bands: { ...DEFAULT_GRAPHIC_BANDS, parametric: DEFAULT_PARAMETRIC_BANDS },
          parametricBands: DEFAULT_PARAMETRIC_BANDS,
        });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activePreset: state.activePreset,
        bands: state.bands,
        parametricBands: state.parametricBands,
        stereoBalance: state.stereoBalance,
        stereoWidth: state.stereoWidth,
        playbackSpeed: state.playbackSpeed,
        spatialAudio: state.spatialAudio,
        concentricMode: state.concentricMode,
      }),
    }
  )
);

// ============================================================================
// Helper functions for cross-sync
// ============================================================================

const GRAPHIC_TO_PARAMETRIC_INDEX: Record<string, number> = {
  b32: 0, b64: 1, b125: 2, b250: 3, b500: 4,
  b1k: 5, b2k: 6, b4k: 7, b8k: 8, b16k: 9,
};

const PARAMETRIC_TO_GRAPHIC_INDEX: Record<number, keyof Omit<EqualizerBands, 'parametric'>> = {
  0: 'b32', 1: 'b64', 2: 'b125', 3: 'b250', 4: 'b500',
  5: 'b1k', 6: 'b2k', 7: 'b4k', 8: 'b8k', 9: 'b16k',
};

function getCustomPresets(): Record<string, ParametricBand[]> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(CUSTOM_PRESETS_KEY);
      if (saved) return JSON.parse(saved);
    }
  } catch {}
  return {};
}

// ============================================================================
// Backward Compatibility Exports
// ============================================================================

// Re-export types for existing imports
export type { EqualizerBands as LegacyEqualizerBands };
export { PRESET_VALUES as LegacyPRESET_VALUES };

// Legacy selector helpers for components that still use the old API shape
export const useEqualizerStore = {
  // State selectors (backward compat)
  getState: () => {
    const state = useAudioDSPStore.getState();
    return {
      isOpen: state.isOpen,
      activePreset: state.activePreset,
      bands: state.bands,
      stereoBalance: state.stereoBalance,
      playbackSpeed: state.playbackSpeed,
      spatialAudio: state.spatialAudio,
      concentricMode: state.concentricMode,
      // Legacy methods
      setOpen: state.setOpen,
      toggleOpen: state.toggleOpen,
      setPreset: state.setPreset,
      setBand: state.setBand,
      setStereoBalance: state.setStereoBalance,
      setPlaybackSpeed: state.setPlaybackSpeed,
      toggleSpatialAudio: state.toggleSpatialAudio,
      setSpatialAudio: state.setSpatialAudio,
      toggleConcentricMode: state.toggleConcentricMode,
      resetAll: state.resetAll,
    };
  },

  // Subscribe for React components (returns full state for compat)
  subscribe: useAudioDSPStore.subscribe,
};

// Expose for debugging
localAudioProvider.applyDSP(useAudioDSPStore.getState());
useAudioDSPStore.subscribe(state => localAudioProvider.applyDSP(state));

if (typeof window !== 'undefined') {
  (window as any).__aapeshAudioDSPStore = useAudioDSPStore;
  // Legacy alias
  (window as any).__aapeshEqualizerStore = useAudioDSPStore;
}
