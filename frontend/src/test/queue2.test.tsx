import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { QueuePanel, QueueWorkstationContent } from '@/components/player/QueuePanel';
import { Track } from '@/types/music';

const mockTrack1: Track = {
  videoId: 'q_song_1',
  title: 'Starboy',
  artists: [{ name: 'The Weeknd', id: 'art_weeknd' }],
  album: 'Starboy',
  albumId: 'alb_starboy',
  duration: '3:50',
  duration_seconds: 230,
  thumbnail: 'https://example.com/starboy.jpg',
  isExplicit: true,
};

const mockTrack2: Track = {
  videoId: 'q_song_2',
  title: 'Blinding Lights',
  artists: [{ name: 'The Weeknd', id: 'art_weeknd' }],
  album: 'After Hours',
  albumId: 'alb_afterhours',
  duration: '3:20',
  duration_seconds: 200,
  thumbnail: 'https://example.com/blinding.jpg',
  isExplicit: false,
};

const mockTrack3: Track = {
  videoId: 'q_song_3',
  title: 'Die For You',
  artists: [{ name: 'The Weeknd', id: 'art_weeknd' }],
  album: 'Starboy',
  albumId: 'alb_starboy',
  duration: '4:20',
  duration_seconds: 260,
  thumbnail: 'https://example.com/dieforyou.jpg',
  isExplicit: false,
};

const mockTrackDuplicate: Track = {
  videoId: 'q_song_2',
  title: 'Blinding Lights',
  artists: [{ name: 'The Weeknd', id: 'art_weeknd' }],
  album: 'After Hours',
  albumId: 'alb_afterhours',
  duration: '3:20',
  duration_seconds: 200,
  thumbnail: 'https://example.com/blinding.jpg',
  isExplicit: false,
};

