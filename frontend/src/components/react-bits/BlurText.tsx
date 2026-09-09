import React, { useEffect, useState, useMemo } from 'react';
import { motion, Transition } from 'motion/react';

interface BlurTextProps {
  text: string;
  delay?: number; // delay between elements in ms
  className?: string;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  threshold?: number;
  rootMargin?: string;
  onAnimationComplete?: () => void;
}

export const BlurText: React.FC<BlurTextProps> = ({
  text,
  delay = 50,
  className = '',
  animateBy = 'words',
  direction = 'top',
  onAnimationComplete,
}) => {
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setIsReducedMotion(mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  const elements = useMemo(() => {
    if (animateBy === 'words') {
      return text.split(' ');
    }
    return text.split('');
  }, [text, animateBy]);

  const yOffset = direction === 'top' ? -8 : 8;

  if (isReducedMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={`inline-flex flex-wrap ${className}`}>
      {elements.map((element, index) => (
        <motion.span
          key={`${element}-${index}`}
          initial={{
            filter: 'blur(8px)',
            opacity: 0,
            y: yOffset,
          }}
          animate={{
            filter: 'blur(0px)',
            opacity: 1,
            y: 0,
          }}
          transition={
            {
              duration: 0.35,
              delay: (index * delay) / 1000,
              ease: [0.16, 1, 0.3, 1],
            } as Transition
          }
          onAnimationComplete={index === elements.length - 1 ? onAnimationComplete : undefined}
          className="inline-block"
        >
          {element}
          {animateBy === 'words' && index < elements.length - 1 && '\u00A0'}
        </motion.span>
      ))}
    </span>
  );
};
