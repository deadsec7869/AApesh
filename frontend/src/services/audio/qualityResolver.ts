import {
  StreamingQualityTier,
  StreamingQualityCapability,
  EffectiveQualityResolution,
} from '@/types/quality';
import { PlaybackProvider } from '../player/PlaybackProvider';

/**
 * Honest capability model for YouTube Music / YouTube IFrame playback.
 * YouTube streams max out at ~256 kbps AAC / Opus.
 */
export const YOUTUBE_QUALITY_CAPABILITIES: StreamingQualityCapability[] = [
  {
    tier: 'auto',
    label: 'Auto',
    description: 'Adaptive stream (up to 256 kbps)',
    bitrateMin: 48,
    bitrateMax: 256,
    codec: 'AAC / Opus',
    lossless: false,
    available: true,
  },
  {
    tier: 'low',
    label: 'Low',
    description: 'Data Saver (≤48 kbps)',
    bitrateMin: 32,
    bitrateMax: 48,
    codec: 'Opus / AAC',
    lossless: false,
    available: true,
  },
  {
    tier: 'normal',
    label: 'Normal',
    description: 'Standard Quality (≤128 kbps)',
    bitrateMin: 96,
    bitrateMax: 128,
    codec: 'AAC / Opus',
    lossless: false,
    available: true,
  },
  {
    tier: 'high',
    label: 'High',
    description: 'High Quality (≤256 kbps)',
    bitrateMin: 192,
    bitrateMax: 256,
    codec: 'AAC / Opus',
    lossless: false,
    available: true,
  },
  {
    tier: 'always_high',
    label: 'Always High',
    description: 'Target 256 kbps stream',
    bitrateMin: 256,
    bitrateMax: 256,
    codec: 'AAC / Opus',
    lossless: false,
    available: true,
  },
  {
    tier: 'very_high',
    label: 'Very High',
    description: '320 kbps MP3/AAC',
    lossless: false,
    available: false,
    reason: 'YouTube stream maximum is 256 kbps AAC/Opus',
  },
  {
    tier: 'lossless',
    label: 'Lossless',
    description: 'FLAC • 16-bit / 44.1 kHz',
    lossless: true,
    available: false,
    reason: 'Lossless stream requires a lossless source provider',
  },
  {
    tier: 'hi_res',
    label: 'Hi-Res Lossless',
    description: 'FLAC • 24-bit / 96–192 kHz',
    lossless: true,
    available: false,
    reason: 'Hi-Res stream requires a 24-bit studio source provider',
  },
];

/**
 * Resolves requested user quality against active provider capabilities.
 * Never fabricates lossless or unverified bitrate values.
 */
export function resolveStreamingQuality(
  requested: StreamingQualityTier,
  provider?: PlaybackProvider | null
): EffectiveQualityResolution {
  // If a 3rd-party provider implements its own resolution (not standard YouTube provider), delegate
  if (
    provider &&
    provider.name !== 'YouTubeIframeProvider' &&
    typeof provider.getEffectiveQuality === 'function'
  ) {
    return provider.getEffectiveQuality(requested);
  }

  // Default YouTube IFrame resolution
  switch (requested) {
    case 'low':
      return {
        requestedQuality: 'low',
        effectiveQuality: 'low',
        effectiveLabel: 'Low Quality',
        effectiveBitrate: '≤48 kbps',
        effectiveCodec: 'Opus / AAC',
        isLossless: false,
        isHiRes: false,
        providerName: 'YouTube Music',
        isConfigurableByProvider: false,
        shortBadge: '48k',
        statusLabel: 'Low • ≤48 kbps',
        diagnosticsDetail: 'Data Saver (≤48 kbps Opus/AAC)',
        note: 'YouTube adaptive player stream.',
      };

    case 'normal':
      return {
        requestedQuality: 'normal',
        effectiveQuality: 'normal',
        effectiveLabel: 'Standard Quality',
        effectiveBitrate: '≤128 kbps',
        effectiveCodec: 'AAC / Opus',
        isLossless: false,
        isHiRes: false,
        providerName: 'YouTube Music',
        isConfigurableByProvider: false,
        shortBadge: '128k',
        statusLabel: 'Standard • ≤128 kbps',
        diagnosticsDetail: 'Standard Quality (≤128 kbps AAC/Opus)',
        note: 'YouTube adaptive player stream.',
      };

    case 'always_high':
      return {
        requestedQuality: 'always_high',
        effectiveQuality: 'always_high',
        effectiveLabel: 'Always High',
        effectiveBitrate: '256 kbps',
        effectiveCodec: 'AAC / Opus',
        isLossless: false,
        isHiRes: false,
        providerName: 'YouTube Music',
        isConfigurableByProvider: false,
        shortBadge: 'HQ 256k',
        statusLabel: 'High Quality • 256 kbps',
        diagnosticsDetail: 'High Quality (256 kbps AAC/Opus)',
        note: 'Targeting highest YouTube Music bitrate.',
      };

    case 'high':
      return {
        requestedQuality: 'high',
        effectiveQuality: 'high',
        effectiveLabel: 'High Quality',
        effectiveBitrate: '≤256 kbps',
        effectiveCodec: 'AAC / Opus',
        isLossless: false,
        isHiRes: false,
        providerName: 'YouTube Music',
        isConfigurableByProvider: false,
        shortBadge: 'HQ 256k',
        statusLabel: 'High Quality • 256 kbps',
        diagnosticsDetail: 'High Quality (≤256 kbps AAC/Opus)',
        note: 'Standard YouTube Music high-tier audio stream.',
      };

    case 'very_high':
    case 'lossless':
    case 'hi_res':
      return {
        requestedQuality: requested,
        effectiveQuality: 'high',
        effectiveLabel: 'High Quality (Provider Cap)',
        effectiveBitrate: '256 kbps',
        effectiveCodec: 'AAC / Opus',
        isLossless: false,
        isHiRes: false,
        providerName: 'YouTube Music',
        isConfigurableByProvider: false,
        shortBadge: 'HQ 256k',
        statusLabel: 'High Quality • 256 kbps',
        diagnosticsDetail: `Requested: ${requested.toUpperCase()} | Effective: 256 kbps (YouTube cap)`,
        note: `Requested ${requested.replace('_', ' ').toUpperCase()} is unavailable on YouTube Music. Delivering maximum available stream (256 kbps AAC/Opus).`,
      };

    case 'auto':
    default:
      return {
        requestedQuality: 'auto',
        effectiveQuality: 'auto',
        effectiveLabel: 'Auto (Adaptive)',
        effectiveBitrate: 'Up to 256 kbps',
        effectiveCodec: 'AAC / Opus',
        isLossless: false,
        isHiRes: false,
        providerName: 'YouTube Music',
        isConfigurableByProvider: false,
        shortBadge: 'AUTO',
        statusLabel: 'Auto • Up to 256 kbps',
        diagnosticsDetail: 'Adaptive bitrate (up to 256 kbps)',
        note: 'YouTube automatically adapts stream bitrate up to 256 kbps based on network throughput.',
      };
  }
}

/**
 * Filter available tiers for active UI selection
 */
export function getAvailableQualityCapabilities(
  capabilities: StreamingQualityCapability[] = YOUTUBE_QUALITY_CAPABILITIES
): StreamingQualityCapability[] {
  return capabilities.filter((c) => c.available);
}

/**
 * Filter future/unsupported tiers for informational display
 */
export function getFutureQualityCapabilities(
  capabilities: StreamingQualityCapability[] = YOUTUBE_QUALITY_CAPABILITIES
): StreamingQualityCapability[] {
  return capabilities.filter((c) => !c.available);
}