describe('AAPESH Queue 2.0 (Workstation Queue + Drag & Drop + State Preserved)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlayerStore.setState({
      currentTrack: mockTrack1,
      queue: [mockTrack1, mockTrack2, mockTrack3],
      originalQueue: [mockTrack1, mockTrack2, mockTrack3],
      currentIndex: 0,
      isPlaying: true,
      isBuffering: false,
      isQueueOpen: true,
      shuffleMode: 'off',
      repeatMode: 'off',
      autoplayEnabled: true,
    });
  });

  it('renders Queue 2.0 panel with header, count, currently playing track, and upcoming tracks', () => {
    render(
      <BrowserRouter>
        <QueuePanel />
      </BrowserRouter>
    );

    expect(screen.getByRole('dialog', { name: /play queue/i })).toBeInTheDocument();
    expect(screen.getByText(/3 tracks/i)).toBeInTheDocument();
    expect(screen.getByText(/currently playing/i)).toBeInTheDocument();
    expect(screen.getAllByText('Starboy').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/up next \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText('Blinding Lights')).toBeInTheDocument();
    expect(screen.getByText('Die For You')).toBeInTheDocument();
  });

  it('calculates total remaining duration for upcoming tracks accurately', () => {
    render(
      <BrowserRouter>
        <QueuePanel />
      </BrowserRouter>
    );

    // mockTrack2 (200s) + mockTrack3 (260s) = 460s = 7 min
    expect(screen.getByText(/7 min/i)).toBeInTheDocument();
  });

  it('cycles shuffle mode between off, standard, and smart shuffle without corrupting playback', () => {
    render(
      <BrowserRouter>
        <QueuePanel />
      </BrowserRouter>
    );

    const shuffleBtn = screen.getByTitle(/shuffle off/i);
    expect(shuffleBtn).toBeInTheDocument();

    // Click to cycle -> standard
    fireEvent.click(shuffleBtn);
    expect(usePlayerStore.getState().shuffleMode).toBe('standard');

    // Click to cycle -> smart
    fireEvent.click(screen.getByTitle(/standard shuffle/i));
    expect(usePlayerStore.getState().shuffleMode).toBe('smart');

    // Click to cycle -> off
    fireEvent.click(screen.getByTitle(/smart shuffle/i));
    expect(usePlayerStore.getState().shuffleMode).toBe('off');
  });

  it('cycles repeat mode between off, queue, and track', () => {
    render(
      <BrowserRouter>
        <QueuePanel />
      </BrowserRouter>
    );

    const repeatBtn = screen.getByTitle(/repeat off/i);
    fireEvent.click(repeatBtn);
    expect(usePlayerStore.getState().repeatMode).toBe('queue');

    fireEvent.click(screen.getByTitle(/repeat entire queue/i));
    expect(usePlayerStore.getState().repeatMode).toBe('track');

    fireEvent.click(screen.getByTitle(/repeat current track/i));
    expect(usePlayerStore.getState().repeatMode).toBe('off');
  });

  it('toggles autoplay state cleanly', () => {
    render(
      <BrowserRouter>
        <QueuePanel />
      </BrowserRouter>
    );

    const autoplayBtn = screen.getByTitle(/autoplay active/i);
    fireEvent.click(autoplayBtn);
    expect(usePlayerStore.getState().autoplayEnabled).toBe(false);

    fireEvent.click(screen.getByTitle(/autoplay off/i));
    expect(usePlayerStore.getState().autoplayEnabled).toBe(true);
  });

  it('removes an upcoming track from the queue', () => {
    render(
      <BrowserRouter>
        <QueuePanel />
      </BrowserRouter>
    );

    const removeBtn = screen.getByLabelText(/remove blinding lights from queue/i);
    fireEvent.click(removeBtn);

    const state = usePlayerStore.getState();
    expect(state.queue.length).toBe(2);
    expect(state.queue.find((t) => t.videoId === 'q_song_2')).toBeUndefined();
  });

  it('reorders upcoming tracks using moveQueueItem', () => {
    render(
      <BrowserRouter>
        <QueuePanel />
      </BrowserRouter>
    );

    // Initial order: [Starboy (idx 0), Blinding Lights (idx 1), Die For You (idx 2)]
    // Click move down on Blinding Lights (idx 1) -> moves to idx 2
    const moveDownBtn = screen.getByLabelText(/move blinding lights down/i);
    fireEvent.click(moveDownBtn);

    const updatedQueue = usePlayerStore.getState().queue;
    expect(updatedQueue[1].videoId).toBe('q_song_3'); // Die For You is now idx 1
    expect(updatedQueue[2].videoId).toBe('q_song_2'); // Blinding Lights is now idx 2
  });

  it('supports Play Next button to bump an upcoming track directly to index 1', () => {
    render(
      <BrowserRouter>
        <QueuePanel />
      </BrowserRouter>
    );

    // Die For You is at relativeIndex 1 (actualIndex 2)
    const playNextBtn = screen.getByLabelText(/play die for you next/i);
    fireEvent.click(playNextBtn);

    const updatedQueue = usePlayerStore.getState().queue;
    expect(updatedQueue[1].videoId).toBe('q_song_3'); // Die For You bumped right after current track!
  });

  it('plays an upcoming track when clicked', () => {
    const playQueueIndexSpy = vi.spyOn(usePlayerStore.getState(), 'playQueueIndex');

    render(
      <BrowserRouter>
        <QueuePanel />
      </BrowserRouter>
    );

    const blindingLightsText = screen.getByText('Blinding Lights');
    fireEvent.click(blindingLightsText);

    expect(playQueueIndexSpy).toHaveBeenCalledWith(1);
  });

  it('supports duplicate tracks in the queue without crashing or index corruption', () => {
    usePlayerStore.setState({
      currentTrack: mockTrack1,
      queue: [mockTrack1, mockTrack2, mockTrackDuplicate],
      originalQueue: [mockTrack1, mockTrack2, mockTrackDuplicate],
      currentIndex: 0,
      isQueueOpen: true,
    });

    render(
      <BrowserRouter>
        <QueuePanel />
      </BrowserRouter>
    );

    const blindingInstances = screen.getAllByText('Blinding Lights');
    expect(blindingInstances.length).toBe(2);
  });

  it('renders collapsible Previously Played section when currentIndex > 0', () => {
    usePlayerStore.setState({
      currentTrack: mockTrack2,
      queue: [mockTrack1, mockTrack2, mockTrack3],
      originalQueue: [mockTrack1, mockTrack2, mockTrack3],
      currentIndex: 1,
      isQueueOpen: true,
    });

    render(
      <BrowserRouter>
        <QueuePanel />
      </BrowserRouter>
    );

    expect(screen.getByText(/previously played \(1\)/i)).toBeInTheDocument();

    // Click to expand previously played tracks
    fireEvent.click(screen.getByText(/previously played \(1\)/i));
    expect(screen.getByText('Starboy')).toBeInTheDocument();
  });

  it('renders empty queue state with Discover Music navigation affordance when no upcoming tracks exist', () => {
    usePlayerStore.setState({
      currentTrack: mockTrack1,
      queue: [mockTrack1],
      originalQueue: [mockTrack1],
      currentIndex: 0,
      isQueueOpen: true,
    });

    render(
      <BrowserRouter>
        <QueuePanel />
      </BrowserRouter>
    );

    expect(screen.getByText(/your queue is empty/i)).toBeInTheDocument();
    expect(screen.getByText(/discover music/i)).toBeInTheDocument();
  });

  it('closes queue panel on Escape key press', () => {
    render(
      <BrowserRouter>
        <QueuePanel />
      </BrowserRouter>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(usePlayerStore.getState().isQueueOpen).toBe(false);
  });

  it('renders standalone QueueWorkstationContent in fullscreen mode seamlessly', () => {
    render(
      <BrowserRouter>
        <QueueWorkstationContent isCompactHeader />
      </BrowserRouter>
    );

    expect(screen.getByText(/currently playing/i)).toBeInTheDocument();
    expect(screen.getByText(/up next \(2\)/i)).toBeInTheDocument();
  });
});
