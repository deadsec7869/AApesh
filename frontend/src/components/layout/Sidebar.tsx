import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Compass,
  Library,
  Plus,
  Settings,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { Magnet } from '@/components/react-bits';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();

  const mainNav = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Explore', path: '/search', icon: Compass },
    { name: 'Library', path: '/library', icon: Library },
  ];

  return (
    <aside
      aria-label="Main Navigation"
      className="fixed left-3 md:left-5 top-1/2 -translate-y-1/2 w-[56px] py-4 px-1.5 rounded-full bg-[#14151a]/75 backdrop-blur-2xl border border-white/[0.09] shadow-[0_16px_40px_rgba(0,0,0,0.65)] flex flex-col items-center justify-between gap-4 z-40 select-none hidden md:flex"
    >
      {/* Primary Navigation Icons Stack */}
      <nav className="flex flex-col items-center gap-3 w-full" aria-label="Primary Nav">
        {mainNav.map((item) => {
          const Icon = item.icon;
          return (
            <Magnet key={item.name} padding={20} magnetStrength={0.25}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                title={item.name}
                aria-label={item.name}
                className={({ isActive }) =>
                  `group relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black ${
                    isActive
                      ? 'bg-white/20 text-white shadow-sm ring-1 ring-white/30'
                      : 'text-neutral-400 hover:text-white hover:bg-white/[0.08]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                        isActive ? 'text-white' : 'text-neutral-400 group-hover:text-white'
                      }`}
                    />
                    {/* Tooltip on hover */}
                    <span className="absolute left-full ml-3 px-2.5 py-1 rounded-xl bg-charcoal-900/95 backdrop-blur-md border border-white/10 text-white text-xs font-medium tracking-wide opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
                      {item.name}
                    </span>
                  </>
                )}
              </NavLink>
            </Magnet>
          );
        })}

        {/* Plus / Create / Search Action */}
        <Magnet padding={20} magnetStrength={0.25}>
          <button
            onClick={() => navigate('/search')}
            title="Search / Add"
            aria-label="Search or Add"
            className="group relative w-10 h-10 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
          >
            <Plus className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
            <span className="absolute left-full ml-3 px-2.5 py-1 rounded-xl bg-charcoal-900/95 backdrop-blur-md border border-white/10 text-white text-xs font-medium tracking-wide opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
              Create / Explore
            </span>
          </button>
        </Magnet>
      </nav>

      {/* Settings Action */}
      <div className="flex flex-col items-center pt-2 border-t border-white/[0.08] w-full">
        <Magnet padding={20} magnetStrength={0.25}>
          <NavLink
            to="/settings"
            title="Settings"
            aria-label="Settings"
            className={({ isActive }) =>
              `group relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black ${
                isActive
                  ? 'bg-white/20 text-white shadow-sm ring-1 ring-white/30'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.08]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Settings
                  className={`w-4 h-4 transition-transform duration-200 group-hover:scale-105 ${
                    isActive ? 'text-white' : 'text-neutral-400 group-hover:text-white'
                  }`}
                />
                <span className="absolute left-full ml-3 px-2.5 py-1 rounded-xl bg-charcoal-900/95 backdrop-blur-md border border-white/10 text-white text-xs font-medium tracking-wide opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
                  Settings
                </span>
              </>
            )}
          </NavLink>
        </Magnet>
      </div>
    </aside>
  );
};
