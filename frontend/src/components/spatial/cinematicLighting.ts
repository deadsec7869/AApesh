import * as THREE from 'three';
import { ArtworkPalette } from '@/lib/colorExtractor';
import { VisualEnergy } from '@/services/audio/AudioReactiveEngine';

/**
 * Cinematic Lighting Controller
 * Manages smoothly interpolated ambient and key lighting, artwork glow,
 * bloom strength, and vignette strength derived from ArtworkPalette and VisualEnergy.
 */
export interface LightingState {
  ambientIntensity: number;
  pointIntensity: number;
  artworkGlow: number;
  bloomStrength: number;
  vignetteStrength: number;
  primaryColor: THREE.Color;
  secondaryColor: THREE.Color;
}

export class CinematicLightingController {
  private primaryColor = new THREE.Color('#f8fafc');
  private targetPrimaryColor = new THREE.Color('#f8fafc');
  private secondaryColor = new THREE.Color('#6366f1');
  private targetSecondaryColor = new THREE.Color('#6366f1');

  private currentAmbient = 0.85;
  private currentPoint = 1.2;
  private currentGlow = 0.35;
  private currentBloom = 0.22;
  private currentVignette = 0.15;

  public updatePalette(palette: ArtworkPalette | null): void {
    if (palette?.primary) {
      this.safeSetColor(this.targetPrimaryColor, palette.primary);
    } else {
      this.targetPrimaryColor.set('#f8fafc');
    }

    if (palette?.glow) {
      this.safeSetColor(this.targetSecondaryColor, palette.glow);
    } else {
      this.targetSecondaryColor.set('#6366f1');
    }
  }

  private safeSetColor(target: THREE.Color, colorStr: string): void {
    try {
      if (colorStr.startsWith('rgba')) {
        const rgb = colorStr.replace('rgba', 'rgb').replace(/,[^,)]+\)/, ')');
        target.set(rgb);
      } else {
        target.set(colorStr);
      }
    } catch {
      target.set('#f8fafc');
    }
  }

  public update(
    delta: number,
    energy: VisualEnergy,
    reactivityMultiplier: number,
    baseBloom: number
  ): LightingState {
    // Smooth color interpolation
    const lerpRate = Math.min(delta * 3.5, 1.0);
    this.primaryColor.lerp(this.targetPrimaryColor, lerpRate);
    this.secondaryColor.lerp(this.targetSecondaryColor, lerpRate);

    // Target intensities with energy modulation
    const targetAmbient = 0.85 * (1.0 + (energy.overallEnergy * 0.25 + energy.transientEnergy * 0.18) * reactivityMultiplier);
    const targetPoint = 1.2 * (1.0 + (energy.bassEnergy * 0.35 + energy.transientEnergy * 0.28) * reactivityMultiplier);
    const targetGlow = 0.35 * (1.0 + energy.overallEnergy * 0.3 * reactivityMultiplier);
    const targetBloom = baseBloom * (1.0 + energy.bassEnergy * 0.25 * reactivityMultiplier);
    const targetVignette = 0.15 * (1.0 + energy.overallEnergy * 0.1 * reactivityMultiplier);

    // Asymmetric smoothing for lighting
    this.currentAmbient += (targetAmbient - this.currentAmbient) * Math.min(delta * 4.0, 1.0);
    this.currentPoint += (targetPoint - this.currentPoint) * Math.min(delta * 4.0, 1.0);
    this.currentGlow += (targetGlow - this.currentGlow) * Math.min(delta * 4.0, 1.0);
    this.currentBloom += (targetBloom - this.currentBloom) * Math.min(delta * 3.0, 1.0);
    this.currentVignette += (targetVignette - this.currentVignette) * Math.min(delta * 2.0, 1.0);

    return {
      ambientIntensity: this.currentAmbient,
      pointIntensity: this.currentPoint,
      artworkGlow: this.currentGlow,
      bloomStrength: this.currentBloom,
      vignetteStrength: this.currentVignette,
      primaryColor: this.primaryColor,
      secondaryColor: this.secondaryColor,
    };
  }
}
