import React, { useRef, useState, useCallback, useEffect } from 'react';

interface TiltedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // max tilt degrees (default 6 degrees for AAPESH restraint)
  perspective?: number; // perspective in px (default 1000)
  glare?: boolean;
  disabled?: boolean;
}

export const TiltedCard: React.FC<TiltedCardProps> = ({
  children,
  className = '',
  maxTilt = 6,
  perspective = 1000,
  glare = true,
  disabled = false,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);
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
      if (disabled || isReducedMotion || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Normalized coordinates from -1 to 1
      const normX = (mouseX / width) * 2 - 1;
      const normY = (mouseY / height) * 2 - 1;

      const rotX = -normY * maxTilt;
      const rotY = normX * maxTilt;

      setRotate({ x: rotX, y: rotY });

      if (glare) {
        setGlarePosition({
          x: (mouseX / width) * 100,
          y: (mouseY / height) * 100,
          opacity: 0.12,
        });
      }
    },
    [disabled, isReducedMotion, maxTilt, glare]
  );

  const handleMouseEnter = useCallback(() => {
    if (disabled || isReducedMotion) return;
    setIsHovered(true);
  }, [disabled, isReducedMotion]);

  const handleMouseLeave = useCallback(() => {
    if (disabled || isReducedMotion) return;
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
    setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
  }, [disabled, isReducedMotion]);

  const transformStyle: React.CSSProperties =
    disabled || isReducedMotion
      ? {}
      : {
          transform: isHovered
            ? `perspective(${perspective}px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1.01, 1.01, 1.01)`
            : `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
          transition: isHovered
            ? 'transform 0.1s ease-out'
            : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: isHovered ? 'transform' : 'auto',
        };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={transformStyle}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {/* Specular Glare Reflection */}
      {glare && !disabled && !isReducedMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-300"
          style={{
            opacity: glarePosition.opacity,
            background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.25) 0%, transparent 60%)`,
          }}
        />
      )}
      {children}
    </div>
  );
};
