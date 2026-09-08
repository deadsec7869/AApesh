export type StreamingQualityTier =
  | 'auto'
  | 'low'
  | 'normal'
  | 'high'
  | 'always_high'
  | 'very_high'
  | 'lossless'
  | 'hi_res';

export interface StreamingQualityCapability {
  tier: StreamingQualityTier;
  label: string;
  description: string;
  bitrateMin?: number; // in kbps
  bitrateMax?: number; // in kbps
  codec?: string;
  bitDepth?: number;
  sampleRate?: number; // in kHz
  lossless: boolean;
  available: boolean;
  reason?: string;
}

export interface EffectiveQualityResolution {
  requestedQuality: StreamingQualityTier;
  effectiveQuality: StreamingQualityTier;
  effectiveLabel: string;
  effectiveCodec?: string;
  effectiveBitrate?: string;
  effectiveBitDepth?: number;
  effectiveSampleRate?: number;
  isLossless: boolean;
  isHiRes: boolean;
  providerName: string;
  isConfigurableByProvider: boolean;
  shortBadge: string;
  statusLabel: string;
  diagnosticsDetail: string;
  note?: string;
}
