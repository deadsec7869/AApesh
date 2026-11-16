import React, { useState } from 'react';

export interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [serial] = useState(() => `DFM-${Math.floor(1000 + Math.random() * 9000)}-X8`);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    try {
      localStorage.setItem('desktop_fm_waitlist', JSON.stringify({ email, serial, date: new Date().toISOString() }));
    } catch {
      // ignore localStorage error
    }
    setSubmitted(true);
  };

  return (
    <div
      data-testid="waitlist-overlay"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/15 backdrop-blur-[2px] transition-opacity"
    >
      <div
        data-testid="waitlist-card"
        onClick={(e) => e.stopPropagation()}
        className="w-[280px] bg-white rounded-[25px] p-[10px] shadow-[0_1px_3px_rgba(17,17,17,0.08),0_8px_24px_rgba(17,17,17,0.12)] flex flex-col items-center select-none animate-in fade-in zoom-in-95 duration-150"
        style={{
          borderRadius: '25px',
          padding: '10px',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Titlebar with Traffic Lights */}
        <div className="w-full flex items-center justify-between px-1 pt-0.5 pb-1.5" aria-hidden="true">
          <div className="flex items-center gap-[5px]">
            <button
              type="button"
              onClick={onClose}
              data-testid="waitlist-close"
              className="w-1.5 h-1.5 rounded-full inline-block cursor-pointer p-0 border-none"
              style={{ backgroundColor: '#b4b4b4', width: '6px', height: '6px' }}
              title="Close"
            />
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ backgroundColor: '#2d2d2d', width: '6px', height: '6px' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ backgroundColor: '#2d2d2d', width: '6px', height: '6px' }}
            />
          </div>

          {/* Stamped Monospace Serial Label */}
          <span
            data-testid="serial-stamp"
            className="text-[12px] font-[800] text-[#2d2d2d] leading-[1.25] tracking-tight"
            style={{
              fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
              fontSize: '12px',
              fontWeight: 800,
            }}
          >
            #{serial}
          </span>
        </div>

        {/* 2px Pale Stone Hairline Divider */}
        <div
          className="w-full h-[2px] mb-2.5 rounded-[1.5px]"
          style={{ backgroundColor: '#dddddd', height: '2px' }}
          role="separator"
        />

        {/* Card Body */}
        <div className="w-full flex flex-col items-center gap-2.5 px-1 pb-1">
          <h2
            className="text-[18px] font-[700] text-[#111111] text-center leading-[1.25] tracking-[-0.016em] m-0"
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
              fontSize: '18px',
              fontWeight: 700,
              lineHeight: 1.25,
            }}
          >
            {submitted ? 'Access Reserved' : 'Early Access'}
          </h2>

          {submitted ? (
            <div className="text-center py-2 flex flex-col items-center gap-2">
              <p
                className="text-[12px] font-[700] text-[#2d2d2d] m-0"
                style={{
                  fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
                  fontSize: '12px',
                  fontWeight: 800,
                }}
              >
                POSITION ASSIGNED
              </p>
              <button
                type="button"
                onClick={onClose}
                className="bg-[#111111] text-white rounded-[20px] px-5 py-2 text-[12px] font-[800] border-none cursor-pointer"
                style={{ borderRadius: '20px', padding: '8px 16px', fontSize: '12px', fontWeight: 800 }}
              >
                Dismiss
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                data-testid="waitlist-email-input"
                className="w-full px-3 py-2 text-[12px] font-[700] text-[#111111] bg-[#f1f2f3] rounded-[1.5px] border border-[#dddddd] outline-none text-center"
                style={{
                  borderRadius: '1.5px',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: '#f1f2f3',
                  borderColor: '#dddddd',
                  color: '#111111',
                }}
              />
              <button
                type="submit"
                data-testid="waitlist-submit"
                className="w-full inline-flex items-center justify-center gap-1 bg-[#111111] text-white rounded-[20px] py-2 text-[12px] font-[800] border-none cursor-pointer active:scale-[0.98]"
                style={{
                  backgroundColor: '#111111',
                  color: '#ffffff',
                  borderRadius: '20px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 800,
                  lineHeight: 1.25,
                }}
              >
                <span>Request Key</span>
                <span className="font-[800] text-[12px] ml-0.5">&#x203A;</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

