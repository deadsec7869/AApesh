import React, { useState } from 'react';
import { WifiOff, HardDrive } from 'lucide-react';
import { useOfflineStore } from '@/stores/useOfflineStore';

export const OfflineStatusBadge: React.FC = () => {
  const { isOffline, downloadedTracks, storageUsedBytes } = useOfflineStore();
  const [showTooltip, setShowTooltip] = useState(false);

  if (!isOffline) {
    return null;
  }

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return mb < 1000 ? `${mb.toFixed(1)} MB` : `${(mb / 1024).toFixed(2)} GB`;
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={() => setShowTooltip((prev) => !prev)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label="Offline Mode Indicator"
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide backdrop-blur-md transition-all hover:bg-amber-500/25 shadow-lg shadow-amber-950/20 animate-pulse"
      >
        <WifiOff className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden sm:inline">Offline Mode</span>
        <span className="sm:hidden">Offline</span>
      </button>

      {showTooltip && (
        <div
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-3 rounded-2xl glass-dock border border-white/10 shadow-2xl bg-neutral-950/95 backdrop-blur-xl text-neutral-300 text-xs z-50 flex flex-col gap-2 pointer-events-none"
        >
          <div className="flex items-center gap-2 text-white font-semibold">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>Local Cache Active</span>
          </div>
          <p className="text-neutral-400 leading-relaxed text-[11px]">
            Network disconnected. AAPESH is streaming from your offline storage cache.
          </p>
          <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-neutral-300">
            <span>Available: {downloadedTracks.length} tracks</span>
            <span>{formatSize(storageUsedBytes)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

