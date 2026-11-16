import { Track, LyricLine } from '@/types/music';

export interface OfflineTrackRecord {
  videoId: string;
  track: Track;
  downloadedAt: number;
  sizeBytes: number;
  hasAudio: boolean;
  audioBlob?: Blob | null;
  lyrics?: LyricLine[] | null;
}

export interface StorageEstimateResult {
  usedBytes: number;
  quotaBytes: number;
  percentage: number;
}

const DB_NAME = 'aapesh_offline_db';
const DB_VERSION = 1;
const STORE_TRACKS = 'cached_tracks';
const STORE_LYRICS = 'cached_lyrics';
const STORE_META = 'storage_meta';

let monotonicTick = 0;

class IndexedDBStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  // In-memory fallback if IndexedDB is unavailable in the environment
  private memoryTracks = new Map<string, OfflineTrackRecord>();
  private memoryLyrics = new Map<string, LyricLine[]>();

  private isIDBAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  public async initDB(): Promise<IDBDatabase> {
    if (!this.isIDBAvailable()) {
      throw new Error('IndexedDB is not supported in this environment');
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_TRACKS)) {
            db.createObjectStore(STORE_TRACKS, { keyPath: 'videoId' });
          }
          if (!db.objectStoreNames.contains(STORE_LYRICS)) {
            db.createObjectStore(STORE_LYRICS, { keyPath: 'videoId' });
          }
          if (!db.objectStoreNames.contains(STORE_META)) {
            db.createObjectStore(STORE_META, { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error || new Error('Failed to open IndexedDB'));
        };
      } catch (err) {
        reject(err);
      }
    });

    return this.dbPromise;
  }

  /**
   * Save a track and optional lyrics/audio blob to local cache
   */
  public async saveTrack(
    track: Track,
    lyrics?: LyricLine[] | null,
    audioBlob?: Blob | null
  ): Promise<OfflineTrackRecord> {
    const rawData = JSON.stringify(track) + (lyrics ? JSON.stringify(lyrics) : '');
    const estimatedSizeBytes = (audioBlob ? audioBlob.size : 0) + new Blob([rawData]).size + 1024; // buffer for indexing

    const record: OfflineTrackRecord = {
      videoId: track.videoId,
      track,
      downloadedAt: Date.now() * 1000 + (monotonicTick++ % 1000),
      sizeBytes: estimatedSizeBytes,
      hasAudio: !!audioBlob,
      audioBlob: audioBlob || null,
      lyrics: lyrics || null,
    };

    if (!this.isIDBAvailable()) {
      this.memoryTracks.set(track.videoId, record);
      if (lyrics) {
        this.memoryLyrics.set(track.videoId, lyrics);
      }
      return record;
    }

    try {
      const db = await this.initDB();
      return new Promise<OfflineTrackRecord>((resolve, reject) => {
        const tx = db.transaction([STORE_TRACKS, STORE_LYRICS], 'readwrite');
        const tracksStore = tx.objectStore(STORE_TRACKS);
        const lyricsStore = tx.objectStore(STORE_LYRICS);

        tracksStore.put(record);

        if (lyrics && lyrics.length > 0) {
          lyricsStore.put({ videoId: track.videoId, lines: lyrics, cachedAt: Date.now() });
        }

        tx.oncomplete = () => resolve(record);
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Graceful fallback to memory storage
      this.memoryTracks.set(track.videoId, record);
      if (lyrics) {
        this.memoryLyrics.set(track.videoId, lyrics);
      }
      return record;
    }
  }

  /**
   * Retrieve cached track record by videoId
   */
  public async getTrack(videoId: string): Promise<OfflineTrackRecord | null> {
    if (!this.isIDBAvailable()) {
      return this.memoryTracks.get(videoId) || null;
    }

    try {
      const db = await this.initDB();
      return new Promise<OfflineTrackRecord | null>((resolve, reject) => {
        const tx = db.transaction(STORE_TRACKS, 'readonly');
        const store = tx.objectStore(STORE_TRACKS);
        const req = store.get(videoId);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.memoryTracks.get(videoId) || null;
    }
  }

  /**
   * Get all cached track records ordered newest first
   */
  public async getAllTracks(): Promise<OfflineTrackRecord[]> {
    if (!this.isIDBAvailable()) {
      return Array.from(this.memoryTracks.values()).sort((a, b) => b.downloadedAt - a.downloadedAt);
    }

    try {
      const db = await this.initDB();
      return new Promise<OfflineTrackRecord[]>((resolve, reject) => {
        const tx = db.transaction(STORE_TRACKS, 'readonly');
        const store = tx.objectStore(STORE_TRACKS);
        const req = store.getAll();

        req.onsuccess = () => {
          const results: OfflineTrackRecord[] = req.result || [];
          results.sort((a, b) => b.downloadedAt - a.downloadedAt);
          resolve(results);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return Array.from(this.memoryTracks.values()).sort((a, b) => b.downloadedAt - a.downloadedAt);
    }
  }

  /**
   * Delete a cached track and its lyrics
   */
  public async removeTrack(videoId: string): Promise<boolean> {
    if (!this.isIDBAvailable()) {
      const removed = this.memoryTracks.delete(videoId);
      this.memoryLyrics.delete(videoId);
      return removed;
    }

    try {
      const db = await this.initDB();
      return new Promise<boolean>((resolve, reject) => {
        const tx = db.transaction([STORE_TRACKS, STORE_LYRICS], 'readwrite');
        tx.objectStore(STORE_TRACKS).delete(videoId);
        tx.objectStore(STORE_LYRICS).delete(videoId);

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      const removed = this.memoryTracks.delete(videoId);
      this.memoryLyrics.delete(videoId);
      return removed;
    }
  }

  /**
   * Fast check if a track is stored in cache
   */
  public async isCached(videoId: string): Promise<boolean> {
    if (!this.isIDBAvailable()) {
      return this.memoryTracks.has(videoId);
    }

    try {
      const db = await this.initDB();
      return new Promise<boolean>((resolve, reject) => {
        const tx = db.transaction(STORE_TRACKS, 'readonly');
        const store = tx.objectStore(STORE_TRACKS);
        const req = store.count(videoId);

        req.onsuccess = () => resolve(req.result > 0);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.memoryTracks.has(videoId);
    }
  }

  /**
   * Get cached lyrics for track
   */
  public async getLyrics(videoId: string): Promise<LyricLine[] | null> {
    if (!this.isIDBAvailable()) {
      return this.memoryLyrics.get(videoId) || null;
    }

    try {
      const db = await this.initDB();
      return new Promise<LyricLine[] | null>((resolve, reject) => {
        const tx = db.transaction(STORE_LYRICS, 'readonly');
        const store = tx.objectStore(STORE_LYRICS);
        const req = store.get(videoId);

        req.onsuccess = () => {
          if (req.result && req.result.lines) {
            resolve(req.result.lines);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.memoryLyrics.get(videoId) || null;
    }
  }

  /**
   * Calculate storage quota and used bytes
   */
  public async getStorageEstimate(): Promise<StorageEstimateResult> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 1024 * 1024 * 1024; // default 1GB
        const pct = quota > 0 ? (used / quota) * 100 : 0;
        return {
          usedBytes: used,
          quotaBytes: quota,
          percentage: Math.min(100, Math.round(pct * 10) / 10),
        };
      } catch {}
    }

    // Fallback: estimate from in-memory / records
    const all = await this.getAllTracks();
    const used = all.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
    const quota = 1024 * 1024 * 1024 * 2; // 2GB default fallback
    return {
      usedBytes: used,
      quotaBytes: quota,
      percentage: Math.min(100, Math.round((used / quota) * 1000) / 10),
    };
  }

  /**
   * Clear all offline storage
   */
  public async clearAll(): Promise<void> {
    this.memoryTracks.clear();
    this.memoryLyrics.clear();

    if (!this.isIDBAvailable()) return;

    try {
      const db = await this.initDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_TRACKS, STORE_LYRICS, STORE_META], 'readwrite');
        tx.objectStore(STORE_TRACKS).clear();
        tx.objectStore(STORE_LYRICS).clear();
        tx.objectStore(STORE_META).clear();

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {}
  }
}

export const offlineStorage = new IndexedDBStorageService();
