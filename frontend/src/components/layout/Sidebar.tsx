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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';

const groups = [
  {
    title: 'Listen',
    items: [
      ['Listening room', '/', Disc3],
      ['Discover', '/discover', Compass],
      ['Search', '/search', Search],
    ],
  },
  {
    title: 'Collection',
    items: [
      ['Library', '/library', Library],
      ['Liked songs', '/library/liked', Heart],
      ['History', '/history', History],
      ['Offline', '/library/downloaded', Download],
    ],
  },
] as const;

interface NavLinkWrapperProps {
  to: string;
  end?: boolean;
  title?: string;
  children: React.ReactNode | ((props: { isActive: boolean; isPending?: boolean; isTransitioning?: boolean }) => React.ReactNode);
  leftDockCollapsed?: boolean;
}

const NavLinkWrapper: React.FC<{
  to: string;
  end?: boolean;
  title?: string;
  children: React.ReactNode | ((props: { isActive: boolean; isPending?: boolean; isTransitioning?: boolean }) => React.ReactNode);
  leftDockCollapsed?: boolean;
}> = ({ to, end, title, children, leftDockCollapsed }) => {
  return (
    <NavLink
      to={to}
      end={end}
      title={title}
      className={({ isActive }: { isActive: boolean; isPending?: boolean; isTransitioning?: boolean }) => {
        const base = 'glass-interactive w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ease-out';
        const justify = !leftDockCollapsed ? 'justify-start' : 'justify-center';
        return `${base} ${isActive ? 'bg-white/8 border-white/15 text-white' : 'hover:bg-white/5'} ${justify}`;
      }}
      style={({ isActive }: { isActive: boolean; isPending?: boolean; isTransitioning?: boolean }) => ({
        color: isActive ? `rgb(var(--accent-primary-rgb))` : 'rgba(255,255,255,0.7)',
        transform: isActive ? 'scale(1.02)' : 'scale(1)',
      })}
    >
      {children}
    </NavLink>
  );
};

export function Sidebar() {
  const { leftDockCollapsed, toggleLeftDock } = useUIStore();

  return (
    <aside
      className={`nav-island fixed top-14 bottom-14 left-4 z-40 hidden md:flex flex-col overflow-hidden overflow-x-hidden transition-all duration-500 ease-out ${
        leftDockCollapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
      aria-label="Main navigation"
    >
      <div className="flex flex-col h-full p-3">
        {/* Brand */}
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
          {!leftDockCollapsed && (
            <span className="font-bold text-lg text-white tracking-tight">AAPESH</span>
          )}
        </NavLink>

        <div className="flex-1 overflow-y-auto pt-4 space-y-6">
          {groups.map((g) => (
            <nav key={g.title} aria-label={g.title} className="space-y-1.5">
              {!leftDockCollapsed && (
                <h2 className="px-3 text-[10px] font-semibold tracking-wider uppercase text-tertiary mb-1.5">
                  {g.title}
                </h2>
              )}
              {g.items.map(([label, path, Icon]) => (
                <NavLinkWrapper
                  key={path}
                  to={path}
                  end={path === '/' || path === '/library'}
                  title={leftDockCollapsed ? label : undefined}
                  leftDockCollapsed={leftDockCollapsed}
                >
                  <Icon aria-hidden className="w-5 h-5 shrink-0" />
                  {!leftDockCollapsed && (
                    <span className="font-medium text-sm truncate text-white">
                      {label}
                    </span>
                  )}
                </NavLinkWrapper>
              ))}
            </nav>
          ))}
        </div>

        {/* Settings */}
        <NavLink
          to="/settings"
          className="glass-interactive w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ease-out hover:bg-white/5"
          title={leftDockCollapsed ? 'Settings' : undefined}
        >
          <Settings className="w-5 h-5 text-tertiary transition-colors" />
          {!leftDockCollapsed && (
            <span className="font-medium text-sm text-white">Settings</span>
          )}
        </NavLink>

        {/* Collapse/Expand Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleLeftDock}
          className="glass-pill w-full mt-auto flex items-center justify-center py-2"
          aria-label={leftDockCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          <motion.div
            animate={{ rotate: leftDockCollapsed ? 180 : 0 }}
            transition={{ duration: 300, ease: [0.34, 1.4, 0.64, 1] }}
          >
            <ChevronLeft className="w-5 h-5 text-tertiary" />
          </motion.div>
        </motion.button>
      </div>
    </aside>
  );
}