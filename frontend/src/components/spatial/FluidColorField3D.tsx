import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { audioReactiveEngine } from '@/services/audio/AudioReactiveEngine';
import { QualityProfile } from './qualitySettings';

interface FluidColorField3DProps {
  quality: QualityProfile;
  reducedMotion: boolean;
}

const FluidColorShader = {
  uniforms: {
    uTime: { value: 0.0 },
    uBass: { value: 0.12 },
    uMid: { value: 0.12 },
    uTreble: { value: 0.10 },
    uTransient: { value: 0.0 },
    uColorPrimary: { value: new THREE.Color('#f59e0b') },
    uColorSecondary: { value: new THREE.Color('#3b82f6') },
    uIsPlaying: { value: 1.0 },
    uReducedMotion: { value: 0.0 },
    uExpansion: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uBass;
    uniform float uMid;
    uniform float uTreble;
    uniform float uTransient;
    uniform vec3 uColorPrimary;
    uniform vec3 uColorSecondary;
    uniform float uIsPlaying;
    uniform float uReducedMotion;
    uniform float uExpansion;

    varying vec2 vUv;
    varying vec3 vPosition;

    // Organic 2D Simplex/Perlin noise helper
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                          0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                         -0.577350269189626,  // -1.0 + 2.0 * C.x
                          0.024390243902439); // 1.0 / 41.0
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
            + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 uv = (vUv - 0.5) * 2.0;
      float dist = length(uv);

      // Animation time slowed down when reduced motion or paused
      float motionSpeed = uReducedMotion > 0.5 ? 0.0 : (0.15 + 0.85 * uIsPlaying);
      float time = uTime * 0.40 * motionSpeed;

      // Multi-layer organic domain warping
      vec2 flow1 = vec2(
        snoise(uv * 1.2 + vec2(time * 0.5, time * 0.3)),
        snoise(uv * 1.2 + vec2(-time * 0.4, time * 0.6))
      ) * (0.28 + 0.22 * uMid);

      vec2 flow2 = vec2(
        snoise(uv * 2.4 + flow1 + time * 0.8),
        snoise(uv * 2.4 - flow1 - time * 0.7)
      ) * (0.18 + 0.16 * uTreble);

      float n1 = snoise((uv + flow1 + flow2) * 1.4);
      float n2 = snoise((uv - flow1 + flow2 * 0.5) * 2.2 + time * 0.3);
      float organicPattern = 0.5 + 0.5 * (n1 * 0.65 + n2 * 0.35);

      // Bass expansion: expands color field softly around center
      float bassRadius = 0.85 + (uBass * 0.45 + uTransient * 0.25) * uExpansion;
      float radialFalloff = smoothstep(bassRadius, 0.15, dist);

      // Subtle center cutout so central cover is crisp and unclouded
      float centerDampen = smoothstep(0.18, 0.48, dist);

      // Color blending between artwork primary and glow accent
      float colorMix = clamp(organicPattern + flow1.x * 0.4, 0.0, 1.0);
      vec3 color = mix(uColorPrimary, uColorSecondary, colorMix);

      // Transient attack pulse
      vec3 transientHighlight = vec3(1.0) * (uTransient * 0.35);
      color += transientHighlight;

      // Dynamic opacity
      float alpha = radialFalloff * centerDampen * (0.45 + 0.40 * uBass + 0.25 * uTransient) * (0.35 + 0.65 * uIsPlaying);

      // Edge vignette softening
      alpha *= smoothstep(1.3, 0.4, dist);

      gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.85));
    }
  `,
};

export const FluidColorField3D: React.FC<FluidColorField3DProps> = ({
  quality,
  reducedMotion,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const atmospherePalette = usePlayerStore((s) => s.atmospherePalette);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isPlayerExpanded = usePlayerStore((s) => s.isPlayerExpanded);

  // Target colors smoothly lerped
  const targetPrimaryRef = useRef(new THREE.Color('#f59e0b'));
  const targetSecondaryRef = useRef(new THREE.Color('#3b82f6'));

  useEffect(() => {
    if (atmospherePalette?.primary) {
      try {
        const p = atmospherePalette.primary;
        if (p.startsWith('rgba')) {
          const rgb = p.replace('rgba', 'rgb').replace(/,[^,)]+\)/, ')');
          targetPrimaryRef.current.set(rgb);
        } else {
          targetPrimaryRef.current.set(p);
        }
      } catch {}
    }

    if (atmospherePalette?.glow) {
      try {
        const g = atmospherePalette.glow;
        if (g.startsWith('rgba')) {
          const rgb = g.replace('rgba', 'rgb').replace(/,[^,)]+\)/, ')');
          targetSecondaryRef.current.set(rgb);
        } else {
          targetSecondaryRef.current.set(g);
        }
      } catch {}
    }
  }, [atmospherePalette]);

  useFrame((state, delta) => {
    if (!materialRef.current || !meshRef.current) return;

    const mat = materialRef.current;
    const features = audioReactiveEngine.getFeatures();
    const elapsed = state.clock.getElapsedTime();

    // Smooth color interpolation towards target palette (duration ~800ms)
    const lerpRate = Math.min(delta * 3.2, 1.0);
    mat.uniforms.uColorPrimary.value.lerp(targetPrimaryRef.current, lerpRate);
    mat.uniforms.uColorSecondary.value.lerp(targetSecondaryRef.current, lerpRate);

    // Uniform updates
    mat.uniforms.uTime.value = elapsed;
    mat.uniforms.uBass.value = reducedMotion ? 0.05 : features.bass;
    mat.uniforms.uMid.value = reducedMotion ? 0.05 : features.mid;
    mat.uniforms.uTreble.value = reducedMotion ? 0.05 : features.treble;
    mat.uniforms.uTransient.value = reducedMotion ? 0.0 : features.transient;
    mat.uniforms.uReducedMotion.value = reducedMotion ? 1.0 : 0.0;

    // Smooth play/pause transition
    const targetPlay = isPlaying ? 1.0 : 0.2;
    mat.uniforms.uIsPlaying.value += (targetPlay - mat.uniforms.uIsPlaying.value) * 0.08;

    // Scale expansion: gentle pulsing with bass
    const baseScale = isPlayerExpanded ? 5.8 : 4.4;
    const pulseScale = baseScale * (1.0 + (reducedMotion ? 0 : features.bass * 0.06 + features.transient * 0.04));
    meshRef.current.scale.set(pulseScale, pulseScale, 1.0);

    // Subtle breathing z-depth
    meshRef.current.position.z = -1.2 + (features.bass * 0.08);
  });

  if (!quality.enabled) {
    return null;
  }

  return (
    <mesh ref={meshRef} position={[0, 0, -1.2]}>
      <planeGeometry args={[2.8, 2.8, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={THREE.UniformsUtils.clone(FluidColorShader.uniforms)}
        vertexShader={FluidColorShader.vertexShader}
        fragmentShader={FluidColorShader.fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};
