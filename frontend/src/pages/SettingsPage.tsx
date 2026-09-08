import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sparkles,
  Sliders,
  ShieldCheck,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { useThemeStore } from '@/stores/useThemeStore';
import { api } from '@/api/client';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme, ambientGlow, toggleAmbientGlow } = useThemeStore();
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [isReloadingAuth, setIsReloadingAuth] = useState(false);
  const [setupStepsOpen, setSetupStepsOpen] = useState(false);
  const [instructions, setInstructions] = useState<any>(null);

  const fetchAuth = () => {
    api.getAuthStatus().then(setAuthStatus).catch(() => {});
  };

  useEffect(() => {
    fetchAuth();
    fetch('/api/auth/instructions')
      .then((r) => (r.ok ? r.json() : null))
      .then(setInstructions)
      .catch(() => {});
  }, []);

  const handleReloadAuth = async () => {
    setIsReloadingAuth(true);
    try {
      const res = await fetch('/api/auth/reload', { method: 'POST' });
      if (res.ok) {
        fetchAuth();
      }
    } finally {
      setIsReloadingAuth(false);
    }
  };

  const handleClearCache = () => {
    if (window.confirm('Clear all local app cache and preferences?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl flex flex-col gap-10 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          <Settings className="w-4 h-4" />
          <span>Preferences & Configuration</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          Settings
        </h1>
      </div>

      {/* SECTION 1: Appearance */}
      <section className="flex flex-col gap-4 p-6 rounded-3xl glass-surface border border-white/10">
        <div className="flex items-center gap-2 text-lg font-bold text-white">
          <Sparkles className="w-5 h-5 text-white" />
          <h2>Appearance</h2>
        </div>

        <div className="flex flex-col gap-6 pt-2">
          {/* Theme Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-neutral-200">Theme Mode</div>
              <div className="text-xs text-neutral-400">Choose between dark, light, or system appearance</div>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.05] border border-white/10 shrink-0">
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  theme === 'dark'
                    ? 'bg-white text-black shadow-play-btn'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  theme === 'light'
                    ? 'bg-white text-black shadow-play-btn'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  theme === 'system'
                    ? 'bg-white text-black shadow-play-btn'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>System</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Ambient Glow */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-neutral-200">Ambient Artwork Aura</div>
              <div className="text-xs text-neutral-400">
                Reflect dynamic colors from album artwork across player and backdrop
              </div>
            </div>

            <button
              onClick={toggleAmbientGlow}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                ambientGlow ? 'bg-white' : 'bg-neutral-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full ${
                  ambientGlow ? 'bg-black translate-x-6' : 'bg-white translate-x-0'
                } transition-transform duration-200 ease-in-out`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 2: Audio Engine & Playback */}
      <section className="flex flex-col gap-4 p-6 rounded-3xl glass-surface border border-white/10">
        <div className="flex items-center gap-2 text-lg font-bold text-white">
          <Sliders className="w-5 h-5 text-white" />
          <h2>Audio Playback Engine</h2>
        </div>

        <div className="flex flex-col gap-4 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-neutral-200">Playback Provider</div>
              <div className="text-xs text-neutral-400">
                Official YouTube IFrame Player API (Full fidelity streaming engine)
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white border border-white/20">
              Active
            </span>
          </div>

          <div className="h-px bg-white/10" />

          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-neutral-200">Media Session API</div>
              <div className="text-xs text-neutral-400">
                Hardware media keys, lock-screen controls, and notifications
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Supported
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 3: YouTube Music Authentication & Account */}
      <section className="flex flex-col gap-4 p-6 rounded-3xl glass-surface border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <ShieldCheck className="w-5 h-5 text-white" />
            <h2>YouTube Music Account</h2>
          </div>

          <button
            onClick={handleReloadAuth}
            disabled={isReloadingAuth}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-neutral-300 text-xs font-medium border border-white/10 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReloadingAuth ? 'animate-spin' : ''}`} />
            <span>Reload Status</span>
          </button>
        </div>

        <div className="flex flex-col gap-4 pt-2">
          {/* Status Banner */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            {authStatus?.isAuthenticated ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-neutral-400 shrink-0" />
            )}
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">
                {authStatus?.isAuthenticated ? 'Connected to YouTube Music' : 'Public Guest Mode Active'}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {authStatus?.isAuthenticated
                  ? 'Your personal playlists, ratings, and subscriptions are synchronizing.'
                  : 'AAPESH is streaming using YouTube Music global catalog. Search, charts, radio, and lyrics work out-of-the-box!'}
              </p>
            </div>
          </div>

          {/* Setup Instructions Toggle */}
          <button
            onClick={() => setSetupStepsOpen(!setupStepsOpen)}
            className="text-xs text-neutral-400 hover:text-white text-left font-medium underline underline-offset-4 transition-colors"
          >
            {setupStepsOpen ? 'Hide OAuth Setup Instructions' : 'How to connect your personal YouTube Music account →'}
          </button>

          {setupStepsOpen && instructions && (
            <div className="p-5 rounded-2xl bg-charcoal-900/90 border border-white/10 flex flex-col gap-4 text-xs animate-in fade-in duration-200">
              <h3 className="font-bold text-white text-sm">{instructions.title}</h3>
              <div className="flex flex-col gap-3">
                {instructions.steps?.map((step: any) => (
                  <div key={step.step} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-white font-mono flex items-center justify-center shrink-0">
                      {step.step}
                    </span>
                    <div>
                      <div className="font-semibold text-neutral-200">{step.title}</div>
                      <div className="text-neutral-400 mt-0.5">{step.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4: Data & Cache Maintenance */}
      <section className="flex flex-col gap-4 p-6 rounded-3xl glass-surface border border-white/10">
        <div className="flex items-center gap-2 text-lg font-bold text-white">
          <Trash2 className="w-5 h-5 text-red-400" />
          <h2>Storage & Reset</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div>
            <div className="text-sm font-semibold text-neutral-200">Clear Local Storage & Cache</div>
            <div className="text-xs text-neutral-400">
              Clears saved queue, volume preferences, and cached UI state.
            </div>
          </div>

          <button
            onClick={handleClearCache}
            className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 text-xs font-semibold transition-colors"
          >
            Reset App Cache
          </button>
        </div>
      </section>

      {/* SECTION 5: Legal & About */}
      <section className="flex flex-col gap-2 p-6 rounded-3xl bg-white/[0.02] border border-white/5 text-xs text-neutral-500">
        <div className="flex items-center gap-2 text-neutral-400 font-semibold">
          <Info className="w-4 h-4" />
          <span>About AAPESH</span>
        </div>
        <p>
          AAPESH is an independent spatial music experience powered by the YouTube Music catalog and ytmusicapi. Not affiliated with, endorsed by, or sponsored by Google, YouTube, Spotify, or Apple.
        </p>
        <p className="mt-1">Version 1.0.0 • Production Release</p>
      </section>
    </div>
  );
};
