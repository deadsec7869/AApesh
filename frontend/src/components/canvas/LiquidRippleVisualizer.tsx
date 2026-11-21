import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VisualStageBoundary } from '@/components/canvas/VisualStageBoundary';
import { CanvasErrorBoundary } from '@/components/canvas/CanvasErrorBoundary';
import { StageRenderScheduler } from '@/components/canvas/StageRenderScheduler';
import { useUIStore } from '@/stores/useUIStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAudioReactive, createAudioReactiveRefs, useAudioReactiveUpdater } from '@/hooks/useAudioReactive';
import { extractArtworkPalette } from '@/lib/colorExtractor';
import { getArtworkUrl } from '@/utils/artwork';
import { audioReactiveEngine } from '@/services/audio/AudioReactiveEngine';

extend(THREE);

/**
 * LiquidRippleVisualizer - Full-viewport R3F Liquid Ripple Visualizer
 *
 * Renders the active track's high-res album artwork onto a displaced WebGL plane
 * with smooth, beat-reactive horizontal fluid wave distortion driven by
 * audioReactiveEngine (falling back cleanly to static artwork in Stealth Mode
 * or on WebGL context loss).
 *
 * Syncs ambient lighting and accent CSS variables (--accent-primary, --accent-secondary)
 * dynamically to the current track's artwork palette.
 */

interface LiquidRippleVisualizerProps {
  className?: string;
}

const AudioUpdater: React.FC<{ refs: ReturnType<typeof createAudioReactiveRefs> }> = ({ refs }) => {
  const updater = useAudioReactiveUpdater(refs);
  useFrame((_, delta) => {
    updater(delta);
  });
  return null;
};

const ColorSync: React.FC<{ currentTrack: any }> = ({ currentTrack }) => {
  const { ambientGlowEnabled } = useUIStore();
  const [primaryColor, setPrimaryColor] = useState<THREE.Color>(new THREE.Color('#f5c042'));
  const [secondaryColor, setSecondaryColor] = useState<THREE.Color>(new THREE.Color('#38bdf8'));

  useEffect(() => {
    if (!ambientGlowEnabled || !currentTrack) return;

    let mounted = true;
    let animationId: number;

    const updateColors = async () => {
      const artworkUrl = getArtworkUrl(currentTrack) || (currentTrack?.thumbnail ?? null);
      if (!artworkUrl) return;

      try {
        const palette = await extractArtworkPalette(artworkUrl, currentTrack.title);
        if (!mounted) return;

        const primary = new THREE.Color(palette.primary);
        const glowRgb = palette.glow.replace(/rgba?\(([^)]+)\)/, '$1').split(',').map(Number);
        const secondary = new THREE.Color(`rgb(${glowRgb[0]}, ${glowRgb[1]}, ${glowRgb[2]})`);

        const animateColor = (from: THREE.Color, to: THREE.Color, setter: (c: THREE.Color) => void) => {
          let progress = 0;
          const duration = 800;
          const startTime = performance.now();

          const step = () => {
            if (!mounted) return;
            progress = Math.min(1, (performance.now() - startTime) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            const temp = from.clone().lerp(to, eased);
            setter(temp);
            if (progress < 1) {
              animationId = requestAnimationFrame(step);
            }
          };
          step();
        };

        animateColor(primaryColor, primary, setPrimaryColor);
        animateColor(secondaryColor, secondary, setSecondaryColor);
      } catch (e) {
        console.warn('Color extraction failed:', e);
      }
    };

    updateColors();

    return () => {
      mounted = false;
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [currentTrack?.videoId, ambientGlowEnabled]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--aura-primary', primaryColor.getStyle());
      document.documentElement.style.setProperty('--aura-secondary', secondaryColor.getStyle());
      document.documentElement.style.setProperty('--accent-primary', primaryColor.getStyle());
      document.documentElement.style.setProperty('--accent-secondary', secondaryColor.getStyle());
    }
  }, [primaryColor, secondaryColor]);

  return null;
};

