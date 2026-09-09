import React, { useRef, useState, useCallback, useEffect } from 'react';

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  spotlightRadius?: number;
  disabled?: boolean;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  spotlightColor = 'rgba(255, 255, 255, 0.08)',
  spotlightRadius = 300,
  disabled = false,
  ...props
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
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

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || isReducedMotion || !divRef.current) return;
      const rect = divRef.current.getBoundingClientRect();
      setPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [disabled, isReducedMotion]
  );

  const handleMouseEnter = useCallback(() => {
    if (disabled || isReducedMotion) return;
    setOpacity(1);
  }, [disabled, isReducedMotion]);

  const handleMouseLeave = useCallback(() => {
    if (disabled || isReducedMotion) return;
    setOpacity(0);
  }, [disabled, isReducedMotion]);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {/* Radial Spotlight Overlay */}
      {!disabled && !isReducedMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-10"
          style={{
            opacity,
            background: `radial-gradient(${spotlightRadius}px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
          }}
        />
      )}
      {children}
    </div>
  );
};
