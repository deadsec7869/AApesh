import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useStageFrame as useFrame } from '@/components/canvas/useStageFrame';
import { VisualEnergy } from '@/services/audio/AudioReactiveEngine';

interface CymaticsGridProps {
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
 * Cymatics Grid - Visualizer Mode 2
 *
 * A 3D grid of reactive cells that visualize frequency bins as height displacement.
 * Each cell represents a frequency band, creating a cymatics-like water surface pattern.
 */

const CYMATICS_VERTEX = `
  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uTreble;
  uniform float uTransient;
  uniform float uBeatEnergy;
  uniform float uReducedMotion;
  uniform float uGridSize;

  attribute float aFrequencyIndex; // 0-63 for 64 frequency bands

  varying vec3 vNormal;
  varying float vHeight;
  varying float vFreqIndex;
  varying vec2 vUv;

  // Hash for pseudo-random per-cell variation
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    vFreqIndex = aFrequencyIndex;
    vHeight = 0.0;

    vec3 pos = position;
    float motionSpeed = uReducedMotion > 0.5 ? 0.0 : 1.0;
    float time = uTime * 0.5 * motionSpeed;

    // Map frequency index to audio band
    float freqBand = aFrequencyIndex / 63.0; // 0-1

    // Select audio feature based on frequency band
    float audioLevel = mix(
      mix(uTreble, uMid, 0.5),  // High frequencies
      mix(uMid, uBass, 0.5),     // Low frequencies
      1.0 - freqBand
    );

    // Cell displacement
    float cellHash = hash(vec2(pos.x, pos.z) * 0.1);
    float phase = cellHash * 6.28;

    // Wave propagation from center
    float distFromCenter = length(pos.xz) / uGridSize;
    float wave = sin(distFromCenter * 12.0 - time * 3.0 + phase) * 0.5;
    wave *= audioLevel * 0.8;

    // Transient spikes
    float transientSpike = uTransient * (1.0 - distFromCenter) * cellHash * 2.0;

    // Beat pulse
    float beatPulse = uBeatEnergy * (1.0 - distFromCenter * 0.5) * 0.3;

    // Total height
    float height = wave + transientSpike + beatPulse;
    vHeight = height;

    pos.y += height;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const CYMATICS_FRAGMENT = `
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;
  uniform float uBass;
  uniform float uMid;
  uniform float uTreble;
  uniform float uTransient;
  uniform float uTime;
  uniform float uReducedMotion;

  varying vec3 vNormal;
  varying float vHeight;
  varying float vFreqIndex;
  varying vec2 vUv;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = vec3(0.0, 1.0, 0.0); // Top-down lighting

    // Frequency-based color
    vec3 freqColor = mix(
      mix(uSecondaryColor, uPrimaryColor, 0.5), // High freq
      uPrimaryColor,                             // Low freq
      1.0 - vFreqIndex
    );

    // Height-based intensity
    float heightIntensity = smoothstep(-0.5, 2.0, vHeight);
    vec3 color = freqColor * (0.3 + heightIntensity * 0.7);

    // Transient flash
    color += vec3(1.0) * uTransient * 0.5 * (1.0 - vFreqIndex);

    // Specular highlight on peaks
    float specular = pow(max(dot(normal, viewDir), 0.0), 32.0) * heightIntensity;
    color += vec3(1.0) * specular * 0.4;

    // Grid lines
    float gridLine = step(0.98, fract(vUv.x * 10.0)) + step(0.98, fract(vUv.y * 10.0));
    color = mix(color, vec3(0.0), gridLine * 0.3);

    // Reduced motion
    if (uReducedMotion > 0.5) {
      color = freqColor * 0.4;
    }

    float alpha = 0.6 + heightIntensity * 0.3;

    gl_FragColor = vec4(color, alpha);
  }
