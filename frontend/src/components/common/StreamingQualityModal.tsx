import React from 'react';
import { X, Check, Activity, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { StreamingQualityTier } from '@/types/quality';
import { YOUTUBE_QUALITY_CAPABILITIES } from '@/services/audio/qualityResolver';
import {
  modalBackdropVariants,
  modalSurfaceVariants,
  controlButtonHover,
  controlButtonTap,
} from '@/lib/motion';

export const StreamingQualityModal: React.FC = () => {
  const {
    isQualityModalOpen,
    toggleQualityModal,
    streamingQuality,
    setStreamingQuality,
    getEffectiveQualityInfo,
  } = usePlayerStore();

  if (!isQualityModalOpen) return null;

  const effectiveInfo = getEffectiveQualityInfo();
  const availableTiers = YOUTUBE_QUALITY_CAPABILITIES.filter((c) => c.available);
  const futureTiers = YOUTUBE_QUALITY_CAPABILITIES.filter((c) => !c.available);

  return (
    <AnimatePresence>
      {isQualityModalOpen && (
        <motion.div
          variants={modalBackdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={toggleQualityModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        >
          <motion.div
            variants={modalSurfaceVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl glass-elevated border border-white/10 p-6 shadow-[0_32px_80px_rgba(0,0,0,0.85)] flex flex-col gap-5 text-white select-none max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-neutral-200 shadow-sm">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Streaming Quality
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Source stream resolution & bitrate
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={toggleQualityModal}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Active Provider Tiers */}
            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-1">
                Active Provider Tiers (YouTube Music)
              </div>
              {availableTiers.map((cap) => {
                const isSelected = streamingQuality === cap.tier;
                return (
                  <motion.button
                    key={cap.tier}
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStreamingQuality(cap.tier)}
                    className={`flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                      isSelected
                        ? 'bg-white/[0.14] text-white border border-white/25 shadow-sm'
                        : 'text-neutral-300 hover:bg-white/[0.05] border border-transparent'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">
                          {cap.label}
                        </span>
                        {cap.tier === 'auto' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white/10 text-neutral-300 border border-white/15">
                            RECOMMENDED
                          </span>
                        )}
                        {cap.tier === 'always_high' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white/15 text-white border border-white/20">
                            HQ
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-neutral-400 mt-0.5">
                        {cap.description}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shrink-0 shadow-sm">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Unsupported / Future Capabilities */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Extended / Future Capabilities
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  Multi-Provider Ready
                </span>
              </div>
              {futureTiers.map((cap) => (
                <div
                  key={cap.tier}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] opacity-50 cursor-not-allowed"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-semibold text-sm text-neutral-300">
                      {cap.label}
                    </span>
                    <span className="text-xs text-neutral-500 mt-0.5">
                      {cap.description}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-neutral-400 bg-white/[0.06] border border-white/10 px-2 py-1 rounded-lg shrink-0 text-right">
                    {cap.reason || 'Unavailable'}
                  </span>
                </div>
              ))}
            </div>

            {/* Current Source & Effective Quality Summary Card */}
            <div className="p-3.5 rounded-2xl bg-[#090b0f] border border-white/[0.08] flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Current Source</span>
                <span className="font-semibold text-white">YouTube Music</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Effective Stream</span>
                <span className="font-mono font-bold text-white">
                  {effectiveInfo.statusLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Lossless Stream</span>
                <span className="text-neutral-300">
                  {effectiveInfo.isLossless ? 'Yes (FLAC)' : 'No (Lossy AAC/Opus)'}
                </span>
              </div>

              {effectiveInfo.note && (
                <div className="pt-2 border-t border-white/[0.06] flex items-start gap-2 text-[11px] text-neutral-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                  <span>{effectiveInfo.note}</span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