const RipplePlane: React.FC<{
  currentTrack: any;
  visualQuality: 'high' | 'medium' | 'low' | 'off';
  reducedMotion: boolean;
  audioRefs: ReturnType<typeof createAudioReactiveRefs>;
  primaryColor: THREE.Color;
  secondaryColor: THREE.Color;
  className?: string;
}> = ({
  currentTrack,
  visualQuality,
  reducedMotion,
  audioRefs,
  primaryColor,
  secondaryColor,
  className,
}) => {
  const planeRef = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>>(null);
  const artworkUrl = getArtworkUrl(currentTrack) || (currentTrack?.thumbnail ?? null);

  const RIPPLE_VERTEX = `
    varying vec2 vUv;
    uniform float uTime;
    uniform float uBeatEnergy;
    uniform float uBass;
    uniform float uReducedMotion;
    uniform float uWaveAmplitude;
    uniform float uWaveFrequency;

    // Pseudo-random hash
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    // Smooth noise
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    // Fractal Brownian Motion
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      return value;
    }

    void main() {
      vUv = uv;
      vec3 pos = position;

      float motionSpeed = uReducedMotion > 0.5 ? 0.0 : 1.0;
      if (motionSpeed > 0.0) {
        // Horizontal fluid wave distortion
        float wave = sin(vUv.x * uWaveFrequency * 10.0 - uTime * 1.5) * 0.5;
        wave += sin(vUv.x * uWaveFrequency * 5.0 - uTime * 0.8 + 1.5) * 0.3;
        wave += fbm(vUv * 2.0 + uTime * 0.3) * 0.2;

        // Beat-reactive amplitude modulation
        float beatBoost = 1.0 + uBeatEnergy * 2.0;
        wave *= uWaveAmplitude * beatBoost;

        // Bass-responsive vertical displacement
        float bassWave = uBass * 0.3 * sin(vUv.x * 20.0 - uTime * 2.0);
        pos.y += wave + bassWave;

        // Horizontal flow
        pos.x += sin(vUv.y * 10.0 - uTime * 0.5) * 0.02 * uBass;
      }

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const RIPPLE_FRAGMENT = `
    uniform sampler2D uArtwork;
    uniform vec3 uPrimaryColor;
    uniform vec3 uSecondaryColor;
    uniform float uTime;
    uniform float uBeatEnergy;
    uniform float uBass;
    uniform float uReducedMotion;

    varying vec2 vUv;

    void main() {
      // Sample artwork
      vec4 texColor = texture2D(uArtwork, vUv);

      // Subtle color grading based on audio
      float beatPulse = uBeatEnergy * 0.15;
      vec3 color = texColor.rgb;

      // Subtle color shift towards accent colors on beat
      color = mix(color, uPrimaryColor, beatPulse * 0.3);
      color = mix(color, uSecondaryColor, beatPulse * 0.15);

      // Subtle vignette
      float vignette = 1.0 - length(vUv - 0.5) * 0.6;
      color *= vignette;

      // Reduced motion: static
      if (uReducedMotion > 0.5) {
        color = texColor.rgb * 0.9;
      }

      float alpha = 1.0;
      gl_FragColor = vec4(color, alpha);
    }
  `;

  const rippleUniforms = useMemo(() => ({
    uArtwork: { value: null as THREE.Texture<HTMLImageElement, THREE.TextureEventMap> | null },
    uTime: { value: 0 },
    uBeatEnergy: { value: 0.12 },
    uBass: { value: 0.12 },
    uReducedMotion: { value: 0 },
    uWaveAmplitude: { value: 0.08 },
    uWaveFrequency: { value: 1.0 },
    uPrimaryColor: { value: new THREE.Color('#f5c042') },
    uSecondaryColor: { value: new THREE.Color('#38bdf8') },
  }), []);

  const [artworkTexture, setArtworkTexture] = useState<THREE.Texture<HTMLImageElement, THREE.TextureEventMap> | null>(null as THREE.Texture<HTMLImageElement, THREE.TextureEventMap> | null);
  const [textureError, setTextureError] = useState(false);

  // Load artwork texture
  useEffect(() => {
    if (!currentTrack) return;

    const url = getArtworkUrl(currentTrack) || (currentTrack?.thumbnail ?? null);
    if (!url) {
      setTextureError(true);
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      url,
      (texture) => {
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        setArtworkTexture(texture as unknown as THREE.Texture<HTMLImageElement, THREE.TextureEventMap> | null);
        setTextureError(false);
        rippleUniforms.uArtwork.value = texture;
      },
      undefined,
      (err) => {
        console.warn('Failed to load artwork texture:', err);
        setTextureError(true);
      }
    );
  }, [currentTrack?.videoId]);

  // Update uniforms each frame
  useFrame((state, delta) => {
    if (!planeRef.current?.material) return;

    const mat = planeRef.current.material as THREE.ShaderMaterial;
    const features = audioRefs.features;
    const elapsed = state.clock.getElapsedTime();

    // Update time and audio-reactive uniforms
    mat.uniforms.uTime.value = elapsed;
    mat.uniforms.uBeatEnergy.value = reducedMotion ? 0.05 : features.beatEnergy;
    mat.uniforms.uBass.value = features.bassEnergy;
    mat.uniforms.uReducedMotion.value = reducedMotion ? 1.0 : 0.0;

    // Slow color interpolation
    const lerpRate = Math.min(delta * 1.0, 1.0);
    mat.uniforms.uPrimaryColor.value.lerp(primaryColor, lerpRate);
    mat.uniforms.uSecondaryColor.value.lerp(secondaryColor, lerpRate);
  });

  const dpr = useMemo(() => {
    if (typeof window === 'undefined') return 1;
    if (visualQuality === 'off') return 0;
    const baseDpr = Math.min(window.devicePixelRatio, 2);
    switch (visualQuality) {
      case 'high': return Math.min(baseDpr, 1.5);
      case 'medium': return Math.min(baseDpr, 1.25);
      case 'low': return 1;
      default: return 1;
    }
  }, [visualQuality]);

  if (!currentTrack) return null;

  return (
    <VisualStageBoundary>
      <CanvasErrorBoundary fallback={<StaticArtworkFallback artworkUrl={getArtworkUrl(currentTrack) || (currentTrack?.thumbnail ?? null)} />}>
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}
          style={{ zIndex: 'var(--z-backdrop)' }}
        >
          <Canvas
            camera={{ position: [0, 0, 3], fov: 45, near: 0.1, far: 100 }}
            dpr={dpr}
            gl={{
              alpha: true,
              antialias: true,
              powerPreference: 'high-performance',
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.0,
            }}
            frameloop="always"
            className="w-full h-full"
          >
            <StageRenderScheduler reducedMotion={reducedMotion} />
            <ColorSync currentTrack={currentTrack} />

            <mesh
              ref={planeRef}
              geometry={new THREE.PlaneGeometry(4, 4 * 9 / 16)}
              material={new THREE.ShaderMaterial({
                uniforms: rippleUniforms,
                vertexShader: RIPPLE_VERTEX,
                fragmentShader: RIPPLE_FRAGMENT,
                transparent: true,
                depthWrite: false,
              })}
            />
            <ColorSync currentTrack={currentTrack} />
          </Canvas>
        </div>
      </CanvasErrorBoundary>
    </VisualStageBoundary>
  );
};

const StaticArtworkFallback: React.FC<{ artworkUrl: string | null }> = ({ artworkUrl }) => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    style={{
      zIndex: 'var(--z-backdrop)',
      backgroundImage: artworkUrl ? `url(${artworkUrl})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      opacity: 0.4,
    }}
  >
    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90" />
  </div>
);

