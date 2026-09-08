import React from 'react';
import { SearchResults } from '@/types/music';

export type SearchFilterType = 'all' | 'songs' | 'albums' | 'artists' | 'playlists';

interface SearchFiltersProps {
  activeFilter: SearchFilterType;
  onFilterChange: (filter: SearchFilterType) => void;
  results?: SearchResults | null;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  activeFilter,
  onFilterChange,
  results,
}) => {
  const filterTabs: { id: SearchFilterType; label: string; count?: number }[] = [
    { id: 'all', label: 'All' },
    { id: 'songs', label: 'Songs', count: results?.songs?.length },
    { id: 'albums', label: 'Albums', count: results?.albums?.length },
    { id: 'artists', label: 'Artists', count: results?.artists?.length },
    { id: 'playlists', label: 'Playlists', count: results?.playlists?.length },
  ];

  return (
    <div
      role="tablist"
      aria-label="Filter search categories"
      className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none"
    >
      {filterTabs.map((tab) => {
        const isActive = activeFilter === tab.id;
        const hasCount = tab.count !== undefined && tab.count > 0;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onFilterChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
              isActive
                ? 'bg-white text-black shadow-md font-bold'
                : 'bg-white/[0.05] hover:bg-white/[0.10] text-neutral-400 hover:text-white border border-white/[0.08]'
            }`}
          >
            <span>{tab.label}</span>
            {hasCount && tab.id !== 'all' && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                  isActive ? 'bg-black/15 text-black font-mono' : 'bg-white/10 text-neutral-400 font-mono'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
