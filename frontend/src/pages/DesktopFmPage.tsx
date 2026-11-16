import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChromeDiscHero } from '@/components/desktop-fm/ChromeDiscHero';
import { AppWindowCard } from '@/components/desktop-fm/AppWindowCard';
import { WaitlistModal } from '@/components/desktop-fm/WaitlistModal';

/**
 * Desktop.fm Landing Page
 * 
 * "Chrome disc in a laser grid — Apple keynote restraint meets cyberpunk CD-ROM nostalgia."
 * 
 * Strict invariants:
 * - Canvas Mist (#f1f2f3) page canvas
 * - Upper ~70% hero render zone with 3D chrome disc & neon green laser grid
 * - 30px gap below disc
 * - App window card (25px radius, 10px padding, pure white #ffffff)
 * - 28px 800-weight brand wordmark (-0.036em tracking)
 * - Single Carbon Black (#111111) pill button (20px radius) with trailing ›
 * - 100% achromatic UI (color quarantined exclusively to laser lines and disc reflections)
 */
export const DesktopFmPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSpinning, setIsSpinning] = useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  const handleDiscClick = () => {
    setIsSpinning((prev) => !prev);
  };

  const handleCtaClick = () => {
    setIsWaitlistOpen(true);
  };

  return (
    <div
      data-testid="desktop-fm-page"
      className="w-screen h-screen flex flex-col items-center justify-center relative overflow-hidden select-none"
      style={{
        backgroundColor: '#f1f2f3',
        color: '#111111',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Upper ~70% Viewport: Hero Render Zone */}
      <div
        className="flex-shrink-0 flex items-center justify-center relative"
        style={{
          width: '340px',
          height: '340px',
        }}
      >
        <ChromeDiscHero
          isSpinning={isSpinning}
          onDiscClick={handleDiscClick}
        />
      </div>

      {/* 30px Vertical Margin Gap */}
      <div style={{ height: '30px' }} aria-hidden="true" />

      {/* Lower ~30% Viewport: App Window Card */}
      <div className="flex-shrink-0 flex items-center justify-center">
        <AppWindowCard
          wordmark="Desktop.fm"
          ctaText="Get Access"
          onCtaClick={handleCtaClick}
        />
      </div>

      {/* Technical Waitlist Modal with Monospace Serial */}
      <WaitlistModal
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
      />

      {/* Subtle Workstation Bridge Pill (Corner Affordance) */}
      <div className="absolute bottom-4 right-4 z-20">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-[12px] font-[800] text-[#2d2d2d] bg-white/70 hover:bg-white rounded-[20px] px-3 py-1.5 shadow-[0_1px_3px_rgba(17,17,17,0.08)] border border-[#dddddd]/60 cursor-pointer transition-all"
          style={{
            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
            fontSize: '12px',
            fontWeight: 800,
          }}
          title="Open AAPESH Music Workstation"
        >
          [WORKSTATION &#x2192;]
        </button>
      </div>
    </div>
  );
};

export default DesktopFmPage;

