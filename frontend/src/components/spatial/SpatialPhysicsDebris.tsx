import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useStageFrame as useFrame } from '@/components/canvas/useStageFrame';
import { Physics, RigidBody, RapierRigidBody } from '@react-three/rapier';
import { audioReactiveEngine } from '@/services/audio/AudioReactiveEngine';
import { QualityProfile } from './qualitySettings';

interface SpatialPhysicsDebrisProps {
  quality: QualityProfile;
  reducedMotion: boolean;
  mouseRef: React.MutableRefObject<{ x: number; y: number; targetX: number; targetY: number }>;
}

interface DebrisItem {
  id: number;
  initialPos: [number, number, number];
  size: number;
  rotation: [number, number, number];
  color: string;
}

const SingleDebrisBody: React.FC<{
  item: DebrisItem;
  mouseRef: React.MutableRefObject<{ x: number; y: number; targetX: number; targetY: number }>;
  reducedMotion: boolean;
}> = ({ item, mouseRef, reducedMotion }) => {
  const rigidRef = useRef<RapierRigidBody>(null);
  const anchorPos = useMemo(() => new THREE.Vector3(...item.initialPos), [item.initialPos]);

  useFrame(() => {
    if (reducedMotion || !rigidRef.current) return;

    const translation = rigidRef.current.translation();
    const currentPos = new THREE.Vector3(translation.x, translation.y, translation.z);

    // 1. Soft tether restoring force to keep debris near its orbital home
    const distanceToAnchor = currentPos.distanceTo(anchorPos);
    if (distanceToAnchor > 0.4) {
      const returnDir = anchorPos.clone().sub(currentPos).normalize();
      const returnForce = returnDir.multiplyScalar(distanceToAnchor * 0.008);
      rigidRef.current.applyImpulse({ x: returnForce.x, y: returnForce.y, z: returnForce.z }, true);
    }

    // 2. Subtle pointer disturbance impulse (gentle wave)
    const mouse = mouseRef.current;
    const mouseSpatialPos = new THREE.Vector3(mouse.x * 3.5, mouse.y * 2.5, -2.0);
    const distToMouse = currentPos.distanceTo(mouseSpatialPos);

    if (distToMouse < 1.4) {
      const repelDir = currentPos.clone().sub(mouseSpatialPos).normalize();
      const features = audioReactiveEngine.getFeatures();
      const impulseStrength = (1.4 - distToMouse) * 0.003 * (1.0 + features.transient * 0.5);
      const impulse = repelDir.multiplyScalar(impulseStrength);
      rigidRef.current.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true);
    }
  });

  return (
    <RigidBody
      ref={rigidRef}
      position={item.initialPos}
      rotation={item.rotation}
      linearDamping={2.8}
      angularDamping={2.5}
      colliders="cuboid"
      canSleep
    >
      <mesh castShadow receiveShadow>
        <octahedronGeometry args={[item.size, 0]} />
        <meshStandardMaterial
          color={item.color}
          roughness={0.25}
          metalness={0.75}
          transparent
          opacity={0.35}
        />
      </mesh>
    </RigidBody>
  );
};

export const SpatialPhysicsDebris: React.FC<SpatialPhysicsDebrisProps> = ({
  quality,
  reducedMotion,
  mouseRef,
}) => {
  // Generate deterministic low-count debris around the artwork perimeter
  const items = useMemo<DebrisItem[]>(() => {
    if (!quality.enablePhysics || quality.physicsBodyCount <= 0 || reducedMotion) {
      return [];
    }

    const count = Math.min(quality.physicsBodyCount, 12);
    const debris: DebrisItem[] = [];
    const colors = ['#f8fafc', '#94a3b8', '#cbd5e1', '#e2e8f0'];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radiusX = 2.4 + (i % 3) * 0.35;
      const radiusY = 2.2 + ((i + 1) % 3) * 0.30;
      const x = Math.cos(angle) * radiusX;
      const y = Math.sin(angle) * radiusY;
      const z = -2.2 + (Math.sin(angle * 2) * 0.4);

      debris.push({
        id: i,
        initialPos: [x, y, z],
        size: 0.06 + (i % 3) * 0.02,
        rotation: [i * 0.4, i * 0.7, i * 0.2],
        color: colors[i % colors.length],
      });
    }

    return debris;
  }, [quality.enablePhysics, quality.physicsBodyCount, reducedMotion]);

  if (!quality.enablePhysics || items.length === 0 || reducedMotion) {
    return null;
  }

  return (
    <Physics gravity={[0, 0, 0]} paused={reducedMotion}>
      {items.map((item) => (
        <SingleDebrisBody
          key={item.id}
          item={item}
          mouseRef={mouseRef}
          reducedMotion={reducedMotion}
        />
      ))}
    </Physics>
  );
};
