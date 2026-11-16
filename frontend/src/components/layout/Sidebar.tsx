import { NavLink } from 'react-router-dom';
import {
  Disc3,
  Compass,
  Search,
  Library,
  Heart,
  History,
  Download,
  Settings,
} from 'lucide-react';
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
export function Sidebar() {
  return (
    <aside className="edition-sidebar" aria-label="Main navigation">
      <NavLink className="edition-brand" to="/" aria-label="AAPESH home">
        <Disc3 /> <b>AAPESH</b>
      </NavLink>
      {groups.map((g) => (
        <nav key={g.title} aria-label={g.title}>
          <h2>{g.title}</h2>
          {g.items.map(([label, path, Icon]) => (
            <NavLink
              end={path === '/' || path === '/library'}
              to={path}
              key={path}
              title={label}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      ))}
      <NavLink className="edition-settings" to="/settings">
        <Settings size={18} />
        <span>Settings</span>
      </NavLink>
    </aside>
  );
}
