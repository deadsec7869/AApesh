import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface ChromeDiscHeroProps {
  isSpinning?: boolean;
  onDiscClick?: () => void;
  className?: string;
}

export const ChromeDiscHero: React.FC<ChromeDiscHeroProps> = ({
  isSpinning = false,
  onDiscClick,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 12, rotateY: -8 });
  const [spinAngle, setSpinAngle] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  // Mouse tilt tracking
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) / (rect.width / 2);
    const deltaY = (e.clientY - centerY) / (rect.height / 2);

    // Limit tilt range to keep Apple keynote restraint
    setTilt({
      rotateX: 12 - deltaY * 12,
      rotateY: -8 + deltaX * 14,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ rotateX: 12, rotateY: -8 });
  }, []);

  // Continuous spin when isSpinning is active
  useEffect(() => {
    if (!isSpinning) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();
    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      setSpinAngle((prev) => (prev + dt * 45) % 360);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSpinning]);

  return (
    <div
      ref={containerRef}
      data-testid="chrome-disc-hero"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-[340px] h-[340px] flex items-center justify-center select-none ${className}`}
      style={{
        width: '340px',
        height: '340px',
      }}
    >
      {/* Laser Line 1: Diagonal Top-Left to Bottom-Right */}
      <div
        data-testid="laser-line-1"
        className="absolute h-[1.5px] pointer-events-none z-[1]"
        style={{
          width: '640px',
          height: '1.5px',
          backgroundColor: '#00ff66',
          boxShadow: '0 0 8px rgba(0, 255, 102, 0.7), 0 0 18px rgba(0, 255, 102, 0.4)',
          transform: 'rotate(-24deg)',
          top: '46%',
        }}
      />

      {/* Laser Line 2: Intersecting Counter-Diagonal */}
      <div
        data-testid="laser-line-2"
        className="absolute h-[1.5px] pointer-events-none z-[1]"
        style={{
          width: '640px',
          height: '1.5px',
          backgroundColor: '#00ff66',
          boxShadow: '0 0 8px rgba(0, 255, 102, 0.7), 0 0 18px rgba(0, 255, 102, 0.4)',
          transform: 'rotate(34deg)',
          top: '54%',
        }}
      />

      {/* 3D Chrome Disc Asset */}
      <div
        data-testid="chrome-disc-disc"
        onClick={onDiscClick}
        role="button"
        tabIndex={0}
        aria-label="3D Chrome Disc Hero"
        className="relative z-[2] rounded-full flex items-center justify-center cursor-pointer transition-transform duration-100 ease-out"
        style={{
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          transform: `perspective(800px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) rotateZ(${spinAngle}deg)`,
          background: `conic-gradient(
            from ${180 + spinAngle}deg at 50% 50%,
            #9aa2ab 0deg,
            #e9f0f6 35deg,
            #c5d0d9 65deg,
            #ffffff 90deg,
            #c2cad1 125deg,
            #8e97a1 160deg,
            #f5f8fb 215deg,
            #c9d3db 245deg,
            #ffffff 270deg,
            #b4bec7 315deg,
            #9aa2ab 360deg
          )`,
          boxShadow:
            '0 12px 36px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.85)',
        }}
      >
        {/* Concentric Audio/Data Track Ring */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: '148px',
            height: '148px',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.04)',
          }}
        />

        {/* Outer Fine Track Ring */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: '210px',
            height: '210px',
            borderRadius: '50%',
            border: '0.5px solid rgba(255, 255, 255, 0.3)',
          }}
        />

        {/* Center Metallic Spindle Hub */}
        <div
          data-testid="disc-hub"
          className="absolute rounded-full flex items-center justify-center pointer-events-none"
          style={{
            width: '74px',
            height: '74px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #e6ebf0 0%, #bac2ca 65%, #848c94 100%)',
            border: '1px solid rgba(255, 255, 255, 0.95)',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.35)',
          }}
        >
          {/* Spindle Center Hole (Shows Canvas Mist #f1f2f3 Through Disc) */}
          <div
            data-testid="disc-center-hole"
            className="rounded-full"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#f1f2f3',
              boxShadow: 'inset 0 2px 5px rgba(0, 0, 0, 0.45)',
              border: '1.5px solid rgba(0, 0, 0, 0.18)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

