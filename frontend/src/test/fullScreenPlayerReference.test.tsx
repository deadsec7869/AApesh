import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FullScreenPlayer } from '@/components/player/FullScreenPlayer';
import { BottomPlayer } from '@/components/player/BottomPlayer';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { Track } from '@/types/music';

const mockTrack: Track = {
  videoId: 'ref_track_123',
  title: 'Starboy (Cinematic Workstation)',
  artists: [{ name: 'The Weeknd', id: 'art_1' }, { name: 'Daft Punk', id: 'art_2' }],
  album: 'Starboy',
  albumId: 'alb_1',
  duration: '3:50',
  duration_seconds: 230,
  thumbnail: 'https://example.com/cover.jpg',
  thumbnails: [
    { url: 'https://example.com/cover_small.jpg', width: 120, height: 120 },
    { url: 'https://example.com/cover_large.jpg', width: 800, height: 800 },
  ],
};

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('FullScreenPlayer Reference Rebuild (Visual Target & Stacking Validation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlayerStore.setState({
      currentTrack: mockTrack,
      isPlayerExpanded: true,
      fullscreenTab: 'lyrics',
      isPlaying: true,
      currentTime: 45,
      duration: 230,
      volume: 80,
      isMuted: false,
      repeatMode: 'off',
      shuffleMode: 'off',
      atmospherePalette: {
        primary: 'rgb(245, 158, 11)',
        glow: 'rgba(59, 130, 246, 0.25)',
        surface: 'rgba(15, 17, 23, 0.75)',
        gradient: 'radial-gradient(...)',
      },
    });
  });

  it('renders true two-column composition with Left Controls Column and Right Lyrics Column', () => {
    renderWithRouter(<FullScreenPlayer />);

    // 1. Left column elements
    const trackControls = screen.getByLabelText('Track Player Controls');
    expect(trackControls).toBeInTheDocument();

    // Medium square artwork
    const coverImg = screen.getByAltText('Starboy (Cinematic Workstation)');
    expect(coverImg).toBeInTheDocument();

    // Title and artists
    expect(screen.getByText('Starboy (Cinematic Workstation)')).toBeInTheDocument();
    expect(screen.getByText('The Weeknd, Daft Punk')).toBeInTheDocument();

    // Minimal progress bar with timestamps
    expect(screen.getByLabelText('Audio Timeline Scrubber')).toBeInTheDocument();
    expect(screen.getByText('0:45')).toBeInTheDocument(); // Elapsed
    expect(screen.getByText('-3:05')).toBeInTheDocument(); // Remaining (230 - 45 = 185s = 3:05)

    // Compact transport controls
    expect(screen.getByLabelText('Previous track')).toBeInTheDocument();
    expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    expect(screen.getByLabelText('Next track')).toBeInTheDocument();

    // Unobtrusive volume and options
    expect(screen.getByLabelText('Volume Slider')).toBeInTheDocument();
    expect(screen.getByLabelText('Like track')).toBeInTheDocument();
    expect(screen.getByLabelText('Add to playlist')).toBeInTheDocument();
    expect(screen.getByLabelText('Sleep timer')).toBeInTheDocument();

    // 2. Right column focus content
    const focusContent = screen.getByLabelText('Workstation Focus Content');
    expect(focusContent).toBeInTheDocument();
  });

  it('eliminates clutter: no volume boost chips, no status badge, and hides BottomPlayer', () => {
    // Render both FullScreenPlayer and BottomPlayer
    const { container } = renderWithRouter(
      <>
        <FullScreenPlayer />
        <BottomPlayer />
      </>
    );

    // Verify removed clutter chips are NOT present
    expect(screen.queryByText('150% Boost')).not.toBeInTheDocument();
    expect(screen.queryByText('200% Max Boost')).not.toBeInTheDocument();
    expect(screen.queryByText('50%')).not.toBeInTheDocument();

    // Verify floating lower-left status badge is NOT present
    expect(screen.queryByText(/AAPESH Engine • Preparing audio/i)).not.toBeInTheDocument();

    // Verify BottomPlayer returned null and did not render duplicate controls
    expect(screen.queryByLabelText('Audio Player Standby')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.btn-play-aapesh')).toHaveLength(0);
  });

  it('supports seamless switching between Cover, Lyrics, Queue, and Video modes', () => {
    renderWithRouter(<FullScreenPlayer />);

    const coverBtn = screen.getByLabelText('Cover Art View');
    const queueBtn = screen.getByLabelText('Play Queue View');
    const videoBtn = screen.getByLabelText('Official Video View');
    const lyricsBtn = screen.getByLabelText('Synchronized Lyrics View');

    // Switch to Queue
    fireEvent.click(queueBtn);
    expect(usePlayerStore.getState().fullscreenTab).toBe('queue');

    // Switch to Cover
    fireEvent.click(coverBtn);
    expect(usePlayerStore.getState().fullscreenTab).toBe('art');
    expect(screen.getByText('Now Playing Showcase')).toBeInTheDocument();

    // Switch to Video
    fireEvent.click(videoBtn);
    expect(usePlayerStore.getState().fullscreenTab).toBe('video');

    // Switch back to Lyrics
    fireEvent.click(lyricsBtn);
    expect(usePlayerStore.getState().fullscreenTab).toBe('lyrics');
  });

  it('renders collapse button and exits fullscreen on click or Escape', () => {
    renderWithRouter(<FullScreenPlayer />);

    const collapseBtn = screen.getByLabelText('Collapse Fullscreen Player');
    expect(collapseBtn).toBeInTheDocument();

    fireEvent.click(collapseBtn);
    expect(usePlayerStore.getState().isPlayerExpanded).toBe(false);

    // Reopen and test Escape
    usePlayerStore.setState({ isPlayerExpanded: true });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(usePlayerStore.getState().isPlayerExpanded).toBe(false);
  });
});
