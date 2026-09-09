import React, { useState, useEffect, useRef, useCallback } from 'react';

interface MagnetProps {
  children: React.ReactNode;
  padding?: number;
  disabled?: boolean;
  magnetStrength?: number; // 0 to 1, default ~0.25
  activeTransition?: string;
  inactiveTransition?: string;
  className?: string;
}

export const Magnet: React.FC<MagnetProps> = ({
  children,
  padding = 40,
  disabled = false,
  magnetStrength = 0.25,
  activeTransition = 'transform 0.15s ease-out',
  inactiveTransition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  className = '',
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const magnetRef = useRef<HTMLDivElement>(null);

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
    (e: MouseEvent) => {
      if (disabled || isReducedMotion || !magnetRef.current) return;

      const rect = magnetRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distX = e.clientX - centerX;
      const distY = e.clientY - centerY;

      // Check if mouse is within active magnetic trigger area
      const isInArea =
        e.clientX >= rect.left - padding &&
        e.clientX <= rect.right + padding &&
        e.clientY >= rect.top - padding &&
        e.clientY <= rect.bottom + padding;

      if (isInArea) {
        setIsHovered(true);
        // Restrain max offset to max 8px for AAPESH desktop subtlety
        const maxOffset = 8;
        const offsetX = Math.max(-maxOffset, Math.min(maxOffset, distX * magnetStrength));
        const offsetY = Math.max(-maxOffset, Math.min(maxOffset, distY * magnetStrength));
        setPosition({ x: offsetX, y: offsetY });
      } else {
        setIsHovered(false);
        setPosition({ x: 0, y: 0 });
      }
    },
    [disabled, isReducedMotion, padding, magnetStrength]
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  const style: React.CSSProperties =
    disabled || isReducedMotion
      ? {}
      : {
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          transition: isHovered ? activeTransition : inactiveTransition,
          willChange: isHovered ? 'transform' : 'auto',
        };

  return (
    <div ref={magnetRef} style={style} className={`inline-flex ${className}`}>
      {children}
    </div>
  );
};
