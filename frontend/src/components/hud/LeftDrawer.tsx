import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useUIStore } from '@/stores/useUIStore';
import {
  Disc3,
  Compass,
  Search,
  Library,
  Heart,
  History,
  Download,
  Settings,
  Music2,
  Users,
  FolderOpen,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    title: 'Listen',
    items: [
      { label: 'Listening Room', path: '/', icon: Disc3 },
      { label: 'Discover', path: '/discover', icon: Compass },
      { label: 'Search', path: '/search', icon: Search },
    ],
  },
  {
    title: 'Collection',
    items: [
      { label: 'Library', path: '/library', icon: Library },
      { label: 'Liked Songs', path: '/library/liked', icon: Heart },
      { label: 'History', path: '/history', icon: History },
      { label: 'Offline', path: '/library/downloaded', icon: Download },
    ],
  },
] as const;

interface DrawerContentProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const DrawerContent: React.FC<DrawerContentProps> = ({ isOpen, onClose, isMobile }) => {
  const { leftDockCollapsed, toggleLeftDock, setLeftDockCollapsed } = useUIStore();

  const navItems = [
    ...NAV_GROUPS.flatMap((g) =>
      g.items.map((item) => ({
        ...item,
        group: g.title,
      }))
    ),
    { label: 'Settings', path: '/settings', icon: Settings, group: 'Settings' },
  ];

  return (
    <AnimatePresence>
      {isMobile && isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <motion.aside
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: isOpen ? 0 : leftDockCollapsed ? -72 : -280, opacity: isOpen ? 1 : 0 }}
        exit={{ x: leftDockCollapsed ? -72 : -280, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={`drawer-panel fixed top-14 bottom-14 left-4 z-40 flex flex-col overflow-hidden transition-all duration-500 ease-out pointer-events-none ${
          leftDockCollapsed ? 'w-[72px]' : 'w-[280px]'
        }`}
        aria-label="Main navigation"
        role="navigation"
      >
        <div className="flex flex-col h-full p-3 pointer-events-auto">
          {/* Brand / Collapsed Brand */}
          <NavLink
            className="glass-pill px-4 py-3 flex items-center gap-3 w-full justify-start"
            to="/"
            aria-label="AAPESH home"
            onClick={isMobile ? onClose : undefined}
          >
            <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, rgb(var(--accent-primary-rgb)) 0%, rgb(var(--accent-secondary-rgb)) 100%)',
              boxShadow: '0 4px 16px rgba(var(--accent-primary-rgb), 0.25)',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </span>
            {!leftDockCollapsed && !isMobile && (
              <span className="font-bold text-lg text-white tracking-tight">AAPESH</span>
            )}
          </NavLink>

          {/* Collapsed Mode Indicator */}
          {leftDockCollapsed && !isMobile && (
            <div className="text-center text-[10px] font-semibold tracking-wider uppercase text-tertiary mt-2 mb-4">
              MENU
            </div>
          )}

          <div className="flex-1 overflow-y-auto pt-4 space-y-6">
            {NAV_GROUPS.map((group) => (
              <nav key={group.title} aria-label={group.title} className="space-y-1.5">
                {!leftDockCollapsed && !isMobile && (
                  <h2 className="px-3 text-[10px] font-semibold tracking-wider uppercase text-tertiary mb-1.5">
                    {group.title}
                  </h2>
                )}
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/' || item.path === '/library'}
                    title={leftDockCollapsed || isMobile ? item.label : undefined}
                    onClick={isMobile ? onClose : undefined}
                    className={({ isActive }: { isActive: boolean; isPending?: boolean; isTransitioning?: boolean }) => {
                      const base = 'glass-interactive w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ease-out';
                      const justify = !leftDockCollapsed && !isMobile ? 'justify-start' : 'justify-center';
                      const activeStyles = isActive
                        ? 'bg-white/8 border-white/15 text-white'
                        : 'hover:bg-white/5';
                      return `${base} ${activeStyles} ${justify}`;
                    }}
                    style={({ isActive }: { isActive: boolean; isPending?: boolean; isTransitioning?: boolean }) => ({
                      color: isActive ? `rgb(var(--accent-primary-rgb))` : 'rgba(255,255,255,0.7)',
                      transform: isActive ? 'scale(1.02)' : 'scale(1)',
                    })}
                  >
                    <item.icon aria-hidden className="w-5 h-5 shrink-0" />
                    {!leftDockCollapsed && !isMobile && (
                      <span className="font-medium text-sm truncate text-white">
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                ))}
              </nav>
            ))}
          </div>

          {/* Settings */}
          <NavLink
            to="/settings"
            className="glass-interactive w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ease-out hover:bg-white/5"
            title={leftDockCollapsed || isMobile ? 'Settings' : undefined}
            onClick={isMobile ? onClose : undefined}
          >
            <Settings className="w-5 h-5 text-tertiary transition-colors" />
            {!leftDockCollapsed && !isMobile && (
              <span className="font-medium text-sm text-white">Settings</span>
            )}
          </NavLink>

