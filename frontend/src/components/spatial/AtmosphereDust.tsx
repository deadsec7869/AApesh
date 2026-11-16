import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createParticleTexture } from './useSpatialArtworkTexture';
import { audioReactiveEngine } from '@/services/audio/AudioReactiveEngine';
import { QualityProfile } from './qualitySettings';
import { CinematicLightingController } from './cinematicLighting';
import { usePlayerStore } from '@/stores/usePlayerStore';

interface AtmosphereDustProps {
  quality: QualityProfile;
  reducedMotion: boolean;
  lightingController: CinematicLightingController;
}

export const AtmosphereDust: React.FC<AtmosphereDustProps> = ({
  quality,
  reducedMotion,
  lightingController,
}) => {
  const isAboutOpen = usePlayerStore((s) => s.isAboutOpen);
  const farPointsRef = useRef<THREE.Points>(null);
  const nearPointsRef = useRef<THREE.Points>(null);
  const ringMeshRef = useRef<THREE.Mesh>(null);
  const particleTexRef = useRef<THREE.Texture | null>(null);

  // Initialize Particle Texture
  useEffect(() => {
    particleTexRef.current = createParticleTexture();
    return () => {
      particleTexRef.current?.dispose();
    };
  }, []);

  // Generate Far Dust Field coordinates
  const farPositions = useMemo(() => {
    const count = quality.particlesFarCount;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 15;
      pos[i + 1] = (Math.random() - 0.5) * 11;
      pos[i + 2] = -3.0 - Math.random() * 6.5; // z: -3 to -9.5
    }
    return pos;
  }, [quality.particlesFarCount]);

  // Generate Near Dust Motes coordinates
  const nearPositions = useMemo(() => {
    const count = quality.particlesNearCount;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 10;
      pos[i + 1] = (Math.random() - 0.5) * 7.5;
      pos[i + 2] = 0.5 + Math.random() * 3.5; // z: 0.5 to 4.0
    }
    return pos;
  }, [quality.particlesNearCount]);

  // Per-frame subtle organic drift modulated by audio energy
  useFrame((state) => {
    if (reducedMotion) return;

    const elapsed = state.clock.getElapsedTime();
    const features = audioReactiveEngine.getFeatures();
    const speedFactor = isAboutOpen ? 0.5 : 1.0;
    const opacityFactor = isAboutOpen ? 0.5 : 1.0;

    // Far Dust drift
    if (farPointsRef.current) {
      const farSpeed = 0.012 * (1.0 + features.overall * 0.4) * speedFactor;
      farPointsRef.current.rotation.y = elapsed * farSpeed;
      farPointsRef.current.rotation.x = Math.sin(elapsed * 0.008) * 0.05 * speedFactor;

      const mat = farPointsRef.current.material as THREE.PointsMaterial;
      if (mat) {
        mat.opacity = (0.22 + features.bass * 0.15) * opacityFactor;
      }
    }

    // Near Motes drift (counter-orbiting)
    if (nearPointsRef.current) {
      const nearSpeed = 0.018 * (1.0 + features.treble * 0.5) * speedFactor;
      nearPointsRef.current.rotation.y = -elapsed * nearSpeed;
      nearPointsRef.current.rotation.x = Math.cos(elapsed * 0.012) * 0.04 * speedFactor;

      const mat = nearPointsRef.current.material as THREE.PointsMaterial;
      if (mat) {
        mat.opacity = (0.28 + features.highMid * 0.20) * opacityFactor;
      }
    }

    // Ambient Ring subtle slow spin
    if (ringMeshRef.current) {
      ringMeshRef.current.rotation.z = elapsed * 0.02 * speedFactor;
    }
  });

  if (quality.particlesFarCount === 0 && quality.particlesNearCount === 0) {
    return null;
  }

  return (
    <group>
      {/* Far Dust Field */}
      {quality.particlesFarCount > 0 && particleTexRef.current && (
        <points ref={farPointsRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={quality.particlesFarCount}
              array={farPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.18}
            map={particleTexRef.current}
            transparent
            opacity={0.24}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}

      {/* Near Atmospheric Dust Motes */}
      {quality.particlesNearCount > 0 && particleTexRef.current && (
        <points ref={nearPointsRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={quality.particlesNearCount}
              array={nearPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.12}
            map={particleTexRef.current}
            transparent
            opacity={0.32}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}

      {/* Deep Ambient Geometric Ring */}
      <mesh
        ref={ringMeshRef}
        position={[0, 0, -5.5]}
        rotation={[Math.PI * 0.3, 0, 0]}
      >
        <torusGeometry args={[4.5, 0.015, 16, 64]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.035}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
