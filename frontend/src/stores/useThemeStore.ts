import { create } from 'zustand';
import { VisualQuality } from '@/components/spatial/qualitySettings';

type Theme = 'dark' | 'light' | 'system';

interface ThemeState {
  theme: Theme;
  ambientGlow: boolean;
  visualQuality: VisualQuality;
  setTheme: (theme: Theme) => void;
  toggleAmbientGlow: () => void;
  setVisualQuality: (quality: VisualQuality) => void;
}

const safeGetItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return null;
};

const safeSetItem = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
};

const getInitialTheme = (): Theme => {
  const saved = safeGetItem('aapesh_theme') || safeGetItem('aurora_theme');
  return saved === 'light' || saved === 'dark' || saved === 'system' ? (saved as Theme) : 'dark';
};

const getInitialAmbient = (): boolean => {
  const saved = safeGetItem('aapesh_ambient_glow') ?? safeGetItem('aurora_ambient_glow');
  return saved !== null ? saved === 'true' : true;
};

const getInitialQuality = (): VisualQuality => {
  const saved = safeGetItem('aapesh_visual_quality');
  if (saved === 'low' || saved === 'medium' || saved === 'high' || saved === 'ultra') {
    return saved as VisualQuality;
  }
  return 'high';
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  ambientGlow: getInitialAmbient(),
  visualQuality: getInitialQuality(),

  setTheme: (theme: Theme) => {
    safeSetItem('aapesh_theme', theme);
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'system') {
        const prefersDark = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true;
        root.classList.toggle('dark', prefersDark);
      } else {
        root.classList.toggle('dark', theme === 'dark');
      }
    }
    set({ theme });
  },

  toggleAmbientGlow: () => {
    set((s) => {
      const next = !s.ambientGlow;
      safeSetItem('aapesh_ambient_glow', String(next));
      return { ambientGlow: next };
    });
  },

  setVisualQuality: (visualQuality: VisualQuality) => {
    safeSetItem('aapesh_visual_quality', visualQuality);
    set({ visualQuality });
  },
}));
