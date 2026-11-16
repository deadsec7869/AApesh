import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlaylistImportModal } from '../components/common/PlaylistImportModal';
import { api } from '../api/client';
import { useLibraryStore } from '../stores/useLibraryStore';
import { Track } from '../types/music';

const mockTrack1: Track = {
  videoId: 'yt_match_1',
  title: 'Starboy',
  artists: [{ name: 'The Weeknd' }],
  duration: '3:50',
  duration_seconds: 230,
};

const mockTrack2: Track = {
  videoId: 'yt_match_2',
  title: 'I Feel It Coming',
  artists: [{ name: 'The Weeknd' }],
  duration: '4:29',
  duration_seconds: 269,
};

describe('PlaylistImportModal Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <MemoryRouter>
        <PlaylistImportModal isOpen={false} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(screen.queryByText(/Import External Playlist/i)).toBeNull();
  });

  it('renders modal tabs and input when isOpen is true', () => {
    render(
      <MemoryRouter>
        <PlaylistImportModal isOpen={true} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('Import External Playlist')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Spotify URL/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /YouTube Music/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /M3U \/ M3U8 File/i })).toBeInTheDocument();
  });

  it('switches to YouTube Music tab and updates placeholder', () => {
    render(
      <MemoryRouter>
        <PlaylistImportModal isOpen={true} onClose={() => {}} />
      </MemoryRouter>
    );
    const ytTab = screen.getByRole('button', { name: /YouTube Music/i });
    fireEvent.click(ytTab);

    expect(screen.getByPlaceholderText(/music\.youtube\.com\/playlist/i)).toBeInTheDocument();
  });

  it('analyzes Spotify URL and displays matched review list', async () => {
    vi.spyOn(api, 'importSpotify').mockResolvedValueOnce({
      source: 'spotify',
      title: 'The Weeknd Greatest Hits',
      author: 'Spotify User',
      track_count: 2,
      tracks: [mockTrack1, mockTrack2],
    });

    render(
      <MemoryRouter>
        <PlaylistImportModal isOpen={true} onClose={() => {}} />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/open\.spotify\.com\/playlist/i);
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M' } });

    const analyzeBtn = screen.getByRole('button', { name: /Analyze & Match Tracks/i });
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(screen.getByDisplayValue('The Weeknd Greatest Hits')).toBeInTheDocument();
    });

    expect(screen.getByText('Starboy')).toBeInTheDocument();
    expect(screen.getByText('I Feel It Coming')).toBeInTheDocument();
    expect(screen.getByText(/2 tracks matched • 2 selected/i)).toBeInTheDocument();
  });

  it('saves selected tracks to useLibraryStore on import confirmation', async () => {
    vi.spyOn(api, 'importSpotify').mockResolvedValueOnce({
      source: 'spotify',
      title: 'The Weeknd Greatest Hits',
      author: 'Spotify User',
      track_count: 2,
      tracks: [mockTrack1, mockTrack2],
    });

    const mockCreate = vi.fn().mockResolvedValue({ id: 'pl_imported_1', title: 'The Weeknd Greatest Hits' });
    const mockAdd = vi.fn().mockResolvedValue(true);

    useLibraryStore.setState({
      createPlaylist: mockCreate,
      addTrackToPlaylist: mockAdd,
    });

    render(
      <MemoryRouter>
        <PlaylistImportModal isOpen={true} onClose={() => {}} />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/open\.spotify\.com\/playlist/i);
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/playlist/12345' } });

    fireEvent.click(screen.getByRole('button', { name: /Analyze & Match Tracks/i }));

    await waitFor(() => {
      expect(screen.getByText('Starboy')).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole('button', { name: /Save \(2\) to My Library/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith('The Weeknd Greatest Hits', 'Imported from SPOTIFY');
      expect(mockAdd).toHaveBeenCalledTimes(2);
    });
  });
});