          {/* Collapse/Expand Toggle */}
          <button
            className="glass-pill w-full mt-auto flex items-center justify-center py-2 pointer-events-auto"
            aria-label={leftDockCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            onClick={isMobile ? () => { toggleLeftDock(); onClose(); } : toggleLeftDock}
          >
            <motion.div
              animate={{ rotate: leftDockCollapsed ? 180 : 0 }}
              transition={{ duration: 300, ease: [0.34, 1.4, 0.64, 1] }}
            >
              <ChevronRight className="w-5 h-5 text-tertiary" />
            </motion.div>
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};

export const LeftDrawer: React.FC = () => {
  const { leftDockOpen, setLeftDockOpen, leftDockCollapsed } = useUIStore();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLeftDockOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setLeftDockOpen]);

  const isOpen = isMobile ? useUIStore.getState().leftDockOpen : true;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {isMobile && (
            <div
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
              onClick={() => useUIStore.getState().setLeftDockOpen(false)}
              aria-hidden="true"
            />
          )}
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`drawer-panel fixed top-14 bottom-14 left-4 z-40 flex flex-col overflow-hidden transition-all duration-500 ease-out pointer-events-none w-[280px]`}
            aria-label="Main navigation"
            role="navigation"
          >
            <div className="flex flex-col h-full p-3 pointer-events-auto">
              <NavLink
                className="glass-pill px-4 py-3 flex items-center gap-3 w-full justify-start"
                to="/"
                aria-label="AAPESH home"
              >
                <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{
                  background: 'linear-gradient(135deg, rgb(var(--accent-primary-rgb)) 0%, rgb(var(--accent-secondary-rgb)) 100%)',
                  boxShadow: '0 4px 16px rgba(var(--accent-primary-rgb), 0.25)',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </span>
                <span className="font-bold text-lg text-white tracking-tight">AAPESH</span>
              </NavLink>

              <div className="flex-1 overflow-y-auto pt-4 space-y-6">
                {[
                  {
                    title: 'Listen',
                    items: [
                      { label: 'Listening Room', path: '/', icon: React.createElement(() => <Disc3 className="w-5 h-5" />) },
                      { label: 'Discover', path: '/discover', icon: React.createElement(() => <Compass className="w-5 h-5" />) },
                      { label: 'Search', path: '/search', icon: React.createElement(() => <Search className="w-5 h-5" />) },
                    ],
                  },
                  {
                    title: 'Collection',
                    items: [
                      { label: 'Library', path: '/library', icon: React.createElement(() => <Library className="w-5 h-5" />) },
                      { label: 'Liked Songs', path: '/library/liked', icon: React.createElement(() => <Heart className="w-5 h-5" />) },
                      { label: 'History', path: '/history', icon: React.createElement(() => <History className="w-5 h-5" />) },
                      { label: 'Offline', path: '/library/downloaded', icon: React.createElement(() => <Download className="w-5 h-5" />) },
                    ],
                  },
                ].map((group) => (
                  <nav key={group.title} aria-label={group.title} className="space-y-1.5">
                    <h2 className="px-3 text-[10px] font-semibold tracking-wider uppercase text-tertiary mb-1.5">
                      {group.title}
                    </h2>
                    {group.items.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/' || item.path === '/library'}
                        className={({ isActive }: { isActive: boolean; isPending?: boolean; isTransitioning?: boolean }) => {
                          const base = 'glass-interactive w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ease-out';
                          const activeStyles = isActive
                            ? 'bg-white/8 border-white/15 text-white'
                            : 'hover:bg-white/5';
                          return `${base} ${activeStyles} justify-start`;
                        }}
                        style={({ isActive }: { isActive: boolean; isPending?: boolean; isTransitioning?: boolean }) => ({
                          color: isActive ? `rgb(var(--accent-primary-rgb))` : 'rgba(255,255,255,0.7)',
                          transform: isActive ? 'scale(1.02)' : 'scale(1)',
                        })}
                      >
                        {item.icon}
                        <span className="font-medium text-sm truncate text-white">
                          {item.label}
                        </span>
                      </NavLink>
                    ))}
                  </nav>
                ))}
              </div>

              <NavLink
                to="/settings"
                className="glass-interactive w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ease-out hover:bg-white/5"
              >
                <Settings className="w-5 h-5 text-tertiary transition-colors" />
                <span className="font-medium text-sm text-white">Settings</span>
              </NavLink>

              <button
                onClick={() => useUIStore.getState().toggleLeftDock()}
                className="glass-pill w-full mt-auto flex items-center justify-center py-2 pointer-events-auto"
                aria-label="Collapse navigation"
              >
                <ChevronRight className="w-5 h-5 text-tertiary" />
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default LeftDrawer;