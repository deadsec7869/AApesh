import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useUIStore } from '@/stores/useUIStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAudioReactive, createAudioReactiveRefs, useAudioReactiveUpdater } from '@/hooks/useAudioReactive';
import { getArtworkUrl } from '@/utils/artwork';

extend(THREE);

/**
 * LumnPrismStage — High-Craft 3D Liquid Glass Sculpture + Floating Artwork Card
 *
 * Default visualizer mode: A high-subdivision smooth refractive centerpiece
 * (MeshPhysicalMaterial with transmission, IOR 1.45, iridescence, clearcoat)
 * inside a RoomEnvironment with soft colored point lights matched to album palette.
 *
 * Features:
 * - Subtle mouse-parallax camera drift
 * - Beat-reactive organic vertex displacement via audioReactiveEngine
 * - Floating Liquid Glass Now-Playing Artwork Card in Stage mode
 * - Intro turn + idle sway rig (pivot > spin > holder > model)
 * - Demand render loop when paused/hidden (GPU idle guard)
 */

interface LumnPrismStageProps {
  visualQuality: 'high' | 'medium' | 'low' | 'off';
  reducedMotion: boolean;
  currentTrack: any;
  isPlaying: boolean;
  visualizerMode: 'lumn' | 'ferrofluid' | 'cymatics' | 'starfield' | 'stealth' | 'ripple';
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

  useEffect(() => {
    if (!ambientGlowEnabled || !currentTrack) return;

    let mounted = true;
    let animationId: number | null = null;

    const updateColors = async () => {
      const artworkUrl = getArtworkUrl(currentTrack) || currentTrack?.thumbnail;
      if (!artworkUrl) return;

      try {
        const { extractArtworkPalette } = await import('@/lib/colorExtractor');
        const palette = await extractArtworkPalette(artworkUrl, currentTrack.title);
        if (!mounted) return;

        const primary = palette.primary;
        const glowRgb = palette.glow.replace(/rgba?\(([^)]+)\)/, '$1').split(',').map(Number);
        const secondary = `rgb(${glowRgb[0]}, ${glowRgb[1]}, ${glowRgb[2]})`;

        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--lumn-primary', primary);
          document.documentElement.style.setProperty('--lumn-secondary', secondary);
          document.documentElement.style.setProperty('--lumn-glow', `rgba(${glowRgb[0]}, ${glowRgb[1]}, ${glowRgb[2]}, 0.12)`);
        }
      } catch (e) {
        console.warn('[LumnPrismStage] Color extraction failed:', e);
      }
    };

    updateColors();

    return () => {
      mounted = false;
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [currentTrack?.videoId, ambientGlowEnabled]);

  return null;
};

// High-subdivision icosahedron geometry for the prism
const PrismGeometry = () => {
  const geoRef = useRef<THREE.IcosahedronGeometry | null>(null);
  if (!geoRef.current) {
    geoRef.current = new THREE.IcosahedronGeometry(1, 128); // 128 subdivisions = ultra-smooth
  }
  return <primitive object={geoRef.current} />;
};

// Refractive Liquid Glass Material
const PrismMaterial: React.FC<{
  primaryColor: THREE.Color;
  secondaryColor: THREE.Color;
  audioRefs: ReturnType<typeof createAudioReactiveRefs>;
  quality: 'high' | 'medium' | 'low' | 'off';
}> = ({ primaryColor, secondaryColor, audioRefs, quality }) => {
  const materialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);

  useEffect(() => {
    if (!materialRef.current) {
      materialRef.current = new THREE.MeshPhysicalMaterial({
        transmission: 1,
        ior: 1.45,
        thickness: 1.2,
        iridescence: 0.4,
        iridescenceIOR: 1.3,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        roughness: 0.08,
        metalness: 0,
        envMapIntensity: 1,
        color: new THREE.Color(0xffffff),
        side: THREE.DoubleSide,
        flatShading: false,
      });
    }
    return () => {
      materialRef.current?.dispose();
      materialRef.current = null;
    };
  }, []);

  // Audio-reactive uniforms update
  useFrame(() => {
    if (!materialRef.current) return;

    const features = audioRefs.features;
    const low = features.bassEnergy;
    const mid = features.midEnergy;
    const high = features.highEnergy;

    // Subtle vertex displacement via iridescence shift
    const displacement = low * 0.15;
    materialRef.current.iridescence = 0.4 + displacement;
    materialRef.current.iridescenceIOR = 1.3 + mid * 0.1;

    // Color tint from artwork palette
    materialRef.current.color.lerp(primaryColor, mid * 0.05);
    materialRef.current.emissive?.set(secondaryColor).multiplyScalar(high * 0.02);
  });

  return (
    <meshPhysicalMaterial
      ref={materialRef}
      attach="material"
      transmission={1}
      ior={1.45}
      thickness={1.2}
      iridescence={0.4}
      iridescenceIOR={1.3}
      clearcoat={1}
      clearcoatRoughness={0.05}
      roughness={0.08}
      metalness={0}
      envMapIntensity={1}
      color={primaryColor}
      side={THREE.DoubleSide}
    />
  );
};

