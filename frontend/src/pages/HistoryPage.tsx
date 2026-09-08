import React, { useEffect, useState } from 'react';
import { History, Trash2, Clock, Play } from 'lucide-react';
import { PlaybackHistoryItem, Track } from '@/types/music';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { TrackRow } from '@/components/music/TrackRow';
import { SkeletonList } from '@/components/common/Skeletons';

export const HistoryPage: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<PlaybackHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playTrack } = usePlayerStore();

  const loadHistory = () => {
    setIsLoading(true);
    fetch('/api/history')
      .then((res) => (res.ok ? res.json() : []))
      .then(setHistoryItems)
      .catch(() => setHistoryItems([]))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClearHistory = async () => {
    if (window.confirm('Clear your listening history?')) {
      await fetch('/api/history', { method: 'DELETE' });
      setHistoryItems([]);
    }
  };

  const tracks: Track[] = historyItems.map((h) => ({
    videoId: h.video_id,
    title: h.title,
    artists: [{ name: h.artist }],
    album: h.album,
    thumbnail: h.thumbnail_url,
    duration: h.duration,
  }));

  return (
    <div className="p-6 md:p-10 flex flex-col gap-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            <History className="w-4 h-4" />
            <span>Activity</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Listening History
          </h1>
        </div>

        {historyItems.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-red-500/10 text-neutral-400 hover:text-red-400 border border-white/10 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <SkeletonList count={8} />
      ) : historyItems.length === 0 ? (
        <div className="py-20 text-center text-neutral-400">
          <History className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">No history yet</h2>
          <p className="text-xs text-neutral-500 mt-1">
            Tracks you stream will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {tracks.map((track, idx) => (
            <TrackRow
              key={`${track.videoId}-${idx}`}
              track={track}
              index={idx}
              contextQueue={tracks}
            />
          ))}
        </div>
      )}
    </div>
  );
};
