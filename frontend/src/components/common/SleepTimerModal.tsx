import React, { useState } from 'react';
import { Moon, X, Clock, Check, PowerOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import {
  modalBackdropVariants,
  modalSurfaceVariants,
  controlButtonHover,
  controlButtonTap,
} from '@/lib/motion';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({ isOpen, onClose }) => {
  const { sleepTimer, setSleepTimer, cancelSleepTimer } = usePlayerStore();
  const [customMinutes, setCustomMinutes] = useState<string>('');

  const presetOptions = [
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '45 minutes', value: 45 },
    { label: '60 minutes', value: 60 },
    { label: 'End of current track', value: 'track' as const },
  ];

  const handleSelectPreset = (value: number | 'track') => {
    setSleepTimer(value);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(customMinutes, 10);
    if (!isNaN(mins) && mins > 0) {
      setSleepTimer(mins);
      onClose();
    }
  };

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={modalBackdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        >
          <motion.div
            variants={modalSurfaceVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full max-w-sm rounded-3xl glass-elevated border border-white/10 p-6 shadow-2xl flex flex-col gap-5 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 text-white border border-white/15 flex items-center justify-center">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Sleep Timer</h2>
                  <p className="text-xs text-neutral-400">Pause music automatically</p>
                </div>
              </div>
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={onClose}
                className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Live Active Countdown Banner */}
            {sleepTimer && (
              <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-white shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {sleepTimer.timerType === 'track'
                        ? 'Stopping after current track'
                        : `Stopping in ${formatRemaining(sleepTimer.remainingSeconds)}`}
                    </div>
                    <div className="text-[10px] text-neutral-400">Playback will pause cleanly</div>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={cancelSleepTimer}
                  className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            )}

            {/* Presets */}
            <div className="flex flex-col gap-1.5">
              {presetOptions.map((opt) => {
                const isSelected =
                  sleepTimer?.timerType === opt.value ||
                  (typeof opt.value === 'number' &&
                    sleepTimer?.timerType === 'minutes' &&
                    sleepTimer?.durationMinutes === opt.value);

                return (
                  <motion.button
                    key={opt.label}
                    whileHover={{ scale: 1.015, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectPreset(opt.value)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-white/20 text-white border border-white/30 font-semibold'
                        : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </motion.button>
                );
              })}
            </div>

            {/* Custom duration */}
            <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 pt-1 border-t border-white/10">
              <input
                type="number"
                min="1"
                max="480"
                placeholder="Custom minutes..."
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/30"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!customMinutes}
                className="px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-xs transition-opacity disabled:opacity-40 shadow-sm"
              >
                Set
              </motion.button>
            </form>

            {/* Turn off timer button */}
            {sleepTimer && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  cancelSleepTimer();
                  onClose();
                }}
                className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-neutral-400 hover:text-white transition-colors"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>Turn off sleep timer</span>
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
