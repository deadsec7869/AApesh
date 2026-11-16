import React from 'react';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { QualityProfile } from './qualitySettings';

interface CinematicPostProcessingProps {
  quality: QualityProfile;
}

export const CinematicPostProcessing: React.FC<CinematicPostProcessingProps> = ({ quality }) => {
  if (!quality.enablePostProcessing) {
    return null;
  }

  const effects: React.ReactElement[] = [];

  if (quality.enableBloom) {
    effects.push(
      <Bloom
        key="bloom"
        luminanceThreshold={quality.bloomThreshold}
        luminanceSmoothing={0.4}
        intensity={quality.bloomStrength}
        radius={quality.bloomRadius}
        mipmapBlur
      />
    );
  }

  if (quality.enableVignette) {
    effects.push(
      <Vignette
        key="vignette"
        offset={0.25}
        darkness={0.60}
        eskil={false}
      />
    );
  }

  if (quality.enableNoise) {
    effects.push(
      <Noise
        key="noise"
        opacity={0.025}
        premultiply
      />
    );
  }

  if (effects.length === 0) {
    return null;
  }

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {effects}
    </EffectComposer>
  );
};