// Floating point lights matched to album palette
const PaletteLights: React.FC<{ primaryColor: THREE.Color; secondaryColor: THREE.Color }> = ({
  primaryColor,
  secondaryColor,
}) => {
  return (
    <>
      <pointLight
        position={[2.5, 3, 2.5]}
        color={primaryColor}
        intensity={1.2}
        decay={2}
        distance={10}
      />
      <pointLight
        position={[-2.5, 2, -2.5]}
        color={secondaryColor}
        intensity={0.8}
        decay={2}
        distance={10}
      />
      <pointLight
        position={[0, 4, 0]}
        color={primaryColor.clone().lerp(secondaryColor, 0.5)}
        intensity={0.5}
        decay={2}
        distance={15}
      />
    </>
  );
};

// Camera rig with intro turn + idle sway + mouse parallax
const CameraRig: React.FC<{
  reducedMotion: boolean;
  isPlaying: boolean;
}> = ({ reducedMotion, isPlaying }) => {
  const pivotRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const [introProgress, setIntroProgress] = useState(0);
  const [idleSway, setIdleSway] = useState({ yaw: 0, pitch: 0, lift: 0 });
  const [mouseParallax, setMouseParallax] = useState({ x: 0, y: 0 });
  const lastInputRef = useRef(performance.now());

  // Intro animation
  useEffect(() => {
    if (reducedMotion) {
      setIntroProgress(1);
      return;
    }
    let start = performance.now();
    const animate = () => {
      const elapsed = performance.now() - start;
      const progress = Math.min(1, elapsed / 1600);
      const eased = 1 - Math.pow(1 - progress, 3);
      setIntroProgress(eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [reducedMotion]);

  // Mouse parallax
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 0.3;
      const y = (e.clientY / window.innerHeight - 0.5) * 0.2;
      setMouseParallax({ x, y });
      lastInputRef.current = performance.now();
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  // Idle sway after 1.8s no input
  useFrame((_, delta) => {
    if (reducedMotion) return;

    const now = performance.now();
    const timeSinceInput = (now - lastInputRef.current) / 1000;
    const idle = !isPlaying || timeSinceInput > 1.8;

    // Sway parameters
    const swaySpeed = 0.55;
    const t = now / 1000 * swaySpeed;

    const targetSway = idle
      ? {
          yaw: Math.sin(t * 1.3 + 1) * 0.22,
          pitch: Math.sin(t) * 0.06,
          lift: Math.sin(t * 1.7) * 0.03,
        }
      : { yaw: 0, pitch: 0, lift: 0 };

    setIdleSway(prev => ({
      yaw: prev.yaw + (targetSway.yaw - prev.yaw) * (1 - Math.exp(-delta * (idle ? 1.2 : 6))),
      pitch: prev.pitch + (targetSway.pitch - prev.pitch) * (1 - Math.exp(-delta * (idle ? 1.2 : 6))),
      lift: prev.lift + (targetSway.lift - prev.lift) * (1 - Math.exp(-delta * (idle ? 1.2 : 6))),
    }));

    // Apply to rig
    if (pivotRef.current) {
      pivotRef.current.rotation.set(
        idleSway.pitch,
        (1 - introProgress) * -0.9 + idleSway.yaw,
        0
      );
      pivotRef.current.position.y = idleSway.lift;
      pivotRef.current.scale.setScalar(0.9 + 0.1 * introProgress);
    }

    // Mouse parallax on spin group
    if (spinRef.current) {
      spinRef.current.rotation.y = mouseParallax.x * 0.15;
      spinRef.current.rotation.x = -mouseParallax.y * 0.1;
    }
  });

  return (
    <group ref={pivotRef}>
      <group ref={spinRef}>
        <group rotation={[-Math.PI / 2, 0, 0]}> {/* fix orientation if needed */}
          <PrismGeometry />
          <PrismMaterial
            primaryColor={new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--lumn-primary') || '#f59e0b')}
            secondaryColor={new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--lumn-secondary') || '#3b82f6')}
            audioRefs={createAudioReactiveRefs()}
            quality="high"
          />
        </group>
      </group>
    </group>
  );
};

// Floating Liquid Glass Now-Playing Artwork Card
const NowPlayingCard: React.FC<{ currentTrack: any; isStageMode: boolean }> = ({
  currentTrack,
  isStageMode,
}) => {
  if (!isStageMode || !currentTrack) return null;

  const artworkUrl = getArtworkUrl(currentTrack) || currentTrack.thumbnail;

  return (
    <Html
      transform
      position={[0, -1.8, 2.5]}
      rotation={[-0.15, 0, 0]}
      style={{
        pointerEvents: 'none',
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        className="liquid-glass-strong"
        style={{
          width: '220px',
          aspectRatio: '1',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 24px 64px -16px rgba(0,0,0,0.7), 0 0 60px -10px rgba(var(--lumn-primary-rgb), 0.15)',
          transform: 'translateZ(0)',
        }}
      >
        <img
          src={artworkUrl}
          alt={currentTrack.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.9) saturate(1.1)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.6) 100%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            right: '16px',
            color: 'white',
            fontSize: '12px',
            fontWeight: 500,
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack.title}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist'}
          </div>
        </div>
      </div>
    </Html>
  );
};

export const LumnPrismStage: React.FC<LumnPrismStageProps> = ({
  visualQuality,
  reducedMotion,
  currentTrack,
  isPlaying,
  visualizerMode,
}) => {
  if (visualQuality === 'off' || visualizerMode !== 'lumn') return null;
  if (!currentTrack) return null;

  const primaryColor = useMemo(
    () => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--lumn-primary') || '#f59e0b'),
    []
  );
  const secondaryColor = useMemo(
    () => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--lumn-secondary') || '#3b82f6'),
    []
  );

  const audioRefs = useMemo(() => createAudioReactiveRefs(), []);
  const isStageMode = visualizerMode === 'lumn';

  const canvasDPR = visualQuality === 'high' ? [1, 1.25] : visualQuality === 'medium' ? [1, 1.25] : 1;
  const shouldUseDemandLoop = !isPlaying || typeof document !== 'undefined' && document.hidden;
  const frameloop = shouldUseDemandLoop ? 'demand' : 'always';

  return (
    <>
      <AudioUpdater refs={audioRefs} />
      <ColorSync currentTrack={currentTrack} />

      <Canvas
        camera={{ position: [0, 0, 8], fov: 45, near: 0.1, far: 100 }}
        dpr={canvasDPR as [number, number]}
        gl={{
          alpha: true,
          antialias: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        frameloop={frameloop}
        className="w-full h-full"
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          const onContextLost = (e: Event) => {
            e.preventDefault();
            console.warn('[LumnPrismStage] WebGL context lost');
          };
          const onContextRestored = () => {
            console.log('[LumnPrismStage] WebGL context restored');
          };
          canvas.addEventListener('webglcontextlost', onContextLost);
          canvas.addEventListener('webglcontextrestored', onContextRestored);
          return () => {
            canvas.removeEventListener('webglcontextlost', onContextLost);
            canvas.removeEventListener('webglcontextrestored', onContextRestored);
          };
        }}
      >
        {/* Environment for studio lighting */}
        <Environment
          preset="studio"
          background={false}
        />

        {/* Palette-matched point lights */}
        <PaletteLights primaryColor={primaryColor} secondaryColor={secondaryColor} />

        {/* Camera rig with intro + idle sway + mouse parallax */}
        <CameraRig reducedMotion={reducedMotion} isPlaying={isPlaying} />

        {/* Floating Now-Playing Artwork Card in Stage mode */}
        <NowPlayingCard currentTrack={currentTrack} isStageMode={isStageMode} />
      </Canvas>
    </>
  );
};