import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ChevronUp,
  Search,
  ListMusic,
  Mic2,
  SlidersHorizontal,
  Sparkles,
  Radio,
  Plus,
  Heart,
  History,
  DownloadCloud,
  Headphones,
  Play,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useUIStore } from '@/stores/useUIStore';
import { useOfflineStore } from '@/stores/useOfflineStore';
import { useAudioDSPStore } from '@/stores/useAudioDSPStore';
import { api } from '@/api/client';
import { Track, Shelf, ShelfItem } from '@/types/music';
import { ArtworkImage } from '@/components/common/ArtworkImage';
import { TrackRow } from '@/components/music/TrackRow';
import { useNavigate } from 'react-router-dom';

const MODULES = [
  {
    id: 'overview',
    label: 'Overview / Discovery',
    icon: Radio,
    tabs: [
      { id: 'home', label: 'Home / Charts', icon: Radio },
      { id: 'search', label: 'Search', icon: Sparkles },
      { id: 'artists', label: 'Artists / Credits', icon: Headphones },
    ],
  },
  {
    id: 'tracks',
    label: 'Tracks / Queue',
    icon: ListMusic,
    tabs: [
      { id: 'queue', label: 'Up Next Queue', icon: ListMusic },
      { id: 'playlists', label: 'Saved Playlists', icon: Sparkles },
      { id: 'history', label: 'History', icon: History },
    ],
  },
  {
    id: 'lyrics',
    label: 'Lyrics & DSP',
    icon: SlidersHorizontal,
    tabs: [
      { id: 'lyrics', label: 'Synced Lyrics', icon: Mic2 },
      { id: 'eq', label: '10-Band Parametric EQ', icon: SlidersHorizontal },
    ],
  },
] as const;

type ModuleId = (typeof MODULES)[number]['id'];

interface FloatingModuleDockProps {
  className?: string;
}