interface LiquidRippleVisualizerProps {
  className?: string;
}

export const LiquidRippleVisualizer: React.FC<LiquidRippleVisualizerProps> = ({ className = '' }) => {
  const visualQuality = useUIStore(s => s.visualQuality);
  const visualizerMode = useUIStore(s => s.visualizerMode);
  const currentTrack = usePlayerStore(s => s.currentTrack);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      const visible = !document.hidden;
      setIsTabVisible(visible);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Only render in 'ripple' mode
  if (visualizerMode !== 'ripple') return null;
  if (!currentTrack) return null;

  const audioRefs = useMemo(() => createAudioReactiveRefs(), []);
  const primaryColor = useMemo(() => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--aura-primary') || '#f5c042'), []);
  const secondaryColor = useMemo(() => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--aura-secondary') || '#38bdf8'), []);

  const canvasDPR = useMemo(() => {
    if (typeof window === 'undefined') return 1;
    if (visualQuality === 'off') return 0;
    const baseDpr = Math.min(window.devicePixelRatio, 2);
    switch (visualQuality) {
      case 'high': return Math.min(baseDpr, 1.5);
      case 'medium': return Math.min(baseDpr, 1.25);
      case 'low': return 1;
      default: return 1;
    }
  }, [visualQuality]);

  const onCreated = ({ gl }: { gl: THREE.WebGLRenderer }) => {
    const canvas = gl.domElement;

    const onContextLost = (e: Event) => {
      e.preventDefault(); // Allow context restoration
      console.warn('[LiquidRippleVisualizer] WebGL context lost');
      try {
        audioReactiveEngine.setAmbientMode(true);
      } catch {}
      try {
        useUIStore.getState().setVisualizerMode('stealth');
      } catch {}
      gl.setAnimationLoop(null);
    };

    const onContextRestored = () => {
      console.log('[LiquidRippleVisualizer] WebGL context restored');
      try {
        audioReactiveEngine.setAmbientMode(false);
      } catch {}
    };

    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
    };
  };

  return (
    <VisualStageBoundary>
      <CanvasErrorBoundary fallback={<StaticArtworkFallback artworkUrl={getArtworkUrl(currentTrack) || (currentTrack?.thumbnail ?? null)} />}>
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}
          style={{ zIndex: 'var(--z-backdrop)' }}
        >
          <Canvas
            camera={{ position: [0, 0, 3], fov: 45, near: 0.1, far: 100 }}
            dpr={canvasDPR}
            gl={{
              alpha: true,
              antialias: true,
              powerPreference: 'high-performance',
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.0,
            }}
            frameloop={isTabVisible ? 'always' : 'never'}
            onCreated={onCreated}
            className="w-full h-full"
          >
            <StageRenderScheduler reducedMotion={reducedMotion} />
            <RipplePlane
              currentTrack={currentTrack}
              visualQuality={visualQuality}
              reducedMotion={reducedMotion}
              audioRefs={audioRefs}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
            />
            <ColorSync currentTrack={currentTrack} />
          </Canvas>
        </div>
      </CanvasErrorBoundary>
    </VisualStageBoundary>
  );
};

export default LiquidRippleVisualizer;