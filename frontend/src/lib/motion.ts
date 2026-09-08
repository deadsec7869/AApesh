import { Transition, Variants, TargetAndTransition } from 'motion/react';

/**
 * High-performance, music-workstation grade Spring & Easing Presets
 */
export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 450,
  damping: 32,
  mass: 0.8,
};

export const springGentle: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 26,
  mass: 1,
};

export const transitionSmooth: Transition = {
  duration: 0.24,
  ease: [0.16, 1, 0.3, 1],
};

export const transitionSlowCrossfade: Transition = {
  duration: 0.38,
  ease: [0.16, 1, 0.3, 1],
};

/**
 * Track change crossfade & entrance variants (Artwork, Title, Artist)
 */
export const trackArtVariants: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: transitionSmooth },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.18, ease: 'easeOut' } },
};

export const trackTextVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: transitionSmooth },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

/**
 * Play/Pause Icon Transition Variants
 */
export const iconCrossfadeVariants: Variants = {
  initial: { opacity: 0, scale: 0.7, rotate: -15 },
  animate: { opacity: 1, scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 500, damping: 28 } },
  exit: { opacity: 0, scale: 0.7, rotate: 15, transition: { duration: 0.12 } },
};

/**
 * Interactive Control Button Variants
 */
export const controlButtonTap: TargetAndTransition = {
  scale: 0.92,
  transition: { type: 'spring', stiffness: 600, damping: 25 },
};

export const controlButtonHover: TargetAndTransition = {
  scale: 1.07,
  transition: { type: 'spring', stiffness: 500, damping: 25 },
};

export const playButtonHover: TargetAndTransition = {
  scale: 1.05,
  boxShadow: '0 12px 30px rgba(255, 255, 255, 0.25)',
  transition: { type: 'spring', stiffness: 500, damping: 25 },
};

export const playButtonTap: TargetAndTransition = {
  scale: 0.94,
  transition: { type: 'spring', stiffness: 600, damping: 25 },
};

/**
 * Slide & Fade Drawer Panel Variants (Queue, Lyrics, Equalizer)
 */
export const drawerPanelVariants: Variants = {
  closed: { opacity: 0, x: 28, transition: transitionSmooth },
  open: { opacity: 1, x: 0, transition: transitionSmooth },
  exit: { opacity: 0, x: 28, transition: { duration: 0.2, ease: 'easeIn' } },
};

/**
 * Modal Backdrop & Surface Variants
 */
export const modalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalSurfaceVariants: Variants = {
  initial: { opacity: 0, scale: 0.94, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0, transition: springGentle },
  exit: { opacity: 0, scale: 0.95, y: 8, transition: { duration: 0.15 } },
};

/**
 * List & Grid Item Entrance Variants
 */
export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: transitionSmooth },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
};
