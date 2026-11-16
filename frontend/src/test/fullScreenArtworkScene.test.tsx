import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FullScreenArtworkScene } from '@/components/player/FullScreenArtworkScene';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { Track } from '@/types/music';

const mockTrack: Track = {
  videoId: 'test_vid_123',
  title: 'Starboy (Cinematic)',
  artists: [{ name: 'The Weeknd', id: 'art_123' }],
  album: 'Starboy',
  albumId: 'alb_123',
  duration: '3:50',
  duration_seconds: 230,
  thumbnail: 'https://example.com/cover.jpg',
  thumbnails: [
    { url: 'https://example.com/cover_small.jpg', width: 120, height: 120 },
    { url: 'https://example.com/cover_large.jpg', width: 800, height: 800 },
  ],
};

describe('FullScreenArtworkScene Component (21st.dev Fluid Artwork & 3D Tilt)', () => {
  beforeEach(() => {
    useThemeStore.getState().setVisualQuality('high');
    usePlayerStore.setState({
      atmospherePalette: {
        primary: 'rgb(245, 158, 11)',
        glow: 'rgba(59, 130, 246, 0.25)',
        surface: 'rgba(15, 17, 23, 0.75)',
        gradient: 'radial-gradient(...)',
      },
      currentTrack: mockTrack,
      isPlaying: true,
    });
  });

  it('renders fullscreen scene and active track artwork', () => {
    render(
      <FullScreenArtworkScene
        currentTrack={mockTrack}
        isPlaying={true}
        reducedMotion={false}
      />
    );

    const scene = screen.getByTestId('fullscreen-artwork-scene');
    expect(scene).toBeInTheDocument();

    const cardWrapper = screen.getByTestId('artwork-card-3d-wrapper');
    expect(cardWrapper).toBeInTheDocument();

    // Check artwork image
    const img = screen.getByAltText('Starboy (Cinematic)');
    expect(img).toBeInTheDocument();
  });

  it('derives fluid ambient auras from active track atmosphere palette', () => {
    render(
      <FullScreenArtworkScene
        currentTrack={mockTrack}
        isPlaying={true}
        reducedMotion={false}
      />
    );

    const primaryAura = screen.getByTestId('fluid-aura-primary');
    const glowAura = screen.getByTestId('fluid-aura-glow');

    expect(primaryAura).toBeInTheDocument();
    expect(glowAura).toBeInTheDocument();

    // Verify colors are derived from palette (rgb(245, 158, 11)) and not hardcoded purple/indigo
    expect(primaryAura.style.background).toContain('rgb(245, 158, 11)');
    expect(glowAura.style.background).toContain('rgba(59, 130, 246, 0.25)');
  });

  it('renders specular glare sheen for 3D depth and disables it under reduced-motion', () => {
    const { unmount } = render(
      <FullScreenArtworkScene
        currentTrack={mockTrack}
        isPlaying={true}
        reducedMotion={false}
      />
    );

    expect(screen.getByTestId('specular-glare')).toBeInTheDocument();
    unmount();

    // Under reduced motion, specular glare should not animate/render
    render(
      <FullScreenArtworkScene
        currentTrack={mockTrack}
        isPlaying={true}
        reducedMotion={true}
      />
    );

    expect(screen.queryByTestId('specular-glare')).not.toBeInTheDocument();
  });

  it('freezes fluid drift transforms when prefers-reduced-motion is true', () => {
    render(
      <FullScreenArtworkScene
        currentTrack={mockTrack}
        isPlaying={true}
        reducedMotion={true}
      />
    );

    const primaryAura = screen.getByTestId('fluid-aura-primary');
    expect(primaryAura.style.transform).toBe('none');
  });

  it('updates background crossfade seamlessly when currentTrack changes', async () => {
    const { rerender } = render(
      <FullScreenArtworkScene
        currentTrack={mockTrack}
        isPlaying={true}
        reducedMotion={false}
      />
    );

    const nextTrack: Track = {
      ...mockTrack,
      videoId: 'test_vid_456',
      title: 'Blinding Lights',
      thumbnail: 'https://example.com/blinding.jpg',
      thumbnails: [{ url: 'https://example.com/blinding.jpg', width: 600, height: 600 }],
    };

    rerender(
      <FullScreenArtworkScene
        currentTrack={nextTrack}
        isPlaying={true}
        reducedMotion={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByAltText('Blinding Lights')).toBeInTheDocument();
    });
  });
});
