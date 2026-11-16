import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type VisualizerMode = 'ferrofluid' | 'cymatics' | 'starfield' | 'stealth';

export interface UIState {
  // Visualizer
  visualizerMode: VisualizerMode;
  setVisualizerMode: (mode: VisualizerMode) => void;
  cycleVisualizerMode: () => void;

  // Zen / Ambient Mode
  zenMode: boolean;
  toggleZenMode: () => void;
  setZenMode: (enabled: boolean) => void;

  // Command Palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  // Global Search / Omnibox
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  clearSearchQuery: () => void;

  // Left Dock (Library)
  leftDockCollapsed: boolean;
  setLeftDockCollapsed: (collapsed: boolean) => void;
  toggleLeftDock: () => void;

  // Top Telemetry Bar
  topBarVisible: boolean;
  setTopBarVisible: (visible: boolean) => void;

  // Equalizer Drawer (slide-over)
  equalizerDrawerOpen: boolean;
  setEqualizerDrawerOpen: (open: boolean) => void;
  toggleEqualizerDrawer: () => void;

  // Spatial Audio / EQ drawer trigger (legacy sync)
  spatialAudioDrawerOpen: boolean;
  setSpatialAudioDrawerOpen: (open: boolean) => void;

  // Reduced Motion Preference (synced from media query)
  reducedMotion: boolean;
  setReducedMotion: (reduced: boolean) => void;

  // Active HUD Panel (for focus management)
  activeHUDPanel: 'none' | 'equalizer' | 'lyrics' | 'queue' | 'about' | 'search' | 'settings';
  setActiveHUDPanel: (panel: UIState['activeHUDPanel']) => void;

  // Fullscreen Player Integration
  isPlayerExpanded: boolean;
  setIsPlayerExpanded: (expanded: boolean) => void;

  // Audio Visualization Quality
  visualQuality: 'high' | 'medium' | 'low' | 'off';
  setVisualQuality: (quality: UIState['visualQuality']) => void;

  // Ambient Artwork Glow
  ambientGlowEnabled: boolean;
  setAmbientGlowEnabled: (enabled: boolean) => void;
}

const VISUALIZER_MODES: VisualizerMode[] = ['ferrofluid', 'cymatics', 'starfield', 'stealth'];

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Visualizer
      visualizerMode: 'ferrofluid',
      setVisualizerMode: (mode) => set({ visualizerMode: mode }),
      cycleVisualizerMode: () => {
        const current = get().visualizerMode;
        const idx = VISUALIZER_MODES.indexOf(current);
        const next = VISUALIZER_MODES[(idx + 1) % VISUALIZER_MODES.length];
        set({ visualizerMode: next });
      },

      // Zen Mode
      zenMode: false,
      toggleZenMode: () => set((s) => ({ zenMode: !s.zenMode })),
      setZenMode: (enabled) => set({ zenMode: enabled }),

      // Command Palette
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

      // Search
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      clearSearchQuery: () => set({ searchQuery: '' }),

      // Left Dock
      leftDockCollapsed: false,
      setLeftDockCollapsed: (collapsed) => set({ leftDockCollapsed: collapsed }),
      toggleLeftDock: () => set((s) => ({ leftDockCollapsed: !s.leftDockCollapsed })),

      // Top Bar
      topBarVisible: true,
      setTopBarVisible: (visible) => set({ topBarVisible: visible }),

      // Equalizer Drawer
      equalizerDrawerOpen: false,
      setEqualizerDrawerOpen: (open) => set({ equalizerDrawerOpen: open }),
      toggleEqualizerDrawer: () => set((s) => ({ equalizerDrawerOpen: !s.equalizerDrawerOpen })),

      // Spatial Audio Drawer (legacy)
      spatialAudioDrawerOpen: false,
      setSpatialAudioDrawerOpen: (open) => set({ spatialAudioDrawerOpen: open }),

      // Reduced Motion
      reducedMotion: false,
      setReducedMotion: (reduced) => set({ reducedMotion: reduced }),

      // Active HUD Panel
      activeHUDPanel: 'none',
      setActiveHUDPanel: (panel) => set({ activeHUDPanel: panel }),

      // Fullscreen Player
      isPlayerExpanded: false,
      setIsPlayerExpanded: (expanded) => set({ isPlayerExpanded: expanded }),

      // Visual Quality
      visualQuality: 'high',
      setVisualQuality: (quality) => set({ visualQuality: quality }),

      // Ambient Glow
      ambientGlowEnabled: true,
      setAmbientGlowEnabled: (enabled) => set({ ambientGlowEnabled: enabled }),
    }),
    {
      name: 'aapesh_ui_state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        visualizerMode: state.visualizerMode,
        zenMode: state.zenMode,
        leftDockCollapsed: state.leftDockCollapsed,
        visualQuality: state.visualQuality,
        ambientGlowEnabled: state.ambientGlowEnabled,
        reducedMotion: state.reducedMotion,
      }),
    }
  )
);

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).__aapeshUIStore = useUIStore;
}