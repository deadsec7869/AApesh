export type PlaybackStatus =
  | 'idle'
  | 'loading'
  | 'prebuffering'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'seeking'
  | 'ended'
  | 'error';

export type NetworkTier = 'fast' | 'normal' | 'slow' | 'unknown';

export interface BufferHealth {
  loadedFraction: number | null; // 0.0 - 1.0 from official provider API
  bufferAheadSeconds: number | null; // seconds of stream available ahead of current time
  targetBufferSeconds: number; // dynamic target prebuffer threshold
  networkTier: NetworkTier;
  isPrebuffering: boolean;
}

/**
 * Detect approximate network speed class from Network Information API if available.
 * Defaults to 'normal' or 'unknown' safely without assuming perfection.
 */
export function getNetworkTier(): NetworkTier {
  if (typeof navigator === 'undefined') return 'unknown';

  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      saveData?: boolean;
      downlink?: number;
    };
  };

  const conn = nav.connection;
  if (!conn) return 'unknown';

  if (conn.saveData) return 'slow';

  const type = conn.effectiveType;
  if (type === 'slow-2g' || type === '2g') return 'slow';
  if (type === '3g') return 'normal';
  if (type === '4g') {
    if (typeof conn.downlink === 'number' && conn.downlink >= 5) {
      return 'fast';
    }
    return 'normal';
  }

  return 'normal';
}

/**
 * Compute adaptive target buffer ahead in seconds based on network tier and track duration.
 */
export function computeTargetBufferSeconds(network: NetworkTier, duration: number): number {
  const isShortTrack = duration > 0 && duration < 60;

  switch (network) {
    case 'fast':
      return isShortTrack ? 4 : 8;
    case 'slow':
      return isShortTrack ? 12 : 22;
    case 'normal':
    case 'unknown':
    default:
      return isShortTrack ? 6 : 14;
  }
}
