export interface Thumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface ArtistBasic {
  id?: string | null;
  name: string;
}

export interface Track {
  videoId: string;
  title: string;
  artists: ArtistBasic[];
  album?: string | null;
  albumId?: string | null;
  duration?: string;
  duration_seconds?: number;
  thumbnails?: Thumbnail[];
  thumbnail?: string;
  isExplicit?: boolean;
}

export interface AlbumBasic {
  browseId: string;
  title: string;
  type?: string;
  year?: string | null;
  artists?: ArtistBasic[];
  thumbnails?: Thumbnail[];
  thumbnail?: string;
  trackCount?: number | null;
}

export interface Album {
  browseId: string;
  title: string;
  description?: string;
  artists: ArtistBasic[];
  year?: string | null;
  trackCount?: number;
  duration?: string;
  thumbnails?: Thumbnail[];
  thumbnail?: string;
  tracks: Track[];
}

export interface Artist {
  channelId: string;
  name: string;
  description?: string;
  subscribers?: string;
  views?: string;
  thumbnails?: Thumbnail[];
  thumbnail?: string;
  topSongs: Track[];
  albums: AlbumBasic[];
  singles: AlbumBasic[];
  relatedArtists: ArtistBasic[];
}

export interface FollowedArtist {
  id: string;
  name: string;
  thumbnail?: string;
  subscribers?: string;
  songs?: string;
}

export interface PlaylistSummary {
  id: string;
  title: string;
  description?: string;
  author?: string;
  itemCount?: number;
  thumbnails?: Thumbnail[];
  thumbnail?: string;
}

export interface CustomPlaylistTrack {
  id: string;
  playlist_id: string;
  video_id: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail_url?: string;
  duration?: string;
  duration_seconds?: number;
  position: number;
  added_at?: string;
}

export interface CustomPlaylist {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  track_count: number;
  created_at?: string;
  updated_at?: string;
  tracks?: CustomPlaylistTrack[];
}

export interface ShelfItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'song' | 'album' | 'artist' | 'playlist';
  thumbnail?: string;
  thumbnails?: Thumbnail[];
  artists?: ArtistBasic[];
  videoId?: string;
  browseId?: string;
  duration?: string;
}

export interface Shelf {
  title: string;
  contents: ShelfItem[];
}

export interface HomeResponse {
  shelves: Shelf[];
}

export interface SearchResults {
  query: string;
  topResult?: {
    type: string;
    data: any;
  } | null;
  songs: Track[];
  albums: AlbumBasic[];
  artists: {
    channelId: string;
    name: string;
    subscribers?: string;
    thumbnail?: string;
  }[];
  playlists: PlaylistSummary[];
  videos: Track[];
}

export interface LyricWord {
  text: string;
  startTime: number;
  endTime?: number;
}

export interface LyricLine {
  id: string;
  text: string;
  startTime?: number;
  endTime?: number;
  words?: LyricWord[];
  script?: string;
  direction?: 'ltr' | 'rtl' | 'auto';
  language?: string;
  translation?: string;
  romanization?: string;
}

export interface LyricsResponse {
  videoId: string;
  synced: boolean;
  hasLyrics: boolean;
  lines: LyricLine[];
  lyrics?: string | null;
  source?: string | null;
  provider?: 'youtube_musixmatch' | 'open_synced_lrclib' | 'lrclib' | string | null;
  syncConfidence?: 'excellent' | 'good' | 'uncertain' | 'poor' | null;
  lyricsDuration?: number | null;
  mediaDuration?: number | null;
  durationDifference?: number | null;
  primaryScript?: string | null;
  direction?: 'ltr' | 'rtl' | 'auto' | null;
  language?: string | null;
  instrumental?: boolean;
}

export type RepeatMode = 'off' | 'queue' | 'track';

export interface PlaybackHistoryItem {
  id: string;
  video_id: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail_url?: string;
  duration?: string;
  played_at?: string;
  play_count: number;
}