export const FloatingModuleDock: React.FC<FloatingModuleDockProps> = ({ className = '' }) => {
  const [moduleStates, setModuleStates] = useState<
    Record<ModuleId, { expanded: boolean; activeTab: string }>
  >({
    overview: { expanded: false, activeTab: 'home' },
    tracks: { expanded: false, activeTab: 'queue' },
    lyrics: { expanded: false, activeTab: 'lyrics' },
  });
  const [moduleOrder, setModuleOrder] = useState<ModuleId[]>(['overview', 'tracks', 'lyrics']);
  const [draggedModule, setDraggedModule] = useState<ModuleId | null>(null);
  const orderedModules = useMemo(
    () => moduleOrder.map((id) => MODULES.find((module) => module.id === id)!).filter(Boolean),
    [moduleOrder],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModuleStates((prev) => {
          let changed = false;
          const next = { ...prev };
          (Object.keys(next) as ModuleId[]).forEach((key) => {
            if (next[key].expanded) {
              next[key] = { ...next[key], expanded: false };
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleModule = useCallback((moduleId: ModuleId) => {
    setModuleStates((prev) => {
      const next = { ...prev };
      const wasExpanded = prev[moduleId]?.expanded;

      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        (Object.keys(next) as ModuleId[]).forEach((key) => {
          if (key !== moduleId) {
            next[key] = { ...next[key], expanded: false };
          }
        });
      }

      next[moduleId] = { ...next[moduleId], expanded: !wasExpanded };
      return next;
    });
  }, []);

  const setActiveTab = useCallback((moduleId: ModuleId, tab: string) => {
    setModuleStates((prev) => ({
      ...prev,
      [moduleId]: { ...prev[moduleId], activeTab: tab },
    }));
  }, []);

  const handleModuleDrop = useCallback((targetId: ModuleId) => {
    if (!draggedModule || draggedModule === targetId) return;
    setModuleOrder((current) => {
      const next = current.filter((id) => id !== draggedModule);
      const targetIndex = next.indexOf(targetId);
      next.splice(targetIndex, 0, draggedModule);
      return next;
    });
    setDraggedModule(null);
  }, [draggedModule]);

  return (
    <div
      className={`relative z-20 h-14 w-full shrink-0 pointer-events-none px-3 ${className}`}
    >
      <div
        className="relative flex h-full w-full flex-col items-center justify-center"
        role="region"
        aria-label="Module dock"
      >
        {/* Expanded Module Cards */}
        <div className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 grid min-h-0 w-full grid-cols-1 gap-3 pointer-events-none lg:grid-cols-3 lg:items-stretch">
          <AnimatePresence>
            {orderedModules.map((module, moduleIndex) => {
              const state = moduleStates[module.id];
              const isExpanded = state?.expanded ?? false;
              const activeTab = state?.activeTab || module.tabs[0]?.id;

              if (!isExpanded) return null;

              return (
                <motion.div
                  key={`${module.id}-expanded`}
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="relative flex flex-col pointer-events-auto overflow-hidden"
                  style={{
                    width: '100%',
                    gridColumn: moduleIndex + 1,
                    minWidth: 0,
                    maxWidth: 'none',
                    height: 'min(52vh, 560px)',
                    maxHeight: 'min(52vh, 560px)',
                    background: 'rgba(16, 16, 20, 0.88)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    boxShadow:
                      '0 24px 64px -16px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <ModuleCardContent
                    module={module}
                    activeTab={activeTab}
                    onTabChange={(tab) => setActiveTab(module.id, tab)}
                    onClose={() => toggleModule(module.id)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Bottom Dock Pills */}
        <div className="flex h-full w-full items-center justify-start gap-2 overflow-x-auto flex-nowrap pointer-events-auto lg:justify-center">
          {orderedModules.map((module) => {
            const state = moduleStates[module.id];
            const isExpanded = state?.expanded ?? false;
            const Icon = module.icon;

            return (
              <motion.button
                key={module.id}
                type="button"
                draggable
                onDragStart={() => setDraggedModule(module.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleModuleDrop(module.id)}
                onDragEnd={() => setDraggedModule(null)}
                aria-label={`${module.label}; drag to reorder`}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={() => toggleModule(module.id)}
                className="module-pill flex shrink-0 items-center gap-2 px-3 py-2 rounded-2xl transition-all"
                style={{
                  background: 'rgba(16, 16, 20, 0.88)',
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  border: isExpanded
                    ? '1px solid rgba(255, 255, 255, 0.2)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow:
                    '0 8px 32px -8px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.05)',
                }}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isExpanded ? 'text-white' : 'text-tertiary'
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`text-xs font-medium truncate transition-colors ${
                    isExpanded ? 'text-white' : 'text-secondary'
                  }`}
                >
                  {module.label}
                </span>
                <motion.span
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2, ease: [0.34, 1.4, 0.64, 1] }}
                  className="flex-shrink-0"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-tertiary" />
                </motion.span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface ModuleCardContentProps {
  module: (typeof MODULES)[number];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClose: () => void;
}

const ModuleCardContent: React.FC<ModuleCardContentProps> = ({
  module,
  activeTab,
  onTabChange,
  onClose,
}) => {
  const ModuleIcon = module.icon;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
      case 'search':
      case 'artists':
        return <OverviewTabContent />;
      case 'queue':
      case 'playlists':
      case 'history':
        return <TracksTabContent tab={activeTab} />;
      case 'lyrics':
      case 'eq':
        return <LyricsTabContent tab={activeTab} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-4">
      <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-white/10 shrink-0 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ModuleIcon className="w-4 h-4 text-white shrink-0" />
          <span className="text-sm font-semibold text-white truncate">{module.label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 flex-nowrap">
          {module.tabs.map((tab) => {
            const TabIcon = tab.icon;
            // Only show icon on non-active tabs, text on active tab
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-label={tab.label}
                aria-pressed={activeTab === tab.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white ring-1 ring-white/20 shadow-sm font-semibold'
                    : 'text-tertiary hover:text-white'
                }`}
              >
                {activeTab !== tab.id && <TabIcon className="w-3.5 h-3.5 shrink-0" />}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full glass-pill flex items-center justify-center transition-all ml-1 shrink-0"
            aria-label="Minimize module"
          >
            <X className="w-3.5 h-3.5 text-tertiary hover:text-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1">{renderTabContent()}</div>
    </div>
  );
};

const OverviewTabContent: React.FC = () => {
  const { setViewMode } = useUIStore();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'partial'>('loading');
  const [attempt, retry] = useState(0);
  const play = usePlayerStore((s) => s.playTrack);
  const recent = usePlayerStore((s) => s.recentlyPlayed);
  const followed = useLibraryStore((s) => s.followedArtists);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setStatus('loading');
    Promise.allSettled([api.getHome(8), api.getRecommendations(12)]).then(([home, picks]) => {
      if (!active) return;
      if (home.status === 'fulfilled') setShelves(home.value.shelves || []);
      if (picks.status === 'fulfilled') setTracks(picks.value);
      setStatus(
        home.status === 'rejected' || picks.status === 'rejected' ? 'partial' : 'ready'
      );
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  const feature = recent[0] || tracks[0];
  const hour = new Date().getHours();

  function open(item: ShelfItem) {
    if (item.type === 'song' && item.videoId) {
      play({ ...item, videoId: item.videoId, artists: item.artists || [] });
    } else {
      navigate(
        '/' +
          (item.type === 'song' ? 'search' : item.type) +
          '/' +
          encodeURIComponent(item.type === 'song' ? item.title : item.browseId || item.id)
      );
    }
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="glass-shell p-4 rounded-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-4 items-center">
          <div>
            <span className="caption block mb-1">
              {feature
                ? recent.length
                  ? 'Continue listening'
                  : 'Selected for you'
                : 'The listening room'}
            </span>
            <h2 className="heading text-lg font-bold mb-1 line-clamp-1">
              {feature?.title ||
                'Good ' +
                  (hour < 5 || hour >= 18
                    ? 'evening'
                    : hour < 12
                      ? 'morning'
                      : 'afternoon') +
                  '.'}
            </h2>
            <p className="text-xs text-tertiary mb-3 line-clamp-1">
              {feature
                ? feature.artists.map((a) => a.name).join(', ')
                : 'Find a record. Stay for the whole side.'}
            </p>
            {feature ? (
              <button
                type="button"
                className="btn-primary px-4 py-1.5 text-xs inline-flex items-center"
                onClick={() => play(feature, recent.length ? recent : tracks)}
              >
                <Play size={14} fill="currentColor" className="mr-1.5" /> Play track
              </button>
            ) : (
              <button
                type="button"
                className="btn-ghost px-4 py-1.5 text-xs inline-flex items-center"
                onClick={() => setViewMode('grid')}
              >
                <Search size={14} className="mr-1.5" /> Find music
              </button>
            )}
          </div>
          <div className="hidden sm:block">
            <div className="aspect-square w-[110px] rounded-xl overflow-hidden bg-neutral-900 border border-white/10">
              {feature ? (
                <ArtworkImage item={feature} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-tertiary">
                  <Radio className="w-8 h-8" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-pill p-1 w-fit max-w-full">
        <nav aria-label="Browse music" className="flex flex-wrap gap-1">
          {(
            [
              ['Discover', '/discover', Sparkles],
              ['Liked songs', '/library/liked', Heart],
              ['Your playlists', '/library', ListMusic],
              ['Listening history', '/history', History],
            ] as const
          ).map(([name, path, Icon]) => (
            <a
              key={path}
              href={path}
              className="browse-link px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-medium transition-colors"
            >
              <Icon size={12} aria-hidden="true" />
              <span>{name}</span>
            </a>
          ))}
        </nav>
      </div>

      {recent.length > 0 && (
        <section>
          <h3 className="heading text-sm font-semibold mb-2.5">Recently played</h3>
          <div className="grid grid-cols-3 gap-2.5">
            {recent.slice(0, 6).map((t) => (
              <button
                key={t.videoId}
                type="button"
                onClick={() => play(t, recent)}
                className="group flex flex-col items-center w-full text-left"
              >
                <ArtworkImage item={t} alt="" className="aspect-square w-full rounded-lg mb-1.5" />
                <strong className="text-xs font-medium text-white truncate w-full">
                  {t.title}
                </strong>
                <small className="text-[10px] text-tertiary truncate w-full">
                  {t.artists.map((a) => a.name).join(', ')}
                </small>
              </button>
            ))}
          </div>
        </section>
      )}

      {tracks.length > 0 && (
        <section>
          <h3 className="heading text-sm font-semibold mb-2.5">On your frequency</h3>
          <div className="flex flex-col gap-1">
            {tracks.slice(0, 6).map((t, i) => (
              <TrackRow key={t.videoId} track={t} index={i} contextQueue={tracks} />
            ))}
          </div>
        </section>
      )}

      {shelves
        .filter((s) => s.contents?.length)
        .map((s, i) => (
          <section key={s.title + i}>
            <h3 className="heading text-sm font-semibold mb-2.5">{s.title}</h3>
            <div className="grid grid-cols-3 gap-2.5">
              {s.contents.slice(0, 6).map((t, j) => (
                <button
                  key={t.id + j}
                  type="button"
                  onClick={() => open(t)}
                  className="group flex flex-col items-start w-full text-left"
                >
                  <ArtworkImage item={t} alt="" className="aspect-square w-full rounded-lg mb-1.5" />
                  <strong className="text-xs font-medium text-white truncate w-full">
                    {t.title}
                  </strong>
                  <small className="text-[10px] text-tertiary truncate w-full">
                    {t.subtitle || t.type}
                  </small>
                </button>
              ))}
            </div>
          </section>
        ))}

      {followed.length > 0 && (
        <section>
          <h3 className="heading text-sm font-semibold mb-2.5">Artists you follow</h3>
          <div className="grid grid-cols-3 gap-2.5">
            {followed.map((a) => (
              <a
                key={a.id}
                href={
                  a.id.startsWith('UC')
                    ? '/artist/' + a.id
                    : '/search/' + encodeURIComponent(a.name)
                }
                className="group flex flex-col items-center w-full"
              >
                <ArtworkImage
                  src={a.thumbnail}
                  alt=""
                  className="aspect-square w-full rounded-full mb-1.5"
                />
                <strong className="text-xs font-medium text-white truncate text-center w-full">
                  {a.name}
                </strong>
              </a>
            ))}
          </div>
        </section>
      )}

      {(status !== 'ready' || (!shelves.length && !tracks.length)) && (
        <div role="status" className="glass-interactive p-5 rounded-xl text-center text-xs">
          {status === 'loading' ? (
            'Tuning in to the catalogue…'
          ) : (
            <>
              {status === 'partial'
                ? 'Some catalogue sections could not be loaded.'
                : 'No recommendations are available yet.'}{' '}
              <button
                type="button"
                onClick={() => retry((n) => n + 1)}
                className="btn-primary mt-3 px-4 py-1.5 text-xs"
              >
                Reload catalogue
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const TracksTabContent: React.FC<{ tab: string }> = ({ tab }) => {
  const navigate = useNavigate();
  const { playlists } = useLibraryStore();
  const { isInitialized, initialize } = useOfflineStore();
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);

  useEffect(() => {
    if (!isInitialized) initialize();
  }, [isInitialized, initialize]);

  if (tab === 'queue') {
    if (queue.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-tertiary gap-2 py-8">
          <ListMusic className="w-10 h-10 text-neutral-600" />
          <p className="font-medium text-sm text-secondary">Queue is empty</p>
          <p className="text-xs">Add songs from search, albums, or discover!</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-1 pb-2 border-b border-white/10 mb-2">
          <h3 className="text-xs font-semibold text-tertiary uppercase tracking-wider">
            {queue.length} tracks
          </h3>
        </div>
        <div className="flex flex-col gap-1">
          {queue.map((track, idx) => (
            <TrackRow
              key={track.videoId || idx}
              track={track}
              index={idx}
              contextQueue={queue}
              onRemoveFromPlaylist={track => removeFromQueue(idx)}
            />
          ))}
        </div>
      </div>
    );
  }

  if (tab === 'playlists') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="heading text-sm font-semibold">Your Playlists</h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigate('/library')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium transition-all"
            >
              <DownloadCloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>Import</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/library')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-black font-medium text-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => navigate(`/playlist/${pl.id}`)}
              className="group relative flex flex-col gap-2 p-2 rounded-xl transition-all cursor-pointer hover:bg-white/5"
            >
              <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-neutral-900">
                {pl.thumbnail_url ? (
                  <img
                    src={pl.thumbnail_url}
                    alt={pl.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-600">
                    <ListMusic className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <h4 className="font-semibold text-xs text-white truncate">{pl.title}</h4>
                <p className="text-[11px] text-tertiary truncate">
                  {pl.track_count} {pl.track_count === 1 ? 'track' : 'tracks'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="heading text-sm font-semibold mb-2">History</h3>
      <p className="text-tertiary text-xs">
        Open{' '}
        <a href="/history" className="text-white underline">
          Listening History
        </a>{' '}
        for full playback logs.
      </p>
    </div>
  );
};

const LyricsTabContent: React.FC<{ tab: string }> = ({ tab }) => {
  const { toggleOpen: toggleEqualizer } = useAudioDSPStore();

  if (tab === 'lyrics') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="heading text-sm font-semibold">Synced Lyrics</h3>
          <span className="caption text-[11px] text-tertiary">Click any line to seek</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-center py-6">
          <p className="text-tertiary text-xs">
            Open Full-Screen Player for live word-synced lyrics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <h3 className="heading text-sm font-semibold mb-1">10-Band Parametric EQ</h3>
        <p className="text-tertiary text-xs mb-4">
          Configure 10-band DSP, preamp, and spatial audio curves.
        </p>
      </div>
      <button
        type="button"
        onClick={() => toggleEqualizer?.()}
        className="btn-primary w-full py-2 text-xs font-semibold"
      >
        Open Full DSP Equalizer
      </button>
    </div>
  );
};

export default FloatingModuleDock;