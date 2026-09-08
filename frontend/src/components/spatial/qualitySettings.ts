/**
 * AAPESH — Cinematic Spatial Environment Quality Tiers
 */

export type VisualQuality = 'low' | 'medium' | 'high' | 'ultra';

export interface QualityProfile {
  name: VisualQuality;
  maxPixelRatio: number;
  particlesFarCount: number;
  particlesNearCount: number;
  enablePostProcessing: boolean;
  enableBloom: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  enableShaderDistortion: boolean;
  motionDamping: number;
}

export const QUALITY_PROFILES: Record<VisualQuality, QualityProfile> = {
  low: {
    name: 'low',
    maxPixelRatio: 1.0,
    particlesFarCount: 20,
    particlesNearCount: 15,
    enablePostProcessing: false,
    enableBloom: false,
    bloomStrength: 0.0,
    bloomRadius: 0.0,
    bloomThreshold: 1.0,
    enableShaderDistortion: false,
    motionDamping: 0.04,
  },
  medium: {
    name: 'medium',
    maxPixelRatio: 1.25,
    particlesFarCount: 40,
    particlesNearCount: 30,
    enablePostProcessing: true,
    enableBloom: false,
    bloomStrength: 0.0,
    bloomRadius: 0.0,
    bloomThreshold: 1.0,
    enableShaderDistortion: true,
    motionDamping: 0.05,
  },
  high: {
    name: 'high',
    maxPixelRatio: 1.5,
    particlesFarCount: 60,
    particlesNearCount: 45,
    enablePostProcessing: true,
    enableBloom: true,
    bloomStrength: 0.22,
    bloomRadius: 0.45,
    bloomThreshold: 0.88,
    enableShaderDistortion: true,
    motionDamping: 0.055,
  },
  ultra: {
    name: 'ultra',
    maxPixelRatio: 2.0,
    particlesFarCount: 90,
    particlesNearCount: 65,
    enablePostProcessing: true,
    enableBloom: true,
    bloomStrength: 0.32,
    bloomRadius: 0.60,
    bloomThreshold: 0.84,
    enableShaderDistortion: true,
    motionDamping: 0.06,
  },
};
