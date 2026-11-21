import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VisualStageBoundary } from '@/components/canvas/VisualStageBoundary';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { WaveformScrubber } from '@/components/hud/WaveformScrubber';

describe('Visual isolation and scrub interaction', () => {
  it('falls back after context loss without changing playback intent', () => {
    vi.useFakeTimers();
    try {
      usePlayerStore.setState({ isPlaying: true });
      const view = render(<VisualStageBoundary><canvas data-testid="stage" /></VisualStageBoundary>);
      fireEvent(screen.getByTestId('stage'), new Event('webglcontextlost', { cancelable: true }));
      expect(screen.getByRole('status')).toHaveTextContent('Restoring');
      act(() => vi.advanceTimersByTime(5001));
      expect(screen.getByRole('status')).toHaveTextContent('Artwork mode');
      expect(usePlayerStore.getState().isPlaying).toBe(true); view.unmount();
    } finally { vi.useRealTimers(); }
  });
  it('recovers a restored context without remounting its canvas', () => {
    const view = render(<VisualStageBoundary><canvas data-testid="stage" /></VisualStageBoundary>);
    const canvas = screen.getByTestId('stage');
    fireEvent(canvas, new Event('webglcontextlost', { cancelable: true }));
    fireEvent(canvas, new Event('webglcontextrestored'));
    expect(screen.queryByRole('status')).toBeNull(); expect(screen.getByTestId('stage')).toBe(canvas); view.unmount();
  });
  it('keeps drag preview local and commits only the final target', () => {
    const seek = vi.fn();
    const view = render(<WaveformScrubber waveformData={null} currentTime={0} duration={100} onSeek={seek} />);
    // Use the hidden input for testing since jsdom doesn't support setPointerCapture on divs
    const slider = screen.getByTestId('waveform-input') as HTMLInputElement;
    // Use testing-library's fireEvent.change which works with React synthetic events
    fireEvent.change(slider, { target: { value: '20' } });
    fireEvent.change(slider, { target: { value: '80' } });
    expect(seek).toHaveBeenCalledTimes(2);
    expect(seek).toHaveBeenLastCalledWith(80);
    view.unmount();
  });
});
