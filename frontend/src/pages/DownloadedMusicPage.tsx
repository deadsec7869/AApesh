import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HardDrive, ArrowLeft, Play, Trash2, ShieldCheck, Music } from 'lucide-react';
import { useOfflineStore } from '@/stores/useOfflineStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { TrackRow } from '@/components/music/TrackRow';
import { SpotlightCard } from '@/components/react-bits';

export const DownloadedMusicPage: React.FC = () => {
  const navigate = useNavigate();
  const { downloadedTracks, storageUsedBytes, clearAllOffline, initialize, isInitialized } =
    useOfflineStore();
  const { playTrack } = usePlayerStore();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  const handlePlayAll = () => {
    if (downloadedTracks.length > 0) {
      playTrack(downloadedTracks[0], downloadedTracks);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to remove all offline downloaded tracks?')) {
      await clearAllOffline();
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return mb < 1000 ? `${mb.toFixed(1)} MB` : `${(mb / 1024).toFixed(2)} GB`;
  };

  return (
    <div className="p-6 md:p-10 flex flex-col gap-8 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* Top Navigation Back Button */}
      <button
        onClick={() => navigate('/library')}
        className="self-start flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-neutral-300 hover:text-white text-xs font-semibold transition-all"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Library</span>
      </button>

      {/* Hero Banner */}
      <SpotlightCard
        spotlightColor="rgba(6, 182, 212, 0.2)"
        spotlightRadius={360}
        className="p-8 rounded-3xl glass-dock border border-cyan-500/20 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-xl shrink-0">
            <HardDrive className="w-12 h-12 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Offline Workstation Storage</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              Saved on this device
            </h1>
            <p className="text-sm text-neutral-400 font-medium">
              {downloadedTracks.length} {downloadedTracks.length === 1 ? 'song' : 'songs'} cached •{' '}
              {formatSize(storageUsedBytes)} local storage used
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {downloadedTracks.length > 0 && (
            <>
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-sm shadow-lg shadow-cyan-950/30 hover:scale-[1.03] active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-current translate-x-0.5" />
                <span>Play All</span>
              </button>

              <button
                onClick={handleClear}
                title="Clear all downloads"
                className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/[0.06] hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-neutral-400 hover:text-rose-400 text-xs font-semibold transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear Offline Cache</span>
              </button>
            </>
          )}
        </div>
      </SpotlightCard>

      {/* Tracks List */}
      {downloadedTracks.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-4 text-neutral-400">
          <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-neutral-500">
            <Music className="w-8 h-8" />
          </div>
          <p className="text-base font-semibold text-neutral-200">No saved tracks on this device</p>
          <p className="text-xs text-neutral-500 max-w-sm">
            Save tracks from their menus to browse their details offline. YouTube audio needs an internet connection.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {downloadedTracks.map((track, idx) => (
            <TrackRow
              key={track.videoId}
              track={track}
              index={idx}
              contextQueue={downloadedTracks}
            />
          ))}
        </div>
      )}
    </div>
  );
};
