import React from 'react';
import { motion } from 'motion/react';
import { Zap, Grid, Star, Battery } from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { controlButtonHover, controlButtonTap } from '@/lib/motion';

// Lucide icons are ForwardRefExoticComponent with LucideProps
type LucideIcon = React.ForwardRefExoticComponent<
  React.SVGProps<SVGSVGElement> & { size?: number | string; className?: string }
>;

const VISUALIZER_MODES: Array<{
  id: 'ferrofluid' | 'cymatics' | 'starfield' | 'stealth';
  label: string;
  icon: LucideIcon;
  description: string;
}> = [
  { id: 'ferrofluid', label: '01. FERROFLUID CORE', icon: Zap, description: 'Organic acoustic wave mesh' },
  { id: 'cymatics', label: '02. CYMATICS GRID', icon: Grid, description: 'Frequency-bin height field' },
  { id: 'starfield', label: '03. STARFIELD DRIFT', icon: Star, description: 'Cosmic particle atmosphere' },
  { id: 'stealth', label: '04. STEALTH (GPU ECO)', icon: Battery, description: 'Minimal geometric form' },
];

interface VisualizerModeSwitcherProps {
  className?: string;
}

export const VisualizerModeSwitcher: React.FC<VisualizerModeSwitcherProps> = ({ className = '' }) => {
  const { visualizerMode, setVisualizerMode, cycleVisualizerMode } = useUIStore();

  return (
    <div className={`flex items-center gap-1.5 ${className}`} role="group" aria-label="Visualizer mode">
      {VISUALIZER_MODES.map((mode) => {
        const Icon = mode.icon;
        const isActive = visualizerMode === mode.id;
        return (
          <motion.button
            key={mode.id}
            onClick={() => setVisualizerMode(mode.id)}
            onMouseEnter={() => {}}
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            aria-label={mode.label}
            aria-pressed={isActive}
            title={`${mode.label} — ${mode.description}`}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-white/40 ${
              isActive
                ? 'bg-white/20 text-white border border-white/35 shadow-[0_0_12px_rgba(255,255,255,0.15)]'
                : 'bg-white/[0.04] text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.08] border border-white/[0.06]'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
            <span className="hidden sm:inline-block tracking-wider">{mode.label}</span>
            {isActive && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -top-1.5 right-1 w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"
              />
            )}
          </motion.button>
        );
      })}

      {/* Cycle button */}
      <motion.button
        onClick={cycleVisualizerMode}
        whileHover={controlButtonHover}
        whileTap={controlButtonTap}
        aria-label="Cycle visualizer mode"
        title="Cycle modes (V)"
        className="ml-1 w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white flex items-center justify-center transition-all border border-white/[0.06] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-white/40"
      >
        <motion.svg
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M23 4v6h-6" />
          <path d="M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </motion.svg>
      </motion.button>
    </div>
  );
};