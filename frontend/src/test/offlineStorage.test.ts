import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { offlineStorage, OfflineTrackRecord } from '../services/storage/IndexedDBStorageService';
import { useOfflineStore } from '../stores/useOfflineStore';
import { Track, LyricLine } from '../types/music';

const mockTrack1: Track = {
  videoId: 'offline_vid_001',
  title: 'Starboy (Spatial Cache)',
  artists: [{ name: 'The Weeknd' }],
  album: 'Starboy',
  duration: '3:50',
  duration_seconds: 230,
  thumbnail: 'https://img.youtube.com/vi/offline_vid_001/hqdefault.jpg',
};

const mockTrack2: Track = {
  videoId: 'offline_vid_002',
  title: 'Blinding Lights (Offline Edition)',
  artists: [{ name: 'The Weeknd' }],
  album: 'After Hours',
  duration: '3:20',
  duration_seconds: 200,
  thumbnail: 'https://img.youtube.com/vi/offline_vid_002/hqdefault.jpg',
};

const mockLyrics: LyricLine[] = [
  { id: 'l1', text: 'I am trying to put you in the worst mood', startTime: 12.0, endTime: 15.0 },
  { id: 'l2', text: 'P1 cleaner than your church shoes', startTime: 15.1, endTime: 18.5 },
];

describe('IndexedDBStorageService & Offline Engine', () => {
  beforeEach(async () => {
    await offlineStorage.clearAll();
    useOfflineStore.setState({
      downloadedTracks: [],
      downloadedRecords: [],
      downloadedIds: new Set<string>(),
      downloadingIds: new Set<string>(),
      storageUsedBytes: 0,
      storageQuotaBytes: 1024 * 1024 * 1024,
      isOffline: false,
      isInitialized: false,
    });
  });

  afterEach(async () => {
    await offlineStorage.clearAll();
  });

  it('stores and retrieves a track with metadata and lyrics', async () => {
    const record = await offlineStorage.saveTrack(mockTrack1, mockLyrics);
    expect(record.videoId).toBe('offline_vid_001');
    expect(record.track.title).toBe('Starboy (Spatial Cache)');
    expect(record.sizeBytes).toBeGreaterThan(0);

    const retrieved = await offlineStorage.getTrack('offline_vid_001');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.track.title).toBe('Starboy (Spatial Cache)');
    expect(retrieved?.lyrics).toHaveLength(2);

    const isCached = await offlineStorage.isCached('offline_vid_001');
    expect(isCached).toBe(true);

    const notCached = await offlineStorage.isCached('unknown_id');
    expect(notCached).toBe(false);
  });

  it('retrieves cached lyrics separately for quick lyrics view', async () => {
    await offlineStorage.saveTrack(mockTrack1, mockLyrics);
    const lyrics = await offlineStorage.getLyrics('offline_vid_001');
    expect(lyrics).not.toBeNull();
    expect(lyrics?.[0].text).toContain('worst mood');
  });

  it('retrieves all cached tracks sorted by newest download date', async () => {
    await offlineStorage.saveTrack(mockTrack1);
    await offlineStorage.saveTrack(mockTrack2);

    const all = await offlineStorage.getAllTracks();
    expect(all).toHaveLength(2);
    // Newest first
    expect(all[0].videoId).toBe('offline_vid_002');
    expect(all[1].videoId).toBe('offline_vid_001');
  });

  it('removes a track and its lyrics from storage', async () => {
    await offlineStorage.saveTrack(mockTrack1, mockLyrics);
    expect(await offlineStorage.isCached('offline_vid_001')).toBe(true);

    const removed = await offlineStorage.removeTrack('offline_vid_001');
    expect(removed).toBe(true);
    expect(await offlineStorage.isCached('offline_vid_001')).toBe(false);

    const retrieved = await offlineStorage.getTrack('offline_vid_001');
    expect(retrieved).toBeNull();
  });

  it('calculates storage estimate metrics', async () => {
    await offlineStorage.saveTrack(mockTrack1);
    const estimate = await offlineStorage.getStorageEstimate();
    expect(estimate.quotaBytes).toBeGreaterThan(0);
    expect(estimate.usedBytes).toBeGreaterThanOrEqual(0);
    expect(estimate.percentage).toBeGreaterThanOrEqual(0);
  });
});

describe('useOfflineStore (Zustand)', () => {
  beforeEach(async () => {
    await offlineStorage.clearAll();
    useOfflineStore.setState({
      downloadedTracks: [],
      downloadedRecords: [],
      downloadedIds: new Set<string>(),
      downloadingIds: new Set<string>(),
      storageUsedBytes: 0,
      storageQuotaBytes: 1024 * 1024 * 1024,
      isOffline: false,
      isInitialized: false,
    });
  });

  it('initializes store from storage records', async () => {
    await offlineStorage.saveTrack(mockTrack1);
    await useOfflineStore.getState().initialize();

    const state = useOfflineStore.getState();
    expect(state.isInitialized).toBe(true);
    expect(state.downloadedTracks).toHaveLength(1);
    expect(state.downloadedIds.has('offline_vid_001')).toBe(true);
    expect(state.isDownloaded('offline_vid_001')).toBe(true);
    expect(state.isDownloaded('offline_vid_002')).toBe(false);
  });

  it('downloads track and updates reactive sets and records', async () => {
    const success = await useOfflineStore.getState().downloadTrack(mockTrack2, mockLyrics);
    expect(success).toBe(true);

    const state = useOfflineStore.getState();
    expect(state.downloadedTracks).toHaveLength(1);
    expect(state.downloadedIds.has('offline_vid_002')).toBe(true);
    expect(state.isDownloaded('offline_vid_002')).toBe(true);
    expect(state.downloadingIds.has('offline_vid_002')).toBe(false);
  });

  it('removes downloaded track and updates store', async () => {
    await useOfflineStore.getState().downloadTrack(mockTrack1);
    expect(useOfflineStore.getState().isDownloaded('offline_vid_001')).toBe(true);

    const removed = await useOfflineStore.getState().removeDownloadedTrack('offline_vid_001');
    expect(removed).toBe(true);
    expect(useOfflineStore.getState().isDownloaded('offline_vid_001')).toBe(false);
    expect(useOfflineStore.getState().downloadedTracks).toHaveLength(0);
  });

  it('handles offline mode toggles cleanly', () => {
    const store = useOfflineStore.getState();
    expect(store.isOffline).toBe(false);

    store.setOffline(true);
    expect(useOfflineStore.getState().isOffline).toBe(true);

    store.setOffline(false);
    expect(useOfflineStore.getState().isOffline).toBe(false);
  });

  it('clears all offline downloads on clearAllOffline', async () => {
    await useOfflineStore.getState().downloadTrack(mockTrack1);
    await useOfflineStore.getState().downloadTrack(mockTrack2);
    expect(useOfflineStore.getState().downloadedTracks).toHaveLength(2);

    await useOfflineStore.getState().clearAllOffline();
    expect(useOfflineStore.getState().downloadedTracks).toHaveLength(0);
    expect(useOfflineStore.getState().downloadedIds.size).toBe(0);
  });
});

