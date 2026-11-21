import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useStageFrame as useFrame } from '@/components/canvas/useStageFrame';
import gsap from 'gsap';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { getHighestResArtworkUrl } from '@/components/layout/DynamicArtworkBackground';
import { loadSpatialTexture, createShadowTexture } from './useSpatialArtworkTexture';
import { audioReactiveEngine } from '@/services/audio/AudioReactiveEngine';
import { QualityProfile } from './qualitySettings';
import { CinematicLightingController } from './cinematicLighting';

interface ArtworkCard3DProps {
  quality: QualityProfile;
  reducedMotion: boolean;
  mouseRef: React.MutableRefObject<{ x: number; y: number; targetX: number; targetY: number }>;
  lightingController: CinematicLightingController;
}

const ArtworkCardShader = {
  uniforms: {
    uTexturePrev: { value: null as THREE.Texture | null },
    uTextureCurrent: { value: null as THREE.Texture | null },
    uCrossfade: { value: 1.0 },
    uDarken: { value: 0.0 },
    uTime: { value: 0.0 },
    uEnergy: { value: 0.12 },
    uBass: { value: 0.12 },
    uEnableDistortion: { value: 1.0 },
    uLightColor: { value: new THREE.Color('#f8fafc') },
    uGlowColor: { value: new THREE.Color('#6366f1') },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uEnergy;
    uniform float uBass;
    uniform float uEnableDistortion;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);

      vec3 pos = position;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexturePrev;
    uniform sampler2D uTextureCurrent;
    uniform float uCrossfade;
    uniform float uDarken;
    uniform float uTime;
    uniform float uEnergy;
    uniform float uEnableDistortion;
    uniform vec3 uLightColor;
    uniform vec3 uGlowColor;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vec2 uv = vUv;

      vec4 texPrev = texture2D(uTexturePrev, clamp(uv, 0.001, 0.999));
      vec4 texCurr = texture2D(uTextureCurrent, clamp(uv, 0.001, 0.999));

      vec4 baseColor = mix(texPrev, texCurr, clamp(uCrossfade, 0.0, 1.0));

      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(vec3(0.5, 0.8, 1.2));
      float diff = max(dot(normal, lightDir), 0.0);
      
      vec3 viewDir = normalize(vViewPosition);
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(dot(normal, halfDir), 0.0), 36.0) * 0.18;
      float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0) * 0.32;

      vec3 finalRgb = baseColor.rgb * (0.82 + 0.18 * diff) + (uLightColor * spec) + (uGlowColor * rim * 0.40);

      // Vignette on card surface
      vec2 centerUv = (vUv - 0.5) * 2.0;
      float vignette = 1.0 - dot(centerUv, centerUv) * 0.06;
      finalRgb *= clamp(vignette, 0.90, 1.0);

      // Darken modifier for text readability (Lyrics/Queue mode)
      finalRgb *= (1.0 - uDarken * 0.70);

      gl_FragColor = vec4(finalRgb, baseColor.a);
    }
  `,
};

export const ArtworkCard3D: React.FC<ArtworkCard3DProps> = ({
  quality,
  reducedMotion,
  mouseRef,
  lightingController,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const shadowMeshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const shadowTexRef = useRef<THREE.Texture | null>(null);

  // Player subscriptions (low frequency)
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlayerExpanded = usePlayerStore((s) => s.isPlayerExpanded);
  const fullscreenTab = usePlayerStore((s) => s.fullscreenTab);
  const isLyricsOpen = usePlayerStore((s) => s.isLyricsOpen);
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);
  const isAboutOpen = usePlayerStore((s) => s.isAboutOpen);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  // Target spatial transformation state managed smoothly by GSAP
  const transformRef = useRef({
    posX: 0,
    posY: 0,
    posZ: -2.0,
    scale: 0.75,
    darken: 0.15,
  });

  const lastArtworkUrlRef = useRef<string | null>(null);
  const crossfadeTimelineRef = useRef<gsap.core.Tween | null>(null);
  const modeTimelineRef = useRef<gsap.core.Timeline | null>(null);

  // 1. Initialize custom ShaderMaterial and shadow texture
  useEffect(() => {
    shadowTexRef.current = createShadowTexture();

    return () => {
      shadowTexRef.current?.dispose();
      crossfadeTimelineRef.current?.kill();
      modeTimelineRef.current?.kill();
    };
  }, []);

  // 2. Track Change: GSAP smooth crossfade (700ms–1100ms)
  const currentArtworkUrl = getHighestResArtworkUrl(currentTrack);

  useEffect(() => {
    if (!materialRef.current) return;
    if (currentArtworkUrl === lastArtworkUrlRef.current) return;

    lastArtworkUrlRef.current = currentArtworkUrl || null;
    const mat = materialRef.current;

    loadSpatialTexture(currentArtworkUrl).then((newTexture) => {
      if (!materialRef.current) return;

      const currentTex = mat.uniforms.uTextureCurrent.value;
      if (currentTex) {
        mat.uniforms.uTexturePrev.value = currentTex;
        mat.uniforms.uTextureCurrent.value = newTexture;
        mat.uniforms.uCrossfade.value = 0.0;

        crossfadeTimelineRef.current?.kill();
        crossfadeTimelineRef.current = gsap.to(mat.uniforms.uCrossfade, {
          value: 1.0,
          duration: 0.95,
          ease: 'power2.inOut',
        });
      } else {
        mat.uniforms.uTexturePrev.value = newTexture;
        mat.uniforms.uTextureCurrent.value = newTexture;
        mat.uniforms.uCrossfade.value = 1.0;
      }
    });
  }, [currentArtworkUrl]);

  // 3. View Mode Transitions: GSAP smooth spatial animation
  useEffect(() => {
    let targetX = 0;
    let targetY = 0;
    let targetZ = -2.0;
    let targetScale = 0.75;
    let targetDarken = 0.15;

    if (isPlayerExpanded) {
      // In fullscreen player, the central cover is rendered crisp and dominant in Layer B
      // The 3D background card smoothly yields to avoid duplication
      targetX = 0;
      targetY = 0;
      targetZ = -4.0;
      targetScale = 0.0;
      targetDarken = 1.0;
    } else if (isLyricsOpen) {
      targetX = -1.2;
      targetY = 0;
      targetZ = -2.2;
      targetScale = 0.65;
      targetDarken = 0.65;
    } else if (isQueueOpen) {
      targetX = -0.8;
      targetY = 0;
      targetZ = -1.8;
      targetScale = 0.70;
      targetDarken = 0.35;
    }

    modeTimelineRef.current?.kill();
    modeTimelineRef.current = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.85 } });

    modeTimelineRef.current.to(transformRef.current, {
      posX: targetX,
      posY: targetY,
      posZ: targetZ,
      scale: targetScale,
      darken: targetDarken,
    });
  }, [isPlayerExpanded, fullscreenTab, isLyricsOpen, isQueueOpen]);

  // 4. Per-frame musical breathing & pointer parallax (useFrame)
  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    const features = audioReactiveEngine.getFeatures();
    const elapsed = state.clock.getElapsedTime();

    // Context reactivity multiplier
    let reactivity = 0.28;
    if (isAboutOpen) {
      reactivity = 0.15;
    } else if (isPlayerExpanded) {
      if (fullscreenTab === 'lyrics') reactivity = 0.45;
      else if (fullscreenTab === 'queue') reactivity = 0.65;
      else if (fullscreenTab === 'video') reactivity = 0.15;
      else reactivity = 1.0;
    } else if (isLyricsOpen) {
      reactivity = 0.45;
    } else if (isQueueOpen) {
      reactivity = 0.65;
    }

    if (reducedMotion) {
      reactivity = 0.0;
    }

    const mouse = mouseRef.current;
    const playSpeed = reducedMotion ? 0 : isPlaying ? 1.0 : 0.15;
    const idleFloatY = Math.sin(elapsed * 0.8 * playSpeed) * 0.05;
    const idleFloatX = Math.cos(elapsed * 0.6 * playSpeed) * 0.03;
    const idleRotZ = Math.sin(elapsed * 0.5 * playSpeed) * 0.012;

    // Musical depth & scale breathing (1–2% max scale change)
    const musicScale = 1.0 + features.overall * 0.02 * reactivity;
    const targetScale = transformRef.current.scale * musicScale;
    const depthReactive = (features.bass * 0.08 + features.transient * 0.05) * reactivity;

    const mesh = meshRef.current;
    mesh.position.x += (transformRef.current.posX + idleFloatX + mouse.x * 0.12 - mesh.position.x) * 0.06;
    mesh.position.y += (transformRef.current.posY + idleFloatY + mouse.y * 0.10 - mesh.position.y) * 0.06;
    mesh.position.z += (transformRef.current.posZ + depthReactive - mesh.position.z) * 0.06;

    const currScale = mesh.scale.x;
    const nextScale = currScale + (targetScale - currScale) * 0.06;
    mesh.scale.set(nextScale, nextScale, nextScale);

    // Subtle 3D rotation & parallax (0.5 to 1.5 degrees max)
    const musicRotZ = (Math.sin(elapsed * 1.5) * features.bass * 0.012) * reactivity;
    const musicRotX = (Math.cos(elapsed * 1.1) * features.mid * 0.014) * reactivity;
    const targetRotY = reducedMotion ? 0 : mouse.x * 0.08 + Math.sin(elapsed * 0.4 * playSpeed) * 0.018;
    const targetRotX = reducedMotion ? 0 : -mouse.y * 0.06 + Math.cos(elapsed * 0.3 * playSpeed) * 0.018 + musicRotX;

    mesh.rotation.y += (targetRotY - mesh.rotation.y) * 0.05;
    mesh.rotation.x += (targetRotX - mesh.rotation.x) * 0.05;
    mesh.rotation.z += (idleRotZ + musicRotZ - mesh.rotation.z) * 0.05;

    // Update shadow plane position & scale
    if (shadowMeshRef.current) {
      const shadow = shadowMeshRef.current;
      shadow.position.x = mesh.position.x;
      shadow.position.y = mesh.position.y - 0.25 * nextScale;
      shadow.position.z = mesh.position.z - 0.08;
      shadow.scale.set(nextScale * 1.12, nextScale * 1.12, 1);
    }

    // Update shader uniforms
    const mat = materialRef.current;
    mat.uniforms.uTime.value = elapsed;
    mat.uniforms.uEnergy.value = features.overall;
    mat.uniforms.uBass.value = features.bass;
    mat.uniforms.uEnableDistortion.value = quality.enableShaderDistortion ? 1.0 : 0.0;

    // Darken interpolation
    const currDarken = mat.uniforms.uDarken.value;
    mat.uniforms.uDarken.value += (transformRef.current.darken - currDarken) * 0.08;

    // Lighting updates
    const lighting = lightingController.update(delta, features, reactivity, quality.bloomStrength);
    mat.uniforms.uLightColor.value.copy(lighting.primaryColor);
    mat.uniforms.uGlowColor.value.copy(lighting.secondaryColor);
  });

  return (
    <group>
      {/* 3D Floating Artwork Mesh (with subtle thickness) */}
      <mesh ref={meshRef} position={[0, 0, -2.0]}>
        <boxGeometry args={[3.2, 3.2, 0.08, 16, 16, 1]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={THREE.UniformsUtils.clone(ArtworkCardShader.uniforms)}
          vertexShader={ArtworkCardShader.vertexShader}
          fragmentShader={ArtworkCardShader.fragmentShader}
          transparent
        />
      </mesh>

      {/* Soft Contact Floor Shadow Plane */}
      {shadowTexRef.current && (
        <mesh ref={shadowMeshRef} position={[0, -0.15, -2.1]}>
          <planeGeometry args={[3.8, 3.8]} />
          <meshBasicMaterial
            map={shadowTexRef.current}
            transparent
            opacity={0.42}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};
