import React, { forwardRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onClear: () => void;
  isLoading?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      value,
      onChange,
      onFocus,
      onKeyDown,
      onClear,
      isLoading = false,
      placeholder = 'Search songs, artists, albums, playlists...',
      autoFocus = false,
    },
    ref
  ) => {
    return (
      <div className="relative flex items-center w-full group">
        {/* Left Search Icon */}
        <Search
          className="absolute left-4.5 w-4.5 h-4.5 text-neutral-400 group-focus-within:text-white transition-colors duration-200 pointer-events-none"
          aria-hidden="true"
        />

        {/* Search Input Field */}
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label="Search music catalog"
          autoComplete="off"
          spellCheck="false"
          dir="auto"
          className="w-full pl-12 pr-28 py-3.5 sm:py-4 rounded-[20px] bg-[#0c0e14]/90 hover:bg-[#12151e]/95 focus:bg-[#141822] backdrop-blur-3xl border border-white/[0.09] hover:border-white/[0.16] focus:border-white/30 text-white placeholder-neutral-500 text-sm sm:text-base focus:outline-none shadow-[0_12px_32px_rgba(0,0,0,0.6)] focus:shadow-[0_20px_48px_rgba(0,0,0,0.85)] transition-all duration-200"
        />

        {/* Right Controls: Spinner / Clear Button / Shortcut Badge */}
        <div className="absolute right-3.5 flex items-center gap-2">
          {isLoading && (
            <Loader2
              className="w-4 h-4 text-neutral-400 animate-spin shrink-0"
              aria-label="Loading search results"
            />
          )}

          {value.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear search input"
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1 select-none pointer-events-none">
            <span
              className="text-[10px] font-mono text-neutral-400 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.08]"
              title="Press / or Ctrl+K to search"
            >
              /
            </span>
          </div>
        </div>
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';
