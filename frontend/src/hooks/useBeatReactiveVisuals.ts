import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import {
  audioReactiveEngine,
  AudioFeatures,
  AudioAnalysisMode,
  PlaybackTelemetry,
} from '@/services/audio/AudioReactiveEngine';

/**
 * Hook for beat-reactive visual controllers.
 * Provides zero-allocation mutable features ref for 60fps renders
 * and maintains an animation fallback loop when WebGL is absent or disabled.
 */
export function useBeatReactiveVisuals(options?: { enableFallbackLoop?: boolean }) {
  const { enableFallbackLoop = false } = options || {};

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);

  const featuresRef = useRef<AudioFeatures>(audioReactiveEngine.getFeatures());
  const [analysisMode, setAnalysisMode] = useState<AudioAnalysisMode>(
    audioReactiveEngine.getAnalysisMode()
  );
  const [isLiveAudio, setIsLiveAudio] = useState(audioReactiveEngine.isLiveAudioActive());

  const lastTrackIdRef = useRef<string | null>(null);

  // Sync live audio & mode when track or source changes
  useEffect(() => {
    setIsLiveAudio(audioReactiveEngine.isLiveAudioActive());
    setAnalysisMode(audioReactiveEngine.getAnalysisMode());
  }, [currentTrack?.videoId]);

  // Reset transient detection state cleanly when song changes
  useEffect(() => {
    const currentId = currentTrack?.videoId || null;
    if (currentId !== lastTrackIdRef.current) {
      lastTrackIdRef.current = currentId;
      audioReactiveEngine.resetTransientState();
    }
  }, [currentTrack?.videoId]);

  // Fallback persistent animation loop (used when WebGL is disabled or for DOM CSS reactive styles)
  useEffect(() => {
    if (!enableFallbackLoop) return;

    let animFrameId: number;
    let lastTime = performance.now();
    let isVisible = typeof document !== 'undefined' ? !document.hidden : true;

    const onVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        lastTime = performance.now();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    const loop = (now: number) => {
      if (isVisible) {
        const deltaSeconds = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        const telemetry: PlaybackTelemetry = {
          isPlaying,
          isBuffering,
          currentTime,
          duration,
          volume: isMuted ? 0 : volume,
          trackId: currentTrack?.videoId,
        };

        audioReactiveEngine.update(deltaSeconds, telemetry);
        featuresRef.current = audioReactiveEngine.getFeatures();
      }

      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enableFallbackLoop, isPlaying, isBuffering, currentTime, duration, volume, isMuted, currentTrack?.videoId]);

  const toggleAmbientMode = useCallback(() => {
    const next = !audioReactiveEngine.isAmbientMode();
    audioReactiveEngine.setAmbientMode(next);
    setAnalysisMode(audioReactiveEngine.getAnalysisMode());
  }, []);

  return {
    featuresRef,
    isLiveAudio,
    analysisMode,
    isAmbientMode: audioReactiveEngine.isAmbientMode(),
    toggleAmbientMode,
    getFeatures: () => audioReactiveEngine.getFeatures(),
  };
}
