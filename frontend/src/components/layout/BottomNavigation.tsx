import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, Search, Library } from 'lucide-react';

export const BottomNavigation: React.FC = () => {
  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Discover', path: '/discover', icon: Compass },
    { name: 'Search', path: '/search', icon: Search },
    { name: 'Library', path: '/library', icon: Library },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-floating border-t border-white/[0.08] flex items-center justify-around px-2 pt-2" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 ${
                isActive ? 'text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] tracking-wide">{item.name}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
