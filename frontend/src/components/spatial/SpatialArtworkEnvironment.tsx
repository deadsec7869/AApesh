import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { getHighestResArtworkUrl } from '@/components/layout/DynamicArtworkBackground';
import {
  loadSpatialTexture,
  createParticleTexture,
  createShadowTexture,
  clearTextureCache,
} from './useSpatialArtworkTexture';
import { audioReactiveEngine } from '@/services/audio/AudioReactiveEngine';
import { QUALITY_PROFILES, VisualQuality } from './qualitySettings';
import { CinematicLightingController } from './cinematicLighting';

/**
 * Phase 3 Cinematic Shader for 3D Album Artwork Card.
 * Features:
 * - Seamless dual-texture crossfading (prev -> current)
 * - Energy-aware low-amplitude fluid UV/vertex distortion (on artwork mesh only)
 * - Physical lighting, specular sheen, and dynamic ambient glow
 * - Soft vignette and view-context darkening (Lyrics/Queue focus)
 */
const CinematicArtworkCardShader = {
  uniforms: {
    uTexturePrev: { value: null as THREE.Texture | null },
    uTextureCurrent: { value: null as THREE.Texture | null },
    uCrossfade: { value: 1.0 },
    uDarken: { value: 0.0 },
    uTime: { value: 0.0 },
    uEnergy: { value: 0.15 },
    uBass: { value: 0.15 },
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

      // Extremely subtle fluid wave distortion on front face of card
      if (uEnableDistortion > 0.5 && pos.z > 0.0) {
        float wave1 = sin(pos.x * 2.0 + uTime * 1.5) * 0.02 * uEnergy;
        float wave2 = cos(pos.y * 2.0 + uTime * 1.2) * 0.02 * uBass;
        pos.z += wave1 + wave2;
      }

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

      // Subtle organic UV refraction wave (barely visible)
      if (uEnableDistortion > 0.5) {
        float uvDistort = sin(uv.y * 8.0 + uTime * 1.2) * 0.003 * uEnergy;
        uv.x += uvDistort;
      }

      // Sample both textures with clamped UV
      vec4 texPrev = texture2D(uTexturePrev, clamp(uv, 0.001, 0.999));
      vec4 texCurr = texture2D(uTextureCurrent, clamp(uv, 0.001, 0.999));

      // Smooth cubic crossfade mix
      vec4 baseColor = mix(texPrev, texCurr, clamp(uCrossfade, 0.0, 1.0));

      // Cinematic lighting calculation
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(vec3(0.5, 0.8, 1.2));
      float diff = max(dot(normal, lightDir), 0.0);
      
      vec3 viewDir = normalize(vViewPosition);
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * 0.16;
      float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0) * 0.28;

      vec3 finalRgb = baseColor.rgb * (0.84 + 0.16 * diff) + (uLightColor * spec) + (uGlowColor * rim * 0.45);

      // Subtle edge vignette
      vec2 centerUv = (vUv - 0.5) * 2.0;
      float vignette = 1.0 - dot(centerUv, centerUv) * 0.08;
      finalRgb *= clamp(vignette, 0.88, 1.0);

      // Context Darken modifier (for Lyrics / Queue readability)
      finalRgb *= (1.0 - uDarken * 0.65);

      gl_FragColor = vec4(finalRgb, baseColor.a);
    }
  `,
};

export const SpatialArtworkEnvironment: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Performance subscriptions
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const atmospherePalette = usePlayerStore((s) => s.atmospherePalette);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const isPlayerExpanded = usePlayerStore((s) => s.isPlayerExpanded);
  const isLyricsOpen = usePlayerStore((s) => s.isLyricsOpen);
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);
  const fullscreenTab = usePlayerStore((s) => s.fullscreenTab);
  const { ambientGlow, visualQuality } = useThemeStore();

  const telemetryRef = useRef({
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    trackId: currentTrack?.videoId,
    isPlayerExpanded,
    fullscreenTab,
    isLyricsOpen,
    isQueueOpen,
  });

  useEffect(() => {
    telemetryRef.current = {
      isPlaying,
      isBuffering,
      currentTime,
      duration,
      volume,
      trackId: currentTrack?.videoId,
      isPlayerExpanded,
      fullscreenTab,
      isLyricsOpen,
      isQueueOpen,
    };
  }, [isPlaying, isBuffering, currentTime, duration, volume, currentTrack?.videoId, isPlayerExpanded, fullscreenTab, isLyricsOpen, isQueueOpen]);

  // Three.js instances ref
  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    composer: EffectComposer | null;
    bloomPass: UnrealBloomPass | null;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    artworkMesh: THREE.Mesh;
    shadowMesh: THREE.Mesh;
    artworkMaterial: THREE.ShaderMaterial;
    particlesFar: THREE.Points;
    particlesNear: THREE.Points;
    ambientRing: THREE.Mesh;
    ambientLight: THREE.AmbientLight;
    pointLight: THREE.PointLight;
    lightingController: CinematicLightingController;
    crossfadeStart: number;
    crossfadeDuration: number;
    isTransitioning: boolean;
    mouse: { x: number; y: number; targetX: number; targetY: number };
    targetCardPos: THREE.Vector3;
    targetCardScale: number;
    targetCameraZ: number;
    targetDarken: number;
    targetParticleOpacity: number;
    quality: VisualQuality;
    reducedMotion: boolean;
    rafId: number | null;
  } | null>(null);

  const lastArtworkUrlRef = useRef<string | null>(null);

  // Initialize Three.js WebGL Scene with Post-Processing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const profile = QUALITY_PROFILES[visualQuality] || QUALITY_PROFILES.high;

    // 1. WebGL Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch (e) {
      console.warn('[SpatialArtworkEnvironment] WebGL init fallback:', e);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.maxPixelRatio));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // 2. Scene & Perspective Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(0, 0, 7.5);

    // 3. Post-Processing Pipeline (Composer)
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;

    if (profile.enablePostProcessing) {
      try {
        composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        if (profile.enableBloom) {
          bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            profile.bloomStrength,
            profile.bloomRadius,
            profile.bloomThreshold
          );
          composer.addPass(bloomPass);
        }

        const outputPass = new OutputPass();
        composer.addPass(outputPass);
      } catch (err) {
        console.warn('[SpatialArtworkEnvironment] PostProcessing fallback:', err);
        composer = null;
      }
    }

    // 4. Dynamic 3D Artwork Card
    const cardGeo = new THREE.BoxGeometry(3.2, 3.2, 0.08, 16, 16, 1);
    const artworkMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(CinematicArtworkCardShader.uniforms),
      vertexShader: CinematicArtworkCardShader.vertexShader,
      fragmentShader: CinematicArtworkCardShader.fragmentShader,
      transparent: true,
    });
    artworkMaterial.uniforms.uEnableDistortion.value = profile.enableShaderDistortion ? 1.0 : 0.0;
    const artworkMesh = new THREE.Mesh(cardGeo, artworkMaterial);
    artworkMesh.position.set(0, 0, -0.5);
    scene.add(artworkMesh);

    // 5. Soft Floor Shadow Mesh
    const shadowGeo = new THREE.PlaneGeometry(3.8, 3.8);
    const shadowTex = createShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.set(0, -0.15, -0.6);
    scene.add(shadowMesh);

    // 6. Atmospheric Particles Layer 1: Far Dust Field
    const particleTex = createParticleTexture();
    const countFar = profile.particlesFarCount;
    const posFar = new Float32Array(countFar * 3);
    for (let i = 0; i < countFar * 3; i += 3) {
      posFar[i] = (Math.random() - 0.5) * 14;
      posFar[i + 1] = (Math.random() - 0.5) * 10;
      posFar[i + 2] = -3 - Math.random() * 6; // z: -3 to -9
    }
    const geoFar = new THREE.BufferGeometry();
    geoFar.setAttribute('position', new THREE.BufferAttribute(posFar, 3));
    const matFar = new THREE.PointsMaterial({
      size: 0.18,
      map: particleTex,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particlesFar = new THREE.Points(geoFar, matFar);
    scene.add(particlesFar);

    // 7. Atmospheric Particles Layer 2: Near Atmospheric Dust Motes
    const countNear = profile.particlesNearCount;
    const posNear = new Float32Array(countNear * 3);
    for (let i = 0; i < countNear * 3; i += 3) {
      posNear[i] = (Math.random() - 0.5) * 10;
      posNear[i + 1] = (Math.random() - 0.5) * 7;
      posNear[i + 2] = 0.5 + Math.random() * 3.5; // z: 0.5 to 4
    }
    const geoNear = new THREE.BufferGeometry();
    geoNear.setAttribute('position', new THREE.BufferAttribute(posNear, 3));
    const matNear = new THREE.PointsMaterial({
      size: 0.12,
      map: particleTex,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particlesNear = new THREE.Points(geoNear, matNear);
    scene.add(particlesNear);

    // 8. Ambient Atmospheric Geometry: Deep Ring
    const ringGeo = new THREE.TorusGeometry(4.5, 0.015, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.04,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ambientRing = new THREE.Mesh(ringGeo, ringMat);
    ambientRing.position.set(0, 0, -5.5);
    ambientRing.rotation.x = Math.PI * 0.3;
    scene.add(ambientRing);

    // 9. Cinematic Lighting Controller
    const lightingController = new CinematicLightingController();
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.2, 18);
    pointLight.position.set(3, 4, 4);
    scene.add(pointLight);

    // Reduced motion media query check
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reducedMotion = motionQuery.matches;

    threeRef.current = {
      renderer,
      composer,
      bloomPass,
      scene,
      camera,
      artworkMesh,
      shadowMesh,
      artworkMaterial,
      particlesFar,
      particlesNear,
      ambientRing,
      ambientLight,
      pointLight,
      lightingController,
      crossfadeStart: 0,
      crossfadeDuration: 1000,
      isTransitioning: false,
      mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
      targetCardPos: new THREE.Vector3(0, 0, -2.0),
      targetCardScale: 0.75,
      targetCameraZ: 7.5,
      targetDarken: 0.15,
      targetParticleOpacity: 0.28,
      quality: visualQuality,
      reducedMotion,
      rafId: null,
    };

    // Parallax mouse movement handler (passive)
    const handleMouseMove = (e: MouseEvent) => {
      if (!threeRef.current || threeRef.current.reducedMotion) return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      threeRef.current.mouse.targetX = nx;
      threeRef.current.mouse.targetY = ny;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Resize handler
    const handleResize = () => {
      if (!threeRef.current) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      threeRef.current.camera.aspect = w / h;
      threeRef.current.camera.updateProjectionMatrix();
      threeRef.current.renderer.setSize(w, h);
      threeRef.current.composer?.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Render Loop
    let clock = new THREE.Clock();
    let isTabVisible = true;

    const renderLoop = () => {
      if (!threeRef.current) return;
      const state = threeRef.current;
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      if (isTabVisible) {
        const tel = telemetryRef.current;
        // Update Audio Reactive Engine with current playback telemetry
        const energy = audioReactiveEngine.update(delta, {
          isPlaying: tel.isPlaying,
          isBuffering: tel.isBuffering,
          currentTime: tel.currentTime,
          duration: tel.duration,
          volume: tel.volume,
          trackId: tel.trackId,
        });

        // Calculate view context reactivity multiplier:
        // - Fullscreen Artwork: 1.0 (100% full immersion)
        // - Fullscreen Lyrics / Side Lyrics: 0.5 (calm, lyrics focused)
        // - Fullscreen Queue / Side Queue: 0.7 (readable)
        // - Fullscreen Video: 0.20
        // - Normal Workspace (Home/Search/Library): 0.28 (subtle atmospheric breathing)
        let reactivityMultiplier = 0.28;
        if (tel.isPlayerExpanded) {
          if (tel.fullscreenTab === 'lyrics') {
            reactivityMultiplier = 0.50;
          } else if (tel.fullscreenTab === 'queue') {
            reactivityMultiplier = 0.70;
          } else if (tel.fullscreenTab === 'video') {
            reactivityMultiplier = 0.20;
          } else {
            reactivityMultiplier = 1.0;
          }
        } else if (tel.isLyricsOpen) {
          reactivityMultiplier = 0.50;
        } else if (tel.isQueueOpen) {
          reactivityMultiplier = 0.70;
        }

        if (state.reducedMotion) {
          reactivityMultiplier = 0.0;
        }

        // 1. Mouse Parallax Interpolation (Restrained lerp)
        state.mouse.x += (state.mouse.targetX - state.mouse.x) * 0.05;
        state.mouse.y += (state.mouse.targetY - state.mouse.y) * 0.05;

        // 2. Playback state speed modifier
        const playSpeed = state.reducedMotion ? 0 : tel.isPlaying ? 1.0 : 0.15;
        const idleFloatY = Math.sin(elapsed * 0.8 * playSpeed) * 0.06;
        const idleFloatX = Math.cos(elapsed * 0.6 * playSpeed) * 0.04;
        const idleRotZ = Math.sin(elapsed * 0.5 * playSpeed) * 0.015;

        // 3. Smoothly animate artwork card transform with subtle musical breathing (1–2% max)
        const musicScale = 1.0 + energy.overallEnergy * 0.022 * reactivityMultiplier;
        const targetScale = state.targetCardScale * musicScale;
        const depthReactive = (energy.bassEnergy * 0.08 + energy.transientEnergy * 0.05) * reactivityMultiplier;

        state.artworkMesh.position.x += (state.targetCardPos.x + idleFloatX + state.mouse.x * 0.12 - state.artworkMesh.position.x) * 0.06;
        state.artworkMesh.position.y += (state.targetCardPos.y + idleFloatY + state.mouse.y * 0.10 - state.artworkMesh.position.y) * 0.06;
        state.artworkMesh.position.z += (state.targetCardPos.z + depthReactive - state.artworkMesh.position.z) * 0.06;

        const currentScale = state.artworkMesh.scale.x;
        const nextScale = currentScale + (targetScale - currentScale) * 0.06;
        state.artworkMesh.scale.set(nextScale, nextScale, nextScale);

        // Card subtle 3D tilt + musical micro-rotation (0.5 to 1.5 deg max)
        const musicRotZ = (Math.sin(elapsed * 1.5) * energy.bassEnergy * 0.012) * reactivityMultiplier;
        const musicRotX = (Math.cos(elapsed * 1.1) * energy.midEnergy * 0.015) * reactivityMultiplier;
        const targetRotY = state.reducedMotion ? 0 : state.mouse.x * 0.08 + Math.sin(elapsed * 0.4 * playSpeed) * 0.02;
        const targetRotX = state.reducedMotion ? 0 : -state.mouse.y * 0.06 + Math.cos(elapsed * 0.3 * playSpeed) * 0.02 + musicRotX;

        state.artworkMesh.rotation.y += (targetRotY - state.artworkMesh.rotation.y) * 0.05;
        state.artworkMesh.rotation.x += (targetRotX - state.artworkMesh.rotation.x) * 0.05;
        state.artworkMesh.rotation.z += (idleRotZ + musicRotZ - state.artworkMesh.rotation.z) * 0.05;

        // Shadow follows card
        state.shadowMesh.position.x = state.artworkMesh.position.x;
        state.shadowMesh.position.y = state.artworkMesh.position.y - 0.25 * nextScale;
        state.shadowMesh.position.z = state.artworkMesh.position.z - 0.1;
        state.shadowMesh.scale.set(nextScale * 1.1, nextScale * 1.1, 1);

        // 4. Update Cinematic Lighting & Shaders
        const lightState = state.lightingController.update(
          delta,
          energy,
          reactivityMultiplier,
          profile.bloomStrength
        );

        state.ambientLight.intensity = lightState.ambientIntensity;
        state.ambientLight.color.copy(lightState.primaryColor);

        state.pointLight.intensity = lightState.pointIntensity;
        state.pointLight.color.copy(lightState.secondaryColor);

        state.artworkMaterial.uniforms.uTime.value = elapsed;
        state.artworkMaterial.uniforms.uEnergy.value = energy.overallEnergy;
        state.artworkMaterial.uniforms.uBass.value = energy.bassEnergy;
        state.artworkMaterial.uniforms.uLightColor.value.copy(lightState.primaryColor);
        state.artworkMaterial.uniforms.uGlowColor.value.copy(lightState.secondaryColor);

        if (state.bloomPass) {
          state.bloomPass.strength = lightState.bloomStrength;
        }

        // Darken factor interpolation
        const currentDarken = state.artworkMaterial.uniforms.uDarken.value;
        state.artworkMaterial.uniforms.uDarken.value += (state.targetDarken - currentDarken) * 0.08;

        // 5. Crossfade Animation Progress
        if (state.isTransitioning) {
          const now = performance.now();
          const progress = Math.min(1.0, (now - state.crossfadeStart) / state.crossfadeDuration);
          const eased = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
          state.artworkMaterial.uniforms.uCrossfade.value = eased;
          if (progress >= 1.0) {
            state.isTransitioning = false;
          }
        }

        // 6. Particle Drifting with energy modulation
        if (!state.reducedMotion) {
          const energyFarSpeed = 0.012 * playSpeed * (1.0 + energy.overallEnergy * 0.4 * reactivityMultiplier);
          state.particlesFar.rotation.y = elapsed * energyFarSpeed;
          state.particlesFar.rotation.x = Math.sin(elapsed * 0.008 * playSpeed) * 0.05;

          const energyNearSpeed = 0.018 * playSpeed * (1.0 + energy.highEnergy * 0.5 * reactivityMultiplier);
          state.particlesNear.rotation.y = -elapsed * energyNearSpeed;
          state.particlesNear.rotation.x = Math.cos(elapsed * 0.012 * playSpeed) * 0.04;

          state.ambientRing.rotation.z = elapsed * 0.02 * playSpeed;

          // Camera micro-drift (heavily damped, forward on bass surge, NO camera shake)
          const camTargetZ = state.targetCameraZ - energy.bassEnergy * 0.06 * reactivityMultiplier;
          state.camera.position.z += (camTargetZ - state.camera.position.z) * 0.05;
        }

        // Particle opacity interpolation
        const matFar = state.particlesFar.material as THREE.PointsMaterial;
        const targetFarOpacity = (state.targetParticleOpacity * 0.80 + energy.bassEnergy * 0.20 * reactivityMultiplier);
        matFar.opacity += (targetFarOpacity - matFar.opacity) * 0.05;
        matFar.color.copy(lightState.secondaryColor);

        const matNear = state.particlesNear.material as THREE.PointsMaterial;
        const targetNearOpacity = (state.targetParticleOpacity * 0.85 + energy.highEnergy * 0.25 * reactivityMultiplier);
        matNear.opacity += (targetNearOpacity - matNear.opacity) * 0.05;
        matNear.color.copy(lightState.primaryColor);

        // 7. Render Scene via Post-Processing Composer (or fallback to basic renderer)
        if (state.composer) {
          state.composer.render();
        } else {
          state.renderer.render(state.scene, state.camera);
        }
      }

      state.rafId = requestAnimationFrame(renderLoop);
    };

    if (threeRef.current) {
      threeRef.current.rafId = requestAnimationFrame(renderLoop);
    }

    // Visibility API listener to pause WebGL rendering on background tab
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (threeRef.current?.rafId) {
        cancelAnimationFrame(threeRef.current.rafId);
      }

      // Complete Resource Cleanup
      cardGeo.dispose();
      shadowGeo.dispose();
      geoFar.dispose();
      geoNear.dispose();
      ringGeo.dispose();

      artworkMaterial.dispose();
      shadowMat.dispose();
      matFar.dispose();
      matNear.dispose();
      ringMat.dispose();

      particleTex.dispose();
      shadowTex.dispose();
      clearTextureCache();

      composer?.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      threeRef.current = null;
    };
  }, [visualQuality]);

  // Update 3D Texture on Track Change (Smooth 600-1200ms crossfade)
  const currentArtworkUrl = getHighestResArtworkUrl(currentTrack);

  useEffect(() => {
    if (!threeRef.current) return;
    if (currentArtworkUrl === lastArtworkUrlRef.current) return;

    lastArtworkUrlRef.current = currentArtworkUrl || null;
    const state = threeRef.current;

    loadSpatialTexture(currentArtworkUrl).then((newTexture) => {
      if (!threeRef.current) return;

      const currentTex = state.artworkMaterial.uniforms.uTextureCurrent.value;
      if (currentTex) {
        state.artworkMaterial.uniforms.uTexturePrev.value = currentTex;
        state.artworkMaterial.uniforms.uTextureCurrent.value = newTexture;
        state.artworkMaterial.uniforms.uCrossfade.value = 0.0;
        state.crossfadeStart = performance.now();
        state.crossfadeDuration = 900; // Cinematic 900ms smooth blend
        state.isTransitioning = true;
      } else {
        state.artworkMaterial.uniforms.uTexturePrev.value = newTexture;
        state.artworkMaterial.uniforms.uTextureCurrent.value = newTexture;
        state.artworkMaterial.uniforms.uCrossfade.value = 1.0;
        state.isTransitioning = false;
      }
    });
  }, [currentArtworkUrl]);

  // Update Lighting Controller from ArtworkPalette
  useEffect(() => {
    if (!threeRef.current) return;
    threeRef.current.lightingController.updatePalette(atmospherePalette);
  }, [atmospherePalette]);

  // Dynamic View & State Modulation (Normal vs Fullscreen Artwork vs Lyrics vs Queue)
  useEffect(() => {
    if (!threeRef.current) return;
    const state = threeRef.current;

    if (isPlayerExpanded) {
      if (fullscreenTab === 'lyrics') {
        // FULLSCREEN LYRICS: Darken 3D environment, reduce movement, focus on synced lyrics
        state.targetCardPos.set(-1.0, 0.2, -1.8);
        state.targetCardScale = 0.75;
        state.targetCameraZ = 8.0;
        state.targetDarken = 0.70;
        state.targetParticleOpacity = 0.16;
      } else if (fullscreenTab === 'queue') {
        // FULLSCREEN QUEUE: Shifted, moderate depth
        state.targetCardPos.set(-0.8, 0.2, -1.5);
        state.targetCardScale = 0.80;
        state.targetCameraZ = 7.6;
        state.targetDarken = 0.40;
        state.targetParticleOpacity = 0.24;
      } else if (fullscreenTab === 'video') {
        // FULLSCREEN VIDEO: Darken background
        state.targetCardPos.set(0, 0, -2.8);
        state.targetCardScale = 0.60;
        state.targetCameraZ = 8.5;
        state.targetDarken = 0.80;
        state.targetParticleOpacity = 0.10;
      } else {
        // FULLSCREEN ARTWORK (Cover Mode): Maximum artwork presence, physical floating object feel
        state.targetCardPos.set(0, 0.35, 0.2);
        state.targetCardScale = 1.05;
        state.targetCameraZ = 6.8;
        state.targetDarken = 0.0;
        state.targetParticleOpacity = 0.45;
      }
    } else if (isLyricsOpen) {
      // Normal UI with Side Lyrics open
      state.targetCardPos.set(-1.2, 0, -2.2);
      state.targetCardScale = 0.65;
      state.targetCameraZ = 7.8;
      state.targetDarken = 0.65;
      state.targetParticleOpacity = 0.15;
    } else if (isQueueOpen) {
      // Normal UI with Side Queue open
      state.targetCardPos.set(-0.8, 0, -1.8);
      state.targetCardScale = 0.70;
      state.targetCameraZ = 7.6;
      state.targetDarken = 0.35;
      state.targetParticleOpacity = 0.22;
    } else {
      // Normal AAPESH Workspace (Home, Search, Library, etc.)
      state.targetCardPos.set(0, 0, -2.0);
      state.targetCardScale = 0.75;
      state.targetCameraZ = 7.5;
      state.targetDarken = 0.15;
      state.targetParticleOpacity = 0.28;
    }
  }, [isPlayerExpanded, fullscreenTab, isLyricsOpen, isQueueOpen, isBuffering]);

  if (!ambientGlow) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ zIndex: 0 }}
      className="pointer-events-none fixed inset-0 overflow-hidden select-none"
    />
  );
};
