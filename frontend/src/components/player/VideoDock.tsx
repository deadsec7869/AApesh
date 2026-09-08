import React, { useState } from 'react';
import { Minimize2, Maximize2, X, Film, Volume2 } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';

interface VideoDockProps {
  mode?: 'docked' | 'theater' | 'compact';
  onClose?: () => void;
}

export const VideoDock: React.FC<VideoDockProps> = () => {
  const {
    currentTrack,
    isVideoDockOpen,
    toggleVideoDock,
    togglePlayerExpanded,
  } = usePlayerStore();

  const [isMinimized, setIsMinimized] = useState(false);

  const isVisible = Boolean(currentTrack && isVideoDockOpen);

  return (
    <div
      id="aurora-youtube-container"
      aria-hidden={!isVisible}
      className={
        isVisible
          ? `fixed bottom-24 right-4 sm:right-6 z-30 rounded-2xl overflow-hidden glass-elevated border border-white/15 shadow-2xl transition-all duration-300 flex flex-col ${
              isMinimized
                ? 'w-[200px] h-[120px]'
                : 'w-[280px] sm:w-[360px] md:w-[420px] aspect-[16/10]'
            }`
          : 'fixed bottom-0 right-0 w-px h-px opacity-0 pointer-events-none -z-50 overflow-hidden'
      }
    >
      {/* Video Window Header - only rendered when dock is visibly open */}
      {isVisible && (
        <div className="flex items-center justify-between px-3 py-2 bg-charcoal-900/90 border-b border-white/10 shrink-0 select-none">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <Film className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
            <span className="text-xs font-semibold text-white truncate">
              {currentTrack?.title}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              title={isMinimized ? 'Restore' : 'Minimize'}
            >
              {isMinimized ? (
                <Maximize2 className="w-3 h-3" />
              ) : (
                <Minimize2 className="w-3 h-3" />
              )}
            </button>

            <button
              onClick={togglePlayerExpanded}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Full Screen Theater Mode"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={toggleVideoDock}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close Video Dock"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Official YouTube Player Viewport (Always preserved in DOM for YT API) */}
      <div className={`relative flex-1 w-full ${isVisible ? 'bg-black' : ''}`}>
        <div id="aurora-youtube-player" className="w-full h-full" />
      </div>
    </div>
  );
};
