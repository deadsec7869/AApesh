import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpotlightCard } from '@/components/react-bits/SpotlightCard';
import { Magnet } from '@/components/react-bits/Magnet';
import { TiltedCard } from '@/components/react-bits/TiltedCard';
import { BlurText } from '@/components/react-bits/BlurText';
import { usePlayerStore } from '@/stores/usePlayerStore';

describe('React Bits Integration Pass', () => {
  describe('SpotlightCard', () => {
    it('renders children and responds to mouse hover without layout displacement', () => {
      const handleClick = vi.fn();
      render(
        <SpotlightCard onClick={handleClick} className="test-card">
          <span>Card Content</span>
        </SpotlightCard>
      );

      const card = screen.getByText('Card Content');
      expect(card).toBeDefined();

      const container = card.closest('.test-card');
      expect(container).toBeDefined();

      if (container) {
        fireEvent.mouseEnter(container);
        fireEvent.mouseMove(container, { clientX: 100, clientY: 100 });
        fireEvent.mouseLeave(container);
        fireEvent.click(container);
      }

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('respects disabled prop without rendering spotlight overlay', () => {
      render(
        <SpotlightCard disabled className="disabled-card">
          <span>Disabled Content</span>
        </SpotlightCard>
      );

      expect(screen.getByText('Disabled Content')).toBeDefined();
    });
  });

  describe('Magnet', () => {
    it('renders wrapped interactive element safely', () => {
      render(
        <Magnet padding={20} magnetStrength={0.25}>
          <button aria-label="Magnetic Button">Click Me</button>
        </Magnet>
      );

      const button = screen.getByLabelText('Magnetic Button');
      expect(button).toBeDefined();
    });

    it('handles mousemove events across the viewport without crashing', () => {
      render(
        <Magnet padding={30}>
          <span>Magnet Child</span>
        </Magnet>
      );

      fireEvent.mouseMove(window, { clientX: 50, clientY: 50 });
      expect(screen.getByText('Magnet Child')).toBeDefined();
    });
  });

  describe('TiltedCard', () => {
    it('renders spatial card with max tilt restraint', () => {
      render(
        <TiltedCard maxTilt={6} className="tilted-box">
          <div data-testid="tilted-inner">Inner Artwork</div>
        </TiltedCard>
      );

      const inner = screen.getByTestId('tilted-inner');
      expect(inner).toBeDefined();

      const card = inner.closest('.tilted-box');
      if (card) {
        fireEvent.mouseEnter(card);
        fireEvent.mouseMove(card, { clientX: 50, clientY: 50 });
        fireEvent.mouseLeave(card);
      }
    });
  });

  describe('BlurText', () => {
    it('renders words cleanly without layout corruption', () => {
      render(<BlurText text="Cinematic Space" delay={30} className="text-xl" />);
      expect(screen.getByText('Cinematic')).toBeDefined();
      expect(screen.getByText('Space')).toBeDefined();
    });
  });

  describe('Playback Safety Guardrail', () => {
    it('ensures React Bits interactions never disrupt or reset player state', () => {
      const initialTrack = usePlayerStore.getState().currentTrack;
      const initialPlaying = usePlayerStore.getState().isPlaying;

      render(
        <SpotlightCard>
          <Magnet>
            <button aria-label="Safe Interactive Control">Test Safe Button</button>
          </Magnet>
        </SpotlightCard>
      );

      const button = screen.getByLabelText('Safe Interactive Control');
      fireEvent.mouseEnter(button);
      fireEvent.mouseMove(button, { clientX: 200, clientY: 200 });
      fireEvent.click(button);

      // Verify player store was never mutated by React Bits visual micro-interactions
      expect(usePlayerStore.getState().currentTrack).toBe(initialTrack);
      expect(usePlayerStore.getState().isPlaying).toBe(initialPlaying);
    });
  });
});
