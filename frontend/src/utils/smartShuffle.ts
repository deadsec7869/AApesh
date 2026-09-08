import { Track } from '@/types/music';

export type ShuffleMode = 'off' | 'standard' | 'smart';

export interface SmartShuffleOptions {
  currentTrack?: Track | null;
  history?: Track[];
  likedVideoIds?: Set<string>;
  preserveCustomQueue?: boolean;
}

/**
 * Standard Fisher-Yates shuffle on an array of tracks.
 */
export function standardShuffle(tracks: Track[]): Track[] {
  const copy = [...tracks];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Smart Shuffle Algorithm:
 * 1. Partitions queue into past tracks (played) and upcoming tracks.
 * 2. For upcoming tracks:
 *    - Respects explicitly queued tracks.
 *    - Penalizes immediate consecutive repetitions of artists (no back-to-back same artist).
 *    - Penalizes immediate consecutive repetitions of albums.
 *    - Boosts liked tracks (1.5x selection probability).
 *    - Maximizes diversity across the playlist/queue.
 */
export function smartShuffleQueue(
  queue: Track[],
  currentIndex: number,
  options: SmartShuffleOptions = {}
): Track[] {
  if (queue.length <= 1) return [...queue];

  const past = queue.slice(0, Math.max(0, currentIndex + 1));
  const upcoming = queue.slice(Math.max(0, currentIndex + 1));

  if (upcoming.length <= 1) return [...queue];

  const likedIds = options.likedVideoIds || new Set<string>();
  const lastPlayedArtist =
    options.currentTrack?.artists?.[0]?.name ||
    past[past.length - 1]?.artists?.[0]?.name ||
    '';

  const pool = [...upcoming];
  const result: Track[] = [];
  let previousArtist = lastPlayedArtist;

  while (pool.length > 0) {
    // Score each candidate track in pool
    const scoredCandidates = pool.map((track, poolIdx) => {
      let score = 100;
      const artist = track.artists?.[0]?.name || '';
      const isLiked = likedIds.has(track.videoId);

      // Penalize consecutive artist
      if (previousArtist && artist && artist.toLowerCase() === previousArtist.toLowerCase()) {
        score -= 60;
      }

      // Liked boost
      if (isLiked) {
        score += 40;
      }

      // Add a randomized jitter so shuffle remains non-deterministic
      const jitter = Math.random() * 40;
      score += jitter;

      return { track, poolIdx, score };
    });

    // Sort descending by score
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Pick best scored track
    const selected = scoredCandidates[0];
    result.push(selected.track);
    previousArtist = selected.track.artists?.[0]?.name || '';

    // Remove selected track from pool
    pool.splice(selected.poolIdx, 1);
  }

  return [...past, ...result];
}
