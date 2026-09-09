import React, { useState } from 'react';
import { Minimize2, Maximize2, X, Film } from 'lucide-react';
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
    isPlayerExpanded,
    fullscreenTab,
  } = usePlayerStore();

  const [isMinimized, setIsMinimized] = useState(false);

  const isFullscreenVideo = Boolean(currentTrack && isPlayerExpanded && fullscreenTab === 'video');
  const isDockVisible = Boolean(currentTrack && isVideoDockOpen && !isPlayerExpanded);
  const isVisible = isFullscreenVideo || isDockVisible;

  let containerClasses = 'fixed -left-[9999px] -top-[9999px] w-[360px] h-[225px] opacity-[0.001] pointer-events-none -z-50 overflow-hidden';

  if (isFullscreenVideo) {
    containerClasses = 'fixed inset-x-4 top-20 bottom-24 sm:inset-x-12 sm:top-24 sm:bottom-28 md:inset-x-20 lg:inset-x-36 z-40 rounded-[28px] overflow-hidden bg-black border border-white/15 shadow-2xl flex flex-col transition-all duration-300';
  } else if (isDockVisible) {
    containerClasses = `fixed bottom-24 right-4 sm:right-6 z-30 rounded-2xl overflow-hidden glass-elevated border border-white/15 shadow-2xl transition-all duration-300 flex flex-col ${
      isMinimized
        ? 'w-[200px] h-[120px]'
        : 'w-[280px] sm:w-[360px] md:w-[420px] aspect-[16/10]'
    }`;
  }

  return (
    <div
      id="aurora-youtube-container"
      aria-hidden={!isVisible}
      className={containerClasses}
    >
      {/* Video Window Header - rendered only in floating dock mode */}
      {isDockVisible && (
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

      {/* Official YouTube Player Viewport (Single canonical instance) */}
      <div className={`relative flex-1 w-full ${isVisible ? 'bg-black' : ''}`}>
        <div id="aurora-youtube-player" className="w-full h-full" />
      </div>
    </div>
  );
};
