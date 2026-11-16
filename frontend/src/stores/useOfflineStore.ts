import { create } from 'zustand';
import { Track, LyricLine } from '@/types/music';
import { offlineStorage, OfflineTrackRecord } from '@/services/storage/IndexedDBStorageService';

interface OfflineState {
  downloadedTracks: Track[];
  downloadedRecords: OfflineTrackRecord[];
  downloadedIds: Set<string>;
  downloadingIds: Set<string>;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  storagePercentage: number;
  isOffline: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  downloadTrack: (track: Track, lyrics?: LyricLine[] | null, audioBlob?: Blob | null) => Promise<boolean>;
  removeDownloadedTrack: (videoId: string) => Promise<boolean>;
  isDownloaded: (videoId: string) => boolean;
  isDownloading: (videoId: string) => boolean;
  setOffline: (offline: boolean) => void;
  refreshStorage: () => Promise<void>;
  clearAllOffline: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  downloadedTracks: [],
  downloadedRecords: [],
  downloadedIds: new Set<string>(),
  downloadingIds: new Set<string>(),
  storageUsedBytes: 0,
  storageQuotaBytes: 1024 * 1024 * 1024,
  storagePercentage: 0,
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  isInitialized: false,

  initialize: async () => {
    try {
      const records = await offlineStorage.getAllTracks();
      const tracks = records.map((r) => r.track);
      const ids = new Set(records.map((r) => r.videoId));

      const estimate = await offlineStorage.getStorageEstimate();

      // Bind online/offline browser events if in browser
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => get().setOffline(false));
        window.addEventListener('offline', () => get().setOffline(true));
      }

      set({
        downloadedRecords: records,
        downloadedTracks: tracks,
        downloadedIds: ids,
        storageUsedBytes: estimate.usedBytes,
        storageQuotaBytes: estimate.quotaBytes,
        storagePercentage: estimate.percentage,
        isInitialized: true,
      });
    } catch {
      set({ isInitialized: true });
    }
  },

  downloadTrack: async (track: Track, lyrics?: LyricLine[] | null, audioBlob?: Blob | null) => {
    const { downloadingIds, downloadedIds, downloadedTracks, downloadedRecords } = get();

    if (downloadedIds.has(track.videoId)) {
      return true; // Already downloaded
    }

    // Set downloading state
    const nextDownloading = new Set(downloadingIds);
    nextDownloading.add(track.videoId);
    set({ downloadingIds: nextDownloading });

    try {
      const record = await offlineStorage.saveTrack(track, lyrics, audioBlob);

      const nextDownloadedIds = new Set(downloadedIds);
      nextDownloadedIds.add(track.videoId);

      const nextTracks = [track, ...downloadedTracks];
      const nextRecords = [record, ...downloadedRecords];

      const nextDownloadingDone = new Set(get().downloadingIds);
      nextDownloadingDone.delete(track.videoId);

      set({
        downloadedIds: nextDownloadedIds,
        downloadedTracks: nextTracks,
        downloadedRecords: nextRecords,
        downloadingIds: nextDownloadingDone,
      });

      // Refresh storage metric asynchronously
      get().refreshStorage();
      return true;
    } catch (err) {
      const nextDownloadingFail = new Set(get().downloadingIds);
      nextDownloadingFail.delete(track.videoId);
      set({ downloadingIds: nextDownloadingFail });
      return false;
    }
  },

  removeDownloadedTrack: async (videoId: string) => {
    try {
      await offlineStorage.removeTrack(videoId);

      const nextDownloadedIds = new Set(get().downloadedIds);
      nextDownloadedIds.delete(videoId);

      const nextTracks = get().downloadedTracks.filter((t) => t.videoId !== videoId);
      const nextRecords = get().downloadedRecords.filter((r) => r.videoId !== videoId);

      set({
        downloadedIds: nextDownloadedIds,
        downloadedTracks: nextTracks,
        downloadedRecords: nextRecords,
      });

      get().refreshStorage();
      return true;
    } catch {
      return false;
    }
  },

  isDownloaded: (videoId: string) => {
    return get().downloadedIds.has(videoId);
  },

  isDownloading: (videoId: string) => {
    return get().downloadingIds.has(videoId);
  },

  setOffline: (offline: boolean) => {
    set({ isOffline: offline });
  },

  refreshStorage: async () => {
    try {
      const estimate = await offlineStorage.getStorageEstimate();
      set({
        storageUsedBytes: estimate.usedBytes,
        storageQuotaBytes: estimate.quotaBytes,
        storagePercentage: estimate.percentage,
      });
    } catch {}
  },

  clearAllOffline: async () => {
    try {
      await offlineStorage.clearAll();
      set({
        downloadedTracks: [],
        downloadedRecords: [],
        downloadedIds: new Set<string>(),
        downloadingIds: new Set<string>(),
        storageUsedBytes: 0,
        storagePercentage: 0,
      });
    } catch {}
  },
}));

