import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { VisualEnergy } from '@/services/audio/AudioReactiveEngine';

interface StarfieldDriftProps {
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
 * Starfield Drift - Visualizer Mode 3
 *
 * A 3D particle field where particles drift in 3D space,
 * with velocity and color modulated by audio features.
 * Creates a cosmic, immersive atmosphere.
 */

const STARFIELD_VERTEX = `
  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uTreble;
  uniform float uTransient;
  uniform float uBeatEnergy;
  uniform float uReducedMotion;
  uniform float uParticleCount;

  attribute vec3 aInitialPosition;
  attribute vec3 aVelocity;
  attribute float aSize;
  attribute float aHueShift;
  attribute float aDepthLayer;

  varying vec3 vColor;
  varying float vSize;
  varying float vDepthLayer;

  // Hash for pseudo-random
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= p + 33.33;
    p *= p + p;
    return fract(p.x + p.y + p.z);
  }

  void main() {
    vSize = aSize;
    vDepthLayer = aDepthLayer;
    vec3 pos = aInitialPosition;

    float motionSpeed = uReducedMotion > 0.5 ? 0.0 : 1.0;
    float time = uTime * 0.15 * motionSpeed;

    // Base drift velocity
    pos += aVelocity * time * 10.0;

    // Bass: radial pulse from center
    float distFromCenter = length(pos);
    float bassPulse = sin(distFromCenter * 2.0 - time * 8.0) * uBass * 0.5;
    pos += normalize(pos) * bassPulse;

    // Mid: vortex swirl
    float midSwirl = uMid * 0.3;
    float angle = midSwirl * time * 2.0 + aHueShift * 6.28;
    float ca = cos(angle);
    float sa = sin(angle);
    mat2 rot = mat2(ca, -sa, sa, ca);
    pos.xz = rot * pos.xz;

    // Treble: fine jitter
    float jitter = hash(pos * 10.0 + time) * uTreble * 0.05;
    pos += vec3(jitter, jitter * 0.5, jitter);

    // Transient: explosive burst
    pos += normalize(pos) * uTransient * 2.0 * (1.0 - aDepthLayer);

    // Beat: spherical expansion
    pos += normalize(pos) * uBeatEnergy * 1.5 * aDepthLayer;

    // Wrap around (infinite space simulation)
    float bounds = 50.0;
    pos = mod(pos + bounds, bounds * 2.0) - bounds;

    // Color based on depth layer and audio
    float hue = aHueShift + uMid * 0.2 + uTreble * 0.1;
    vec3 color = mix(
      vec3(1.0, 0.8, 0.3), // Warm
      vec3(0.2, 0.6, 1.0), // Cool
      aDepthLayer
    );
    color = mix(color, vec3(1.0), uTransient * 0.5);
    vColor = color;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STARFIELD_FRAGMENT = `
  uniform float uTime;
  uniform float uReducedMotion;

  varying vec3 vColor;
  varying float vSize;
  varying float vDepthLayer;

  void main() {
    // Circular particle with soft edge
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv) * 2.0;
    float alpha = smoothstep(1.0, 0.0, dist);

    // Depth-based size attenuation
    alpha *= mix(1.0, 0.3, vDepthLayer);

    // Add subtle sparkle
    float sparkle = sin(uTime * 20.0 + vDepthLayer * 100.0) * 0.1 + 0.9;
    alpha *= sparkle;

    // Reduced motion: static particles
    if (uReducedMotion > 0.5) {
      alpha = smoothstep(1.0, 0.0, dist) * 0.5;
    }

    gl_FragColor = vec4(vColor, alpha);
  }
`;

const starfieldUniforms = {
  uTime: { value: 0 },
  uBass: { value: 0.12 },
  uMid: { value: 0.12 },
  uTreble: { value: 0.10 },
  uTransient: { value: 0.0 },
  uBeatEnergy: { value: 0.0 },
  uReducedMotion: { value: 0 },
  uParticleCount: { value: 1 },
};

export const StarfieldDrift: React.FC<StarfieldDriftProps> = ({
  quality,
  reducedMotion,
  audioRefs,
  primaryColor,
  secondaryColor,
}) => {
  const pointsRef = useRef<THREE.Points | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);

  // Create particle geometry
  useMemo(() => {
    const count = quality === 'high' ? 8000 : quality === 'medium' ? 5000 : 3000;
    const bounds = 40;

    const positions = new Float32Array(count * 3);
    const initialPositions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const hueShifts = new Float32Array(count);
    const depthLayers = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Spherical distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = Math.pow(Math.random(), 0.5) * bounds;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      initialPositions[i * 3] = x;
      initialPositions[i * 3 + 1] = y;
      initialPositions[i * 3 + 2] = z;

      // Random velocity
      velocities[i * 3] = (Math.random() - 0.5) * 0.5;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

      // Size variation
      sizes[i] = 1.0 + Math.random() * 2.0;

      // Hue shift for color variation
      hueShifts[i] = Math.random();

      // Depth layer (0 = front, 1 = back)
      depthLayers[i] = Math.random();
    }

    geometryRef.current = new THREE.BufferGeometry();
    geometryRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometryRef.current.setAttribute('aInitialPosition', new THREE.BufferAttribute(initialPositions, 3));
    geometryRef.current.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    geometryRef.current.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometryRef.current.setAttribute('aHueShift', new THREE.BufferAttribute(hueShifts, 1));
    geometryRef.current.setAttribute('aDepthLayer', new THREE.BufferAttribute(depthLayers, 1));
  }, [quality]);

  // Initialize material
  useMemo(() => {
    materialRef.current = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(starfieldUniforms),
      vertexShader: STARFIELD_VERTEX,
      fragmentShader: STARFIELD_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: false,
    });
  }, []);

  // Update uniforms each frame
  useFrame((state, delta) => {
    if (!materialRef.current || !pointsRef.current) return;

    const mat = materialRef.current;
    const features = audioRefs.features;
    const elapsed = state.clock.getElapsedTime();

    // Audio uniforms
    mat.uniforms.uTime.value = elapsed;
    mat.uniforms.uBass.value = reducedMotion ? 0.05 : features.bassEnergy;
    mat.uniforms.uMid.value = reducedMotion ? 0.05 : features.midEnergy;
    mat.uniforms.uTreble.value = reducedMotion ? 0.05 : (features.highMidEnergy || features.highEnergy);
    mat.uniforms.uTransient.value = reducedMotion ? 0.0 : features.transientEnergy;
    mat.uniforms.uBeatEnergy.value = reducedMotion ? 0.0 : features.beatEnergy;
    mat.uniforms.uReducedMotion.value = reducedMotion ? 1.0 : 0.0;
  });

  if (!geometryRef.current || !materialRef.current) return null;

  return (
    <points ref={pointsRef} geometry={geometryRef.current} material={materialRef.current} />
  );
};