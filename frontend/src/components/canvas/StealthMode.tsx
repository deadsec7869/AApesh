import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useStageFrame as useFrame } from '@/components/canvas/useStageFrame';
import { VisualEnergy } from '@/services/audio/AudioReactiveEngine';

interface StealthModeProps {
  quality: 'high' | 'medium' | 'low';
  reducedMotion: boolean;
  audioRefs: {
    features: VisualEnergy;
    analysisMode: 'live_analyser' | 'ambient';
  };
  primaryColor: THREE.Color;
  secondaryColor: THREE.Color;
}

/**
 * Stealth Mode - Visualizer Mode 4 (GPU Eco)
 *
 * Ultra-lightweight static geometric form with minimal animation.
 * Only subtle color breathing - no particle systems, no complex shaders.
 * Designed for battery saving and low-end GPUs.
 */

const STEALTH_VERTEX = `
  uniform float uTime;
  uniform float uBass;
  uniform float uReducedMotion;

  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;

    vec3 pos = position;
    float motionSpeed = uReducedMotion > 0.5 ? 0.0 : 1.0;

    // Minimal bass breathing
    float breath = 1.0 + uBass * 0.08 * motionSpeed;
    pos *= breath;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STEALTH_FRAGMENT = `
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;
  uniform float uTime;
  uniform float uBass;
  uniform float uReducedMotion;

  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);

    // Simple color blend
    float blend = smoothstep(-1.0, 1.0, vPosition.y);
    vec3 baseColor = mix(uPrimaryColor, uSecondaryColor, blend);

    // Minimal lighting
    float diff = max(dot(normal, vec3(0.3, 0.8, 0.5)), 0.0);
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);

    vec3 color = baseColor * (0.6 + diff * 0.4) + uSecondaryColor * rim * 0.2;

    // Subtle bass pulse
    color += uPrimaryColor * uBass * 0.15;

    // Reduced motion: static
    if (uReducedMotion > 0.5) {
      color = baseColor * 0.7;
    }

    float alpha = 0.5 + uBass * 0.1;

    gl_FragColor = vec4(color, alpha);
  }
`;

const stealthUniforms = {
  uTime: { value: 0 },
  uBass: { value: 0.12 },
  uReducedMotion: { value: 0 },
  uPrimaryColor: { value: new THREE.Color('#f59e0b') },
  uSecondaryColor: { value: new THREE.Color('#3b82f6') },
};

export const StealthMode: React.FC<StealthModeProps> = ({
  quality,
  reducedMotion,
  audioRefs,
  primaryColor,
  secondaryColor,
}) => {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);

  // Simple icosahedron geometry - very low poly
  useMemo(() => {
    const detail = quality === 'high' ? 2 : quality === 'medium' ? 1 : 0;
    geometryRef.current = new THREE.IcosahedronGeometry(2.5, detail);
    geometryRef.current.computeVertexNormals();
  }, [quality]);

  // Initialize material
  useMemo(() => {
    materialRef.current = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(stealthUniforms),
      vertexShader: STEALTH_VERTEX,
      fragmentShader: STEALTH_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });
  }, []);

  // Update uniforms each frame (minimal)
  useFrame((state, delta) => {
    if (!materialRef.current || !meshRef.current) return;

    const mat = materialRef.current;
    const features = audioRefs.features;
    const elapsed = state.clock.getElapsedTime();

    // Very slow color interpolation
    const lerpRate = Math.min(delta * 1.0, 1.0);
    mat.uniforms.uPrimaryColor.value.lerp(primaryColor, lerpRate);
    mat.uniforms.uSecondaryColor.value.lerp(secondaryColor, lerpRate);

    // Only bass and time
    mat.uniforms.uTime.value = elapsed;
    mat.uniforms.uBass.value = reducedMotion ? 0.05 : features.bassEnergy;
    mat.uniforms.uReducedMotion.value = reducedMotion ? 1.0 : 0.0;

    // Extremely slow rotation
    if (meshRef.current && !reducedMotion) {
      meshRef.current.rotation.y += delta * 0.003;
      meshRef.current.rotation.x += delta * 0.002;
    }
  });

  if (!geometryRef.current || !materialRef.current) return null;

  return (
    <mesh ref={meshRef} geometry={geometryRef.current} material={materialRef.current} />
  );
};