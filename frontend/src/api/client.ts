import {
  HomeResponse,
  SearchResults,
  Track,
  Album,
  Artist,
  LyricsResponse,
  SongContextResponse,
} from '@/types/music';

const BASE_URL = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, options);
  if (!res.ok) {
    let errorDetail = `Request failed: ${res.statusText}`;
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.error || errorDetail;
    } catch {}
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  getHome: (limit = 8) => fetchJson<HomeResponse>(`/home?limit=${limit}`),

  search: (query: string, filter?: string, limit = 20, signal?: AbortSignal) => {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    if (filter) params.append('filter', filter);
    return fetchJson<SearchResults>(`/search?${params.toString()}`, { signal });
  },

  getSuggestions: (query: string) =>
    fetchJson<string[]>(`/search/suggestions?q=${encodeURIComponent(query)}`),

  getSong: (videoId: string) => fetchJson<Track>(`/songs/${videoId}`),

  getSongContext: (videoId: string, signal?: AbortSignal) =>
    fetchJson<SongContextResponse>(`/songs/${videoId}/context`, { signal }),

  getWatchPlaylist: (videoId: string, playlistId?: string) => {
    const query = playlistId ? `?playlist_id=${playlistId}` : '';
    return fetchJson<{ videoId: string; playlistId?: string; lyricsBrowseId?: string; tracks: Track[] }>(
      `/songs/${videoId}/watch${query}`
    );
  },

  getAlbum: (browseId: string) => fetchJson<Album>(`/albums/${browseId}`),

  getArtist: (channelId: string) => fetchJson<Artist>(`/artists/${channelId}`),

  updatePlaylist: (id: string, payload: { title: string; description: string }) => fetchJson('/playlists/' + encodeURIComponent(id), {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)}),
  getPlaylist: (playlistId: string) => fetchJson<any>(`/playlists/${playlistId}`),

  getLyrics: (videoId: string) => fetchJson<LyricsResponse>(`/lyrics/${videoId}`),

  getCharts: (country = 'ZZ') =>
    fetchJson<{ country: string; videos: Track[]; artists: any[] }>(`/charts?country=${country}`),

  getMoods: () => fetchJson<Record<string, any>>('/moods'),

  getMoodPlaylists: (params: string) =>
    fetchJson<any[]>(`/moods/playlists?params=${encodeURIComponent(params)}`),

  getRecommendations: (limit = 20) =>
    fetchJson<Track[]>(`/recommendations?limit=${limit}`),

  getTrackRadio: (videoId: string, limit = 50) =>
    fetchJson<Track[]>(`/recommendations/radio/${videoId}?limit=${limit}`),

  getAuthStatus: () =>
    fetchJson<{
      isAuthenticated: boolean;
      mode: string;
      features: Record<string, boolean>;
    }>('/auth/status'),

  importSpotify: (url: string, limit = 50) =>
    fetchJson<{
      source: string;
      title: string;
      author: string;
      thumbnail_url?: string;
      track_count: number;
      tracks: Track[];
    }>('/import/spotify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, limit }),
    }),

  importYouTube: (url: string) =>
    fetchJson<{
      source: string;
      title: string;
      description?: string;
      thumbnail_url?: string;
      track_count: number;
      tracks: Track[];
    }>('/import/youtube', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }),

  importM3U: (content: string, title?: string) =>
    fetchJson<{
      source: string;
      title: string;
      track_count: number;
      tracks: Track[];
    }>('/import/m3u', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title }),
    }),
};

