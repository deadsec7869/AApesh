import { create } from 'zustand';

type Theme = 'dark' | 'light' | 'system';

interface ThemeState {
  theme: Theme;
  ambientGlow: boolean;
  setTheme: (theme: Theme) => void;
  toggleAmbientGlow: () => void;
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
  const saved = safeGetItem('aurora_theme');
  return saved === 'light' || saved === 'dark' || saved === 'system' ? (saved as Theme) : 'dark';
};

const getInitialAmbient = (): boolean => {
  const saved = safeGetItem('aurora_ambient_glow');
  return saved !== null ? saved === 'true' : true;
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  ambientGlow: getInitialAmbient(),

  setTheme: (theme: Theme) => {
    safeSetItem('aurora_theme', theme);
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
      safeSetItem('aurora_ambient_glow', String(next));
      return { ambientGlow: next };
    });
  },
}));
