import { QUALITY_PROFILES, VisualQuality } from './qualitySettings';

/**
 * Whether the WebGL artwork renderer should be mounted (and its chunk loaded).
 * A disabled ambient preference or unavailable quality profile keeps the
 * renderer entirely out of the active component tree.
 */
export const shouldLoadSpatialArtwork = (
  ambientGlow: boolean,
  visualQuality: VisualQuality | 'off',
): boolean =>
  ambientGlow &&
  visualQuality !== 'off' &&
  Object.prototype.hasOwnProperty.call(QUALITY_PROFILES, visualQuality);
