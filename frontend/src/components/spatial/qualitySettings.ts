/**
 * AAPESH — Cinematic Spatial Environment Quality Tiers & Configuration
 */

export type VisualQuality = 'off' | 'low' | 'medium' | 'high' | 'ultra';

export interface QualityProfile {
  name: VisualQuality;
  enabled: boolean;
  maxPixelRatio: number;
  particlesFarCount: number;
  particlesNearCount: number;
  enablePhysics: boolean;
  physicsBodyCount: number;
  enablePostProcessing: boolean;
  enableBloom: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  enableVignette: boolean;
  enableNoise: boolean;
  enableDepthOfField: boolean;
  enableShaderDistortion: boolean;
  motionDamping: number;
}

export const QUALITY_PROFILES: Record<VisualQuality, QualityProfile> = {
  off: {
    name: 'off',
    enabled: false,
    maxPixelRatio: 1.0,
    particlesFarCount: 0,
    particlesNearCount: 0,
    enablePhysics: false,
    physicsBodyCount: 0,
    enablePostProcessing: false,
    enableBloom: false,
    bloomStrength: 0.0,
    bloomRadius: 0.0,
    bloomThreshold: 1.0,
    enableVignette: false,
    enableNoise: false,
    enableDepthOfField: false,
    enableShaderDistortion: false,
    motionDamping: 0.0,
  },
  low: {
    name: 'low',
    enabled: true,
    maxPixelRatio: 1.0,
    particlesFarCount: 20,
    particlesNearCount: 15,
    enablePhysics: false,
    physicsBodyCount: 0,
    enablePostProcessing: false,
    enableBloom: false,
    bloomStrength: 0.0,
    bloomRadius: 0.0,
    bloomThreshold: 1.0,
    enableVignette: false,
    enableNoise: false,
    enableDepthOfField: false,
    enableShaderDistortion: false,
    motionDamping: 0.04,
  },
  medium: {
    name: 'medium',
    enabled: true,
    maxPixelRatio: 1.25,
    particlesFarCount: 40,
    particlesNearCount: 30,
    enablePhysics: true,
    physicsBodyCount: 6,
    enablePostProcessing: true,
    enableBloom: false,
    bloomStrength: 0.0,
    bloomRadius: 0.0,
    bloomThreshold: 1.0,
    enableVignette: true,
    enableNoise: false,
    enableDepthOfField: false,
    enableShaderDistortion: true,
    motionDamping: 0.05,
  },
  high: {
    name: 'high',
    enabled: true,
    maxPixelRatio: 1.5,
    particlesFarCount: 65,
    particlesNearCount: 45,
    enablePhysics: true,
    physicsBodyCount: 10,
    enablePostProcessing: true,
    enableBloom: true,
    bloomStrength: 0.22,
    bloomRadius: 0.45,
    bloomThreshold: 0.88,
    enableVignette: true,
    enableNoise: true,
    enableDepthOfField: true,
    enableShaderDistortion: true,
    motionDamping: 0.055,
  },
  ultra: {
    name: 'ultra',
    enabled: true,
    maxPixelRatio: 2.0,
    particlesFarCount: 95,
    particlesNearCount: 70,
    enablePhysics: true,
    physicsBodyCount: 16,
    enablePostProcessing: true,
    enableBloom: true,
    bloomStrength: 0.30,
    bloomRadius: 0.55,
    bloomThreshold: 0.85,
    enableVignette: true,
    enableNoise: true,
    enableDepthOfField: true,
    enableShaderDistortion: true,
    motionDamping: 0.06,
  },
};
