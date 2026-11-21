import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useStageFrame as useFrame } from '@/components/canvas/useStageFrame';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { audioReactiveEngine } from '@/services/audio/AudioReactiveEngine';
import { CinematicLightingController } from './cinematicLighting';

interface SceneLightingProps {
  lightingController: CinematicLightingController;
  reducedMotion: boolean;
}

export const SceneLighting: React.FC<SceneLightingProps> = ({
  lightingController,
  reducedMotion,
}) => {
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);
  const atmospherePalette = usePlayerStore((s) => s.atmospherePalette);

  // Update target palette colors on track change
  useEffect(() => {
    lightingController.updatePalette(atmospherePalette);
  }, [atmospherePalette, lightingController]);

  useFrame((_, delta) => {
    const features = audioReactiveEngine.getFeatures();
    const reactivity = reducedMotion ? 0.0 : 0.35;
    const lightState = lightingController.update(delta, features, reactivity, 0.22);

    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = lightState.ambientIntensity;
      ambientLightRef.current.color.copy(lightState.primaryColor);
    }

    if (pointLightRef.current) {
      pointLightRef.current.intensity = lightState.pointIntensity;
      pointLightRef.current.color.copy(lightState.secondaryColor);
    }
  });

  return (
    <group>
      <ambientLight ref={ambientLightRef} intensity={0.85} color="#f8fafc" />
      <pointLight
        ref={pointLightRef}
        position={[3.0, 4.0, 3.5]}
        intensity={1.2}
        distance={20}
        color="#6366f1"
      />
    </group>
  );
};
