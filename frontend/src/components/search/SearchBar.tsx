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
          className="w-full pl-12 pr-24 py-3.5 rounded-2xl bg-[#0e1017]/85 hover:bg-[#141722]/90 focus:bg-[#161a26] backdrop-blur-2xl border border-white/[0.08] hover:border-white/[0.14] focus:border-white/25 text-white placeholder-neutral-500 text-sm sm:text-base focus:outline-none shadow-[0_8px_24px_rgba(0,0,0,0.5)] focus:shadow-[0_16px_40px_rgba(0,0,0,0.75)] transition-all duration-200"
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
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <span
            className="hidden sm:flex items-center text-[10px] font-mono text-neutral-400 bg-white/[0.06] px-2 py-0.5 rounded-md border border-white/[0.08] select-none pointer-events-none"
            title="Press / to focus search"
          >
            /
          </span>
        </div>
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';
