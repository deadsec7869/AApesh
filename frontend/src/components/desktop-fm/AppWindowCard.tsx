import React from 'react';

export interface AppWindowCardProps {
  wordmark?: string;
  ctaText?: string;
  onCtaClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export const AppWindowCard: React.FC<AppWindowCardProps> = ({
  wordmark = 'Desktop.fm',
  ctaText = 'Get Access',
  onCtaClick,
  children,
  className = '',
}) => {
  return (
    <div
      data-testid="app-window-card"
      className={`bg-white rounded-[25px] p-[10px] shadow-[0_1px_3px_rgba(17,17,17,0.08),0_4px_12px_rgba(17,17,17,0.06)] flex flex-col items-center w-[220px] transition-transform duration-200 select-none ${className}`}
      style={{
        borderRadius: '25px',
        padding: '10px',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Window Title Bar with Decorative macOS Traffic Lights */}
      <div className="w-full flex items-center justify-start px-1 pt-0.5 pb-1.5" aria-hidden="true">
        <div className="flex items-center gap-[5px]" data-testid="traffic-lights">
          {/* Close Dot: Silver Mist #b4b4b4 */}
          <span
            data-testid="traffic-dot-close"
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ backgroundColor: '#b4b4b4', width: '4px', height: '4px' }}
          />
          {/* Minimize Dot: Graphite #2d2d2d */}
          <span
            data-testid="traffic-dot-min"
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ backgroundColor: '#2d2d2d', width: '4px', height: '4px' }}
          />
          {/* Maximize Dot: Graphite #2d2d2d */}
          <span
            data-testid="traffic-dot-max"
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ backgroundColor: '#2d2d2d', width: '4px', height: '4px' }}
          />
        </div>
      </div>

      {/* 2px Pale Stone Hairline Divider */}
      <div
        data-testid="card-divider"
        className="w-full h-[2px] mb-2.5 rounded-[1.5px]"
        style={{
          backgroundColor: '#dddddd',
          height: '2px',
        }}
        role="separator"
      />

      {/* Card Content */}
      <div className="w-full flex flex-col items-center gap-2 pb-0.5">
        {wordmark && (
          <h1
            data-testid="brand-wordmark"
            className="text-[28px] font-[800] text-[#111111] text-center leading-[1.25] tracking-[-0.036em] m-0 p-0"
            style={{
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
              fontSize: '28px',
              fontWeight: 800,
              lineHeight: 1.25,
              letterSpacing: '-0.036em',
              color: '#111111',
            }}
          >
            {wordmark}
          </h1>
        )}

        {children}

        {ctaText && (
          <button
            type="button"
            data-testid="primary-pill-button"
            onClick={onCtaClick}
            className="inline-flex items-center justify-center gap-1 bg-[#111111] text-[#ffffff] rounded-[20px] px-5 py-2.5 border-none outline-none text-[12px] font-[800] leading-[1.25] tracking-normal cursor-pointer select-none transition-transform active:scale-[0.97] hover:opacity-95"
            style={{
              backgroundColor: '#111111',
              color: '#ffffff',
              borderRadius: '20px',
              padding: '10px 20px',
              fontSize: '12px',
              fontWeight: 800,
              lineHeight: 1.25,
            }}
          >
            <span>{ctaText}</span>
            <span
              className="text-[12px] font-[800] leading-none inline-block ml-[2px]"
              aria-hidden="true"
            >
              &#x203A;
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

