import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Search,
  Compass,
  Radio,
  Library,
  Heart,
  History,
  Settings,
  Music,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();

  const mainNav = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Explore', path: '/search', icon: Compass },
    { name: 'Radio', path: '/discover', icon: Radio },
    { name: 'Library', path: '/library', icon: Library },
    { name: 'Favorites', path: '/library/liked', icon: Heart },
    { name: 'History', path: '/history', icon: History },
  ];

  return (
    <aside
      aria-label="Main Navigation"
      className="w-[68px] h-full rounded-[26px] glass-nav border border-white/[0.08] shadow-2xl flex flex-col justify-between py-5 px-2 items-center shrink-0 hidden md:flex z-30 select-none"
    >
      {/* Top: Brand Logo / Wordmark */}
      <div className="flex flex-col items-center gap-6 w-full">
        <button
          onClick={() => navigate('/')}
          className="group relative flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/[0.06] transition-all duration-200"
          title="AAPESH"
          aria-label="AAPESH Home"
        >
          <div className="w-10 h-10 rounded-2xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white shadow-sm group-hover:scale-105 group-hover:bg-white/[0.12] transition-all duration-200">
            <Music className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-bold tracking-widest text-neutral-300 uppercase mt-1.5 group-hover:text-white transition-colors">
            AAPESH
          </span>
        </button>

        {/* Primary Navigation Icons Stack */}
        <nav className="flex flex-col items-center gap-3 w-full" aria-label="Primary Nav">
          {mainNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/'}
                title={item.name}
                className={({ isActive }) =>
                  `group relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ease-out-expo ${
                    isActive
                      ? 'bg-white text-black font-semibold shadow-md'
                      : 'text-neutral-400 hover:text-white hover:bg-white/[0.08]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                        isActive ? 'text-black' : 'text-neutral-400 group-hover:text-white'
                      }`}
                    />
                    {/* Tooltip on hover */}
                    <span className="absolute left-full ml-3 px-2.5 py-1 rounded-xl bg-charcoal-900/90 backdrop-blur-md border border-white/10 text-white text-xs font-medium tracking-wide opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
                      {item.name}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Guest Mode & Settings */}
      <div className="flex flex-col items-center gap-3 w-full pt-4 border-t border-white/[0.06]">
        {/* Guest Mode Indicator */}
        <button
          onClick={() => navigate('/settings')}
          className="group relative w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-white/[0.06] transition-colors"
          title="Guest Mode • No Account Required"
          aria-label="Guest Mode"
        >
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
          </div>
          {/* Tooltip */}
          <span className="absolute left-full ml-3 px-2.5 py-1 rounded-xl bg-charcoal-900/90 backdrop-blur-md border border-white/10 text-white text-xs font-medium tracking-wide opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
            Guest Mode • Free
          </span>
        </button>

        {/* Settings NavLink */}
        <NavLink
          to="/settings"
          title="Settings"
          aria-label="Settings"
          className={({ isActive }) =>
            `group relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
              isActive
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.08]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Settings
                className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? 'text-black' : 'text-neutral-400 group-hover:text-white'
                }`}
              />
              <span className="absolute left-full ml-3 px-2.5 py-1 rounded-xl bg-charcoal-900/90 backdrop-blur-md border border-white/10 text-white text-xs font-medium tracking-wide opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
                Settings
              </span>
            </>
          )}
        </NavLink>
      </div>
    </aside>
  );
};
