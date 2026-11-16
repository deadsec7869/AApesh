import { useRef, useEffect } from 'react';
import { audioReactiveEngine, type VisualEnergy, type PlaybackTelemetry } from '@/services/audio/AudioReactiveEngine';
import { usePlayerStore } from '@/stores/usePlayerStore';

/**
 * useAudioReactive - Bridge between AudioReactiveEngine and R3F
 *
 * This hook runs the audio reactive engine at 60fps using useFrame (via R3F)
 * and exposes the latest visual energy features via a mutable ref.
 * NEVER triggers React state updates inside the animation loop.
 */

export interface AudioReactiveRefs {
  features: VisualEnergy;
  analysisMode: 'live_analyser' | 'ambient';
  isLiveAudioActive: boolean;
}

export function createAudioReactiveRefs(): AudioReactiveRefs {
  return {
    features: {
      bassEnergy: 0.12,
      midEnergy: 0.12,
      highEnergy: 0.10,
      overallEnergy: 0.12,
      transientEnergy: 0.0,
      beatEnergy: 0.0,
      lowMidEnergy: 0.12,
      highMidEnergy: 0.12,
    },
    analysisMode: 'ambient',
    isLiveAudioActive: false,
  };
}

/**
 * Hook to be used inside R3F Canvas (useFrame)
 * Updates the refs with latest audio features each frame
 */
export function useAudioReactiveUpdater(refs: AudioReactiveRefs) {
  const { isPlaying, isBuffering, currentTime, duration, volume, isMuted, currentTrack } = usePlayerStore();

  useEffect(() => {
    // Reset transient state on track change
    audioReactiveEngine.resetTransientState();
  }, [currentTrack?.videoId]);

  // This will be called from useFrame in the R3F canvas
  return (delta: number) => {
    const telemetry: PlaybackTelemetry = {
      isPlaying,
      isBuffering,
      currentTime,
      duration,
      volume: isMuted ? 0 : volume,
      trackId: currentTrack?.videoId,
    };

    const energy = audioReactiveEngine.update(delta, telemetry);

    // Mutate refs directly (no React re-render)
    refs.features = energy;
    refs.analysisMode = audioReactiveEngine.getAnalysisMode();
    refs.isLiveAudioActive = audioReactiveEngine.isLiveAudioActive();
  };
}

/**
 * Hook for components that need to read audio features (outside useFrame)
 * Returns a stable ref object that updates every frame
 */
export function useAudioReactive(): AudioReactiveRefs {
  const refs = useRef<AudioReactiveRefs>(createAudioReactiveRefs());
  const updater = useAudioReactiveUpdater(refs.current);

  // The actual frame update happens in SoundstageCanvas via useFrame
  // This hook just provides access to the refs
  return refs.current;
}

/**
 * Initialize audio context on first user interaction
 * Call this from a click handler or useEffect with user gesture
 */
export function initAudioContext(): void {
  audioReactiveEngine.setAmbientMode(false);
}

/**
 * Set ambient mode (calm, non-pulsing)
 */
export function setAmbientMode(enabled: boolean): void {
  audioReactiveEngine.setAmbientMode(enabled);
}