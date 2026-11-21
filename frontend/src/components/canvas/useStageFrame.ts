import { useRef, useState } from 'react';
import { useFrame, type RenderCallback } from '@react-three/fiber';

/** Route our animation-loop exceptions back through React's visual-only boundary. */
export function useStageFrame(callback: RenderCallback, priority?: number) {
  const failed = useRef(false);
  const [error, setError] = useState<Error | null>(null);
  useFrame((state, delta, frame) => {
    if (failed.current) return;
    try { callback(state, delta, frame); }
    catch (cause) {
      failed.current = true;
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    }
  }, priority);
  if (error) throw error;
}
