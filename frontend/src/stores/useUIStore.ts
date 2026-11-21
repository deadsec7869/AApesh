import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type VisualizerMode = 'lumn' | 'ferrofluid' | 'cymatics' | 'starfield' | 'stealth' | 'ripple';
export type LumnMode = 'music-sync' | 'idle' | 'still';

export interface UIState {
  // Visualizer
  visualizerMode: VisualizerMode;
  setVisualizerMode: (mode: VisualizerMode) => void;
  cycleVisualizerMode: () => void;

  // Lumn Ambient Rim Lighting
  lumnMode: LumnMode;
  setLumnMode: (mode: LumnMode) => void;
  lumnThickness: number;      // 1-24px
  setLumnThickness: (px: number) => void;
  lumnIntensity: number;      // 0-100%
  setLumnIntensity: (pct: number) => void;
  lumnColorSync: boolean;     // true = sample from artwork, false = custom colors
  setLumnColorSync: (enabled: boolean) => void;
  lumnCustomPrimary: string;  // hex color
  setLumnCustomPrimary: (color: string) => void;
  lumnCustomSecondary: string; // hex color
  setLumnCustomSecondary: (color: string) => void;

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

  // Left Dock (Library) - Desktop persistent, Mobile slide-over
  leftDockCollapsed: boolean;
  setLeftDockCollapsed: (collapsed: boolean) => void;
  toggleLeftDock: () => void;
  leftDockOpen: boolean;
  setLeftDockOpen: (open: boolean) => void;

  // Right Dock (Queue/Lyrics/EQ) - Desktop persistent, Mobile slide-over
  rightDockOpen: boolean;
  setRightDockOpen: (open: boolean) => void;

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

  // View Mode
  viewMode: 'discover' | 'studio' | 'stage';
  setViewMode: (mode: UIState['viewMode']) => void;
}

const VISUALIZER_MODES: VisualizerMode[] = ['lumn', 'ferrofluid', 'cymatics', 'starfield', 'stealth', 'ripple'];
const LUMN_MODES: LumnMode[] = ['music-sync', 'idle', 'still'];

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Visualizer
      visualizerMode: 'lumn',
      setVisualizerMode: (mode) => set({ visualizerMode: mode }),
      cycleVisualizerMode: () => {
        const current = get().visualizerMode;
        const idx = VISUALIZER_MODES.indexOf(current);
        const next = VISUALIZER_MODES[(idx + 1) % VISUALIZER_MODES.length];
        set({ visualizerMode: next });
      },

      // Lumn Ambient Rim Lighting
      lumnMode: 'music-sync',
      setLumnMode: (mode) => set({ lumnMode: mode }),
      lumnThickness: 8,
      setLumnThickness: (px) => set({ lumnThickness: Math.max(1, Math.min(24, px)) }),
      lumnIntensity: 70,
      setLumnIntensity: (pct) => set({ lumnIntensity: Math.max(0, Math.min(100, pct)) }),
      lumnColorSync: true,
      setLumnColorSync: (enabled) => set({ lumnColorSync: enabled }),
      lumnCustomPrimary: '#f59e0b',
      setLumnCustomPrimary: (color) => set({ lumnCustomPrimary: color }),
      lumnCustomSecondary: '#3b82f6',
      setLumnCustomSecondary: (color) => set({ lumnCustomSecondary: color }),

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
      leftDockOpen: true,
      setLeftDockOpen: (open) => set({ leftDockOpen: open }),

      // Right Dock
      rightDockOpen: true,
      setRightDockOpen: (open) => set({ rightDockOpen: open }),

      // Top Bar
      topBarVisible: true,
      setTopBarVisible: (visible) => set({ topBarVisible: visible }),

      // Equalizer Drawer
      equalizerDrawerOpen: false,
      setEqualizerDrawerOpen: (open) => set({ equalizerDrawerOpen: open }),
      toggleEqualizerDrawer: () => set((s) => ({ equalizerDrawerOpen: !s.equalizerDrawerOpen })),
      toggleEqualizer: () => set((s) => ({ equalizerDrawerOpen: !s.equalizerDrawerOpen })),

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

      // View Mode
      viewMode: 'discover',
      setViewMode: (mode) => set({ viewMode: mode }),

      // Ambient Glow
      ambientGlowEnabled: true,
      setAmbientGlowEnabled: (enabled) => set({ ambientGlowEnabled: enabled }),
    }),
    {
      name: 'aapesh_ui_state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        visualizerMode: state.visualizerMode,
        lumnMode: state.lumnMode,
        lumnThickness: state.lumnThickness,
        lumnIntensity: state.lumnIntensity,
        lumnColorSync: state.lumnColorSync,
        lumnCustomPrimary: state.lumnCustomPrimary,
        lumnCustomSecondary: state.lumnCustomSecondary,
        zenMode: state.zenMode,
        leftDockCollapsed: state.leftDockCollapsed,
        visualQuality: state.visualQuality,
        ambientGlowEnabled: state.ambientGlowEnabled,
        reducedMotion: state.reducedMotion,
        viewMode: state.viewMode,
      }),
    }
  )
);

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).__aapeshUIStore = useUIStore;
}