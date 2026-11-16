import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AppWindowCard } from '@/components/desktop-fm/AppWindowCard';
import { ChromeDiscHero } from '@/components/desktop-fm/ChromeDiscHero';
import { WaitlistModal } from '@/components/desktop-fm/WaitlistModal';
import { DesktopFmPage } from '@/pages/DesktopFmPage';

describe('Desktop.fm Design System Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('AppWindowCard Component', () => {
    it('renders with exact 25px border-radius, 10px padding, and #ffffff surface', () => {
      render(<AppWindowCard wordmark="Desktop.fm" ctaText="Get Access" />);

      const card = screen.getByTestId('app-window-card');
      expect(card).toBeInTheDocument();
      expect(card.style.borderRadius).toBe('25px');
      expect(card.style.padding).toBe('10px');
      expect(card.style.backgroundColor).toBe('rgb(255, 255, 255)');
    });

    it('renders macOS traffic lights with close dot (#b4b4b4) and graphite dots (#2d2d2d)', () => {
      render(<AppWindowCard wordmark="Desktop.fm" />);

      const closeDot = screen.getByTestId('traffic-dot-close');
      const minDot = screen.getByTestId('traffic-dot-min');
      const maxDot = screen.getByTestId('traffic-dot-max');

      expect(closeDot).toBeInTheDocument();
      expect(minDot).toBeInTheDocument();
      expect(maxDot).toBeInTheDocument();

      expect(closeDot.style.backgroundColor).toBe('rgb(180, 180, 180)'); // #b4b4b4
      expect(minDot.style.backgroundColor).toBe('rgb(45, 45, 45)');      // #2d2d2d
      expect(maxDot.style.backgroundColor).toBe('rgb(45, 45, 45)');      // #2d2d2d
    });

    it('renders 2px hairline divider in Pale Stone (#dddddd)', () => {
      render(<AppWindowCard wordmark="Desktop.fm" />);

      const divider = screen.getByTestId('card-divider');
      expect(divider).toBeInTheDocument();
      expect(divider.style.height).toBe('2px');
      expect(divider.style.backgroundColor).toBe('rgb(221, 221, 221)'); // #dddddd
    });

    it('renders brand wordmark at 28px, weight 800, #111111, and -0.036em tracking', () => {
      render(<AppWindowCard wordmark="Desktop.fm" />);

      const wordmark = screen.getByTestId('brand-wordmark');
      expect(wordmark).toBeInTheDocument();
      expect(wordmark.textContent).toBe('Desktop.fm');
      expect(wordmark.style.fontSize).toBe('28px');
      expect(wordmark.style.fontWeight).toBe('800');
      expect(wordmark.style.letterSpacing).toBe('-0.036em');
      expect(wordmark.style.color).toBe('rgb(17, 17, 17)'); // #111111
    });

    it('renders sole CTA button with Carbon Black (#111111), 20px radius, 12px 800 weight, and chevron ›', () => {
      const handleCta = vi.fn();
      render(<AppWindowCard wordmark="Desktop.fm" ctaText="Get Access" onCtaClick={handleCta} />);

      const btn = screen.getByTestId('primary-pill-button');
      expect(btn).toBeInTheDocument();
      expect(btn.style.backgroundColor).toBe('rgb(17, 17, 17)'); // #111111
      expect(btn.style.color).toBe('rgb(255, 255, 255)');         // #ffffff
      expect(btn.style.borderRadius).toBe('20px');
      expect(btn.style.fontSize).toBe('12px');
      expect(btn.style.fontWeight).toBe('800');
      expect(btn.textContent).toContain('Get Access');
      expect(btn.textContent).toContain('›');

      fireEvent.click(btn);
      expect(handleCta).toHaveBeenCalledTimes(1);
    });
  });

  describe('ChromeDiscHero Component', () => {
    it('renders two intersecting neon green (#00ff66) diagonal laser lines', () => {
      render(<ChromeDiscHero />);

      const laser1 = screen.getByTestId('laser-line-1');
      const laser2 = screen.getByTestId('laser-line-2');

      expect(laser1).toBeInTheDocument();
      expect(laser2).toBeInTheDocument();
      expect(laser1.style.backgroundColor).toBe('rgb(0, 255, 102)'); // #00ff66
      expect(laser2.style.backgroundColor).toBe('rgb(0, 255, 102)'); // #00ff66
      expect(laser1.style.height).toBe('1.5px');
      expect(laser2.style.height).toBe('1.5px');
    });

    it('renders specular chrome disc with metallic hub and center spindle hole', () => {
      render(<ChromeDiscHero />);

      const disc = screen.getByTestId('chrome-disc-disc');
      const hub = screen.getByTestId('disc-hub');
      const hole = screen.getByTestId('disc-center-hole');

      expect(disc).toBeInTheDocument();
      expect(hub).toBeInTheDocument();
      expect(hole).toBeInTheDocument();
      expect(disc.style.width).toBe('240px');
      expect(hole.style.backgroundColor).toBe('rgb(241, 242, 243)'); // #f1f2f3
    });

    it('triggers disc click handler when clicked', () => {
      const handleDiscClick = vi.fn();
      render(<ChromeDiscHero onDiscClick={handleDiscClick} />);

      const disc = screen.getByTestId('chrome-disc-disc');
      fireEvent.click(disc);
      expect(handleDiscClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('WaitlistModal Component', () => {
    it('renders monospace stamped serial label and email input', () => {
      const handleClose = vi.fn();
      render(<WaitlistModal isOpen={true} onClose={handleClose} />);

      const serial = screen.getByTestId('serial-stamp');
      expect(serial).toBeInTheDocument();
      expect(serial.textContent).toMatch(/#DFM-\d+-X8/);
      expect(serial.style.fontFamily).toContain('monospace');
      expect(serial.style.fontWeight).toBe('800');

      const input = screen.getByTestId('waitlist-email-input');
      expect(input).toBeInTheDocument();

      fireEvent.change(input, { target: { value: 'test@desktop.fm' } });
      const submit = screen.getByTestId('waitlist-submit');
      fireEvent.click(submit);

      expect(screen.getByText('Access Reserved')).toBeInTheDocument();
      expect(screen.getByText('POSITION ASSIGNED')).toBeInTheDocument();
    });

    it('closes when close button is clicked', () => {
      const handleClose = vi.fn();
      render(<WaitlistModal isOpen={true} onClose={handleClose} />);

      const closeBtn = screen.getByTestId('waitlist-close');
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('DesktopFmPage Full Assembly', () => {
    it('renders full-bleed #f1f2f3 stage with 3D hero and app window card', () => {
      render(
        <BrowserRouter>
          <DesktopFmPage />
        </BrowserRouter>
      );

      const page = screen.getByTestId('desktop-fm-page');
      expect(page).toBeInTheDocument();
      expect(page.style.backgroundColor).toBe('rgb(241, 242, 243)'); // #f1f2f3

      expect(screen.getByTestId('chrome-disc-hero')).toBeInTheDocument();
      expect(screen.getByTestId('app-window-card')).toBeInTheDocument();
      expect(screen.getByText('Desktop.fm')).toBeInTheDocument();
      expect(screen.getByText('Get Access')).toBeInTheDocument();
    });

    it('opens waitlist modal when Get Access CTA is clicked', () => {
      render(
        <BrowserRouter>
          <DesktopFmPage />
        </BrowserRouter>
      );

      expect(screen.queryByTestId('waitlist-card')).not.toBeInTheDocument();
      const cta = screen.getByTestId('primary-pill-button');
      fireEvent.click(cta);

      expect(screen.getByTestId('waitlist-card')).toBeInTheDocument();
      expect(screen.getByText('Early Access')).toBeInTheDocument();
    });
  });
});

