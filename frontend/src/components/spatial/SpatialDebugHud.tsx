import React, { useState, useEffect, useRef } from 'react';
import { Activity, X, Layers, Cpu, Radio, Shield } from 'lucide-react';
import { QualityProfile } from './qualitySettings';
import { audioReactiveEngine } from '@/services/audio/AudioReactiveEngine';
import { usePlayerStore } from '@/stores/usePlayerStore';

interface SpatialDebugHudProps {
  quality: QualityProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const SpatialDebugHud: React.FC<SpatialDebugHudProps> = ({
  quality,
  isOpen,
  onClose,
}) => {
  const [fps, setFps] = useState(60);
  const [frameTime, setFrameTime] = useState(16.6);
  const [isLiveAudio, setIsLiveAudio] = useState(false);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const measurePerformance = (time: number) => {
      frameCountRef.current++;
      const elapsed = time - lastTimeRef.current;

      if (elapsed >= 500) {
        const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
        setFps(currentFps);
        setFrameTime(Number((elapsed / frameCountRef.current).toFixed(1)));
        frameCountRef.current = 0;
        lastTimeRef.current = time;
        setIsLiveAudio(audioReactiveEngine.isLiveAudioActive());
      }

      rafRef.current = requestAnimationFrame(measurePerformance);
    };

    rafRef.current = requestAnimationFrame(measurePerformance);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const totalParticles = quality.particlesFarCount + quality.particlesNearCount;
  const features = audioReactiveEngine.getFeatures();

  return (
    <div className="fixed bottom-24 right-6 z-50 p-4 rounded-2xl bg-[#0e1017]/90 backdrop-blur-xl border border-white/15 text-xs text-neutral-200 shadow-2xl font-mono w-80 animate-fade-in pointer-events-auto select-none">
      <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
        <div className="flex items-center gap-2 text-white font-bold tracking-wide">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Spatial 3D Diagnostics</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {/* Performance Metrics */}
        <div className="flex items-center justify-between">
          <span className="text-neutral-400 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-400" /> Framerate
          </span>
          <span className={`font-bold ${fps >= 55 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-red-400'}`}>
            {fps} FPS ({frameTime}ms)
          </span>
        </div>

        {/* Quality Profile */}
        <div className="flex items-center justify-between">
          <span className="text-neutral-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" /> Quality Tier
          </span>
          <span className="uppercase font-semibold text-white px-2 py-0.5 rounded bg-white/10 text-[11px]">
            {quality.name}
          </span>
        </div>

        {/* Geometry & Particles */}
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">Total Particles</span>
          <span className="text-neutral-200">{totalParticles} pts</span>
        </div>

        {/* Rapier Physics Bodies */}
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">Physics Bodies</span>
          <span className="text-neutral-200">
            {quality.enablePhysics ? `${quality.physicsBodyCount} active` : 'Disabled'}
          </span>
        </div>

        {/* Audio Reactive Engine */}
        <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-indigo-400" /> Audio Analysis
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              isLiveAudio
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            }`}>
              {isLiveAudio ? 'Real Web Audio' : 'Telemetry Fallback'}
            </span>
          </div>

          {/* Real-time Feature Energy Bars */}
          <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px] text-center">
            <div className="p-1 rounded bg-black/40">
              <div className="text-neutral-400">Bass</div>
              <div className="font-bold text-white">{(features.bass * 100).toFixed(0)}%</div>
            </div>
            <div className="p-1 rounded bg-black/40">
              <div className="text-neutral-400">Mid</div>
              <div className="font-bold text-white">{(features.mid * 100).toFixed(0)}%</div>
            </div>
            <div className="p-1 rounded bg-black/40">
              <div className="text-neutral-400">Treble</div>
              <div className="font-bold text-white">{(features.treble * 100).toFixed(0)}%</div>
            </div>
            <div className="p-1 rounded bg-black/40">
              <div className="text-neutral-400">Beat</div>
              <div className="font-bold text-emerald-400">{(features.beatEnergy * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>

        {/* Protection & Safety Status */}
        <div className="pt-2 border-t border-white/10 text-[10px] text-neutral-400 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Playback Authoritative • No iframe tampering</span>
        </div>
      </div>
    </div>
  );
};
