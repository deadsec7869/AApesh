import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useStageFrame as useFrame } from '@/components/canvas/useStageFrame';
import { VisualEnergy } from '@/services/audio/AudioReactiveEngine';

interface FerrofluidCoreProps {
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
 * Ferrofluid Core - Visualizer Mode 1
 *
 * A deformable acoustic wave mesh that reacts to:
 * - Sub-bass (20-120Hz): Core expansion/contraction
 * - Midrange vocals (250Hz-2kHz): Surface deformation waves
 * - High-hat transients (4kHz-16kHz): Surface sparkle/ripples
 *
 * Tinted dynamically by primaryColor (from artwork palette)
 */

const FERROFLUID_VERTEX = `
  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uTreble;
  uniform float uTransient;
  uniform float uBeatEnergy;
  uniform float uReducedMotion;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  // Simplex noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 0.5;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    vec4 ns = 0.142857142857 * D - p * p * p * p;
    vec4 j = p - 49.0 * p * p * p * p * p;
    vec4 x_ = vec4(x0.x, x1.x, x2.x, x3.x) + j * ns;
    vec4 y_ = vec4(x0.y, x1.y, x2.y, x3.y) + j * ns;
    vec4 z_ = vec4(x0.z, x1.z, x2.z, x3.z) + j * ns;
    vec4 t = 0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3));
    t = t * t;
    t = t * t;
    vec4 n_ = t * t * vec4(
      dot(x_, vec4(x0.x, x1.x, x2.x, x3.x)) +
      dot(y_, vec4(x0.y, x1.y, x2.y, x3.y)) +
      dot(z_, vec4(x0.z, x1.z, x2.z, x3.z)));
    return 42.0 * dot(n_, ns);
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;

    vec3 pos = position;
    float motionSpeed = uReducedMotion > 0.5 ? 0.0 : 1.0;
    float time = uTime * 0.3 * motionSpeed;

    // Bass-driven radial expansion
    float bassExpansion = 1.0 + uBass * 0.35 + uTransient * 0.25 + uBeatEnergy * 0.15;

    // Mid-driven surface waves
    float midWaves = uMid * 0.18;

    // Treble-driven fine detail
    float trebleDetail = uTreble * 0.08;

    // Noise-based deformation
    float n1 = snoise(pos * 1.5 + vec3(time * 0.4, time * 0.3, time * 0.5));
    float n2 = snoise(pos * 2.8 + vec3(-time * 0.3, time * 0.6, -time * 0.4));
    float n3 = snoise(pos * 5.0 + time * 0.8);

    // Combine noise layers
    float displacement = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
    displacement *= midWaves + trebleDetail;

    // Apply radial expansion
    float radius = length(pos);
    float radialFactor = smoothstep(0.3, 1.0, radius);
    pos = normalize(pos) * (radius * bassExpansion + displacement * radialFactor);

    // Transient attack spikes
    pos += normal * uTransient * 0.15 * radialFactor;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FERROFLUID_FRAGMENT = `
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;
  uniform float uBass;
  uniform float uMid;
  uniform float uTreble;
  uniform float uTransient;
  uniform float uTime;
  uniform float uReducedMotion;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);

    // Fresnel effect
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);

    // Base color mix
    float colorMix = smoothstep(-0.5, 0.5, vPosition.y);
    vec3 baseColor = mix(uPrimaryColor, uSecondaryColor, colorMix);

    // Bass glow from center
    float centerGlow = 1.0 - smoothstep(0.0, 0.8, length(vPosition.xz));
    vec3 bassColor = uPrimaryColor * centerGlow * uBass * 0.6;

    // Transient highlights
    vec3 transientHighlight = vec3(1.0) * uTransient * 0.4;

    // Rim lighting
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);
    vec3 rimColor = uSecondaryColor * rim * 0.3;

    // Fresnel glow
    vec3 fresnelColor = mix(uPrimaryColor, uSecondaryColor, 0.5) * fresnel * 0.4;

    // Combine
    vec3 finalColor = baseColor + bassColor + transientHighlight + rimColor + fresnelColor;

    // Subtle pulsing opacity
    float alpha = 0.75 + uBass * 0.15 + uTransient * 0.1;

    // Reduced motion: static appearance
    if (uReducedMotion > 0.5) {
      finalColor = baseColor;
      alpha = 0.6;
    }

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const ferrofluidUniforms = {
  uTime: { value: 0 },
  uBass: { value: 0.12 },
  uMid: { value: 0.12 },
  uTreble: { value: 0.10 },
  uTransient: { value: 0.0 },
  uBeatEnergy: { value: 0.0 },
  uReducedMotion: { value: 0 },
  uPrimaryColor: { value: new THREE.Color('#f59e0b') },
  uSecondaryColor: { value: new THREE.Color('#3b82f6') },
};

export const FerrofluidCore: React.FC<FerrofluidCoreProps> = ({
  quality,
  reducedMotion,
  audioRefs,
  primaryColor,
  secondaryColor,
}) => {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const geometryRef = useRef<THREE.SphereGeometry | null>(null);

  // Create geometry based on quality
  useMemo(() => {
    const segments = quality === 'high' ? 64 : quality === 'medium' ? 48 : 32;
    geometryRef.current = new THREE.SphereGeometry(1.8, segments, segments);
  }, [quality]);

  // Initialize material
  useMemo(() => {
    materialRef.current = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(ferrofluidUniforms),
      vertexShader: FERROFLUID_VERTEX,
      fragmentShader: FERROFLUID_FRAGMENT,
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

    // Slow rotation
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.02 * (reducedMotion ? 0 : 1);
      meshRef.current.rotation.x += delta * 0.01 * (reducedMotion ? 0 : 1);
    }
  });

  if (!geometryRef.current || !materialRef.current) return null;

  return (
    <mesh ref={meshRef} geometry={geometryRef.current} material={materialRef.current} />
  );
};