`;

const cymaticsUniforms = {
  uTime: { value: 0 },
  uBass: { value: 0.12 },
  uMid: { value: 0.12 },
  uTreble: { value: 0.10 },
  uTransient: { value: 0.0 },
  uBeatEnergy: { value: 0.0 },
  uReducedMotion: { value: 0 },
  uGridSize: { value: 10.0 },
  uPrimaryColor: { value: new THREE.Color('#f59e0b') },
  uSecondaryColor: { value: new THREE.Color('#3b82f6') },
};

export const CymaticsGrid: React.FC<CymaticsGridProps> = ({
  quality,
  reducedMotion,
  audioRefs,
  primaryColor,
  secondaryColor,
}) => {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);

  // Create grid geometry with frequency index attribute
  useMemo(() => {
    const gridSize = 10;
    const cellsPerSide = quality === 'high' ? 32 : quality === 'medium' ? 24 : 16;
    const cellSize = gridSize / cellsPerSide;
    const halfGrid = gridSize / 2;

    const positions: number[] = [];
    const indices: number[] = [];
    const frequencyIndices: number[] = [];
    const uvs: number[] = [];

    for (let z = 0; z < cellsPerSide; z++) {
      for (let x = 0; x < cellsPerSide; x++) {
        const cx = (x + 0.5) * cellSize - halfGrid;
        const cz = (z + 0.5) * cellSize - halfGrid;
        const freqIndex = (z * cellsPerSide + x) / (cellsPerSide * cellsPerSide - 1);

        // Four corners of the cell
        const hw = cellSize * 0.45;
        positions.push(
          cx - hw, 0, cz - hw,
          cx + hw, 0, cz - hw,
          cx + hw, 0, cz + hw,
          cx - hw, 0, cz + hw,
        );

        uvs.push(
          x / cellsPerSide, z / cellsPerSide,
          (x + 1) / cellsPerSide, z / cellsPerSide,
          (x + 1) / cellsPerSide, (z + 1) / cellsPerSide,
          x / cellsPerSide, (z + 1) / cellsPerSide,
        );

        for (let i = 0; i < 4; i++) {
          frequencyIndices.push(freqIndex);
        }

        const baseIdx = (z * cellsPerSide + x) * 4;
        indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
        indices.push(baseIdx, baseIdx + 2, baseIdx + 3);
      }
    }

    geometryRef.current = new THREE.BufferGeometry();
    geometryRef.current.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometryRef.current.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometryRef.current.setAttribute('aFrequencyIndex', new THREE.Float32BufferAttribute(frequencyIndices, 1));
    geometryRef.current.setIndex(indices);
    geometryRef.current.computeVertexNormals();
  }, [quality]);

  // Initialize material
  useMemo(() => {
    materialRef.current = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(cymaticsUniforms),
      vertexShader: CYMATICS_VERTEX,
      fragmentShader: CYMATICS_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }, []);

  // Update uniforms each frame
  useFrame((state, delta) => {
    if (!materialRef.current || !meshRef.current) return;

    const mat = materialRef.current;
    const features = audioRefs.features;
    const elapsed = state.clock.getElapsedTime();

    // Smooth color interpolation
    const lerpRate = Math.min(delta * 2.5, 1.0);
    mat.uniforms.uPrimaryColor.value.lerp(primaryColor, lerpRate);
    mat.uniforms.uSecondaryColor.value.lerp(secondaryColor, lerpRate);

    // Audio uniforms
    mat.uniforms.uTime.value = elapsed;
    mat.uniforms.uBass.value = reducedMotion ? 0.05 : features.bassEnergy;
    mat.uniforms.uMid.value = reducedMotion ? 0.05 : features.midEnergy;
    mat.uniforms.uTreble.value = reducedMotion ? 0.05 : (features.highMidEnergy || features.highEnergy);
    mat.uniforms.uTransient.value = reducedMotion ? 0.0 : features.transientEnergy;
    mat.uniforms.uBeatEnergy.value = reducedMotion ? 0.0 : features.beatEnergy;
    mat.uniforms.uReducedMotion.value = reducedMotion ? 1.0 : 0.0;

    // Gentle rotation
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.01 * (reducedMotion ? 0 : 1);
    }
  });

  if (!geometryRef.current || !materialRef.current) return null;

  return (
    <mesh ref={meshRef} geometry={geometryRef.current} material={materialRef.current} position={[0, -1.5, 0]} />
  );
};