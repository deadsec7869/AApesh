import React from 'react';
import { Search, History, Trash2, Zap, Play, ArrowRight } from 'lucide-react';
import { Track } from '@/types/music';
import { ArtworkImage } from '@/components/common/ArtworkImage';

export interface SearchHistoryItem {
  id: string;
  query: string;
  searched_at?: string;
}

interface SearchSuggestionsDropdownProps {
  query: string;
  history: SearchHistoryItem[];
  suggestions: string[];
  suggestedTracks: Track[];
  selectedIndex: number;
  onSelectQuery: (query: string) => void;
  onPlayTrack: (track: Track) => void;
  onDeleteHistoryItem: (e: React.MouseEvent, id: string) => void;
  onClearHistory: () => void;
}

// Utility to highlight matching query substring
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <span>{text}</span>;

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return (
    <span>
      {before}
      <span className="text-white font-bold">{match}</span>
      {after}
    </span>
  );
}

export const SearchSuggestionsDropdown: React.FC<SearchSuggestionsDropdownProps> = ({
  query,
  history,
  suggestions,
  suggestedTracks,
  selectedIndex,
  onSelectQuery,
  onPlayTrack,
  onDeleteHistoryItem,
  onClearHistory,
}) => {
  const isQueryEmpty = !query.trim();

  return (
    <div
      role="listbox"
      aria-label="Search suggestions and history"
      onMouseDown={(e) => e.preventDefault()}
      className="absolute top-full left-0 right-0 mt-2.5 rounded-[22px] bg-[#0c0e14]/95 backdrop-blur-3xl border border-white/[0.12] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.85)] z-50 flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-150 select-none max-h-[75vh] overflow-y-auto"
    >
      {/* ====================================================================
          CASE A: EMPTY QUERY -> RECENT SEARCHES
          ==================================================================== */}
      {isQueryEmpty && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs px-1 border-b border-white/[0.06] pb-2">
            <div className="flex items-center gap-2 font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
              <History className="w-3.5 h-3.5 text-neutral-400" />
              <span>Recent Searches</span>
            </div>
            {history.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="text-[11px] text-neutral-400 hover:text-white transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="py-6 text-center text-xs text-neutral-500">
              No recent searches. Search through millions of tracks on AAPESH.
            </div>
          ) : (
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {history.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => onSelectQuery(item.query)}
                    className={`group flex items-center justify-between gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? 'bg-white/[0.12] text-white shadow-sm'
                        : 'hover:bg-white/[0.06] text-neutral-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <History className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300 shrink-0" />
                      <span className="text-xs font-medium truncate">{item.query}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => onDeleteHistoryItem(e, item.id)}
                      aria-label={`Remove ${item.query} from history`}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-white transition-opacity text-neutral-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          CASE B: ACTIVE QUERY -> LIVE AUTOCOMPLETE & PREVIEWS
          ==================================================================== */}
      {!isQueryEmpty && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-[11px] pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-neutral-300">
              <Zap className="w-3.5 h-3.5 text-neutral-200 fill-current" />
              <span>Live Suggestions</span>
            </div>
            <span className="text-neutral-500 text-[10px] font-mono">
              Press Enter to search
            </span>
          </div>

          {/* Autocomplete Text Suggestions */}
          {suggestions.length > 0 && (
            <div className="flex flex-col gap-1">
              {suggestions.map((text, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={idx}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => onSelectQuery(text)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? 'bg-white/[0.12] text-white shadow-sm'
                        : 'hover:bg-white/[0.06] text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="text-xs font-medium truncate text-neutral-300">
                        <HighlightMatch text={text} query={query} />
                      </span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-neutral-500" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Instant Track Previews */}
          {suggestedTracks.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-white/[0.06]">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                Top Tracks
              </div>
              <div className="flex flex-col gap-1">
                {suggestedTracks.map((track, trackIdx) => {
                  const isSelected = suggestions.length + trackIdx === selectedIndex;
                  return (
                    <div
                      key={track.videoId}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => onPlayTrack(track)}
                      className={`flex items-center justify-between gap-3 p-2 rounded-xl cursor-pointer transition-colors duration-150 ${
                        isSelected
                          ? 'bg-white/[0.12] text-white shadow-sm'
                          : 'hover:bg-white/[0.06] text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-charcoal-800 border border-white/5">
                          <ArtworkImage
                            src={track.thumbnail}
                            alt={track.title}
                            className="w-full h-full object-cover"
                            fallbackIconClassName="w-3.5 h-3.5 text-neutral-500"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-white truncate">
                            <HighlightMatch text={track.title} query={query} />
                          </div>
                          <div className="text-[11px] text-neutral-400 truncate">
                            {track.artists?.map((a) => a.name).join(', ')}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayTrack(track);
                        }}
                        aria-label={`Play ${track.title}`}
                        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all shrink-0"
                      >
                        <Play className="w-3 h-3 fill-current translate-x-0.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {suggestions.length === 0 && suggestedTracks.length === 0 && (
            <div className="py-4 text-center text-xs text-neutral-500">
              No direct suggestions. Press Enter to search catalog.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
