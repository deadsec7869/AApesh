from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class Thumbnail(BaseModel):
    url: str
    width: Optional[int] = None
    height: Optional[int] = None


class ArtistBasic(BaseModel):
    id: Optional[str] = None
    name: str


class Track(BaseModel):
    videoId: str
    title: str
    artists: List[ArtistBasic] = Field(default_factory=list)
    album: Optional[str] = None
    albumId: Optional[str] = None
    duration: Optional[str] = "0:00"
    duration_seconds: Optional[int] = 0
    thumbnails: List[Thumbnail] = Field(default_factory=list)
    thumbnail: Optional[str] = ""
    isExplicit: Optional[bool] = False


class AlbumBasic(BaseModel):
    browseId: str
    title: str
    type: Optional[str] = "Album"
    year: Optional[str] = None
    artists: List[ArtistBasic] = Field(default_factory=list)
    thumbnails: List[Thumbnail] = Field(default_factory=list)
    thumbnail: Optional[str] = ""
    trackCount: Optional[int] = None


class Artist(BaseModel):
    channelId: str
    name: str
    description: Optional[str] = None
    subscribers: Optional[str] = None
    views: Optional[str] = None
    thumbnails: List[Thumbnail] = Field(default_factory=list)
    thumbnail: Optional[str] = ""
    topSongs: List[Track] = Field(default_factory=list)
    albums: List[AlbumBasic] = Field(default_factory=list)
    singles: List[AlbumBasic] = Field(default_factory=list)
    relatedArtists: List[ArtistBasic] = Field(default_factory=list)


class Album(BaseModel):
    browseId: str
    title: str
    description: Optional[str] = None
    artists: List[ArtistBasic] = Field(default_factory=list)
    year: Optional[str] = None
    trackCount: Optional[int] = 0
    duration: Optional[str] = None
    thumbnails: List[Thumbnail] = Field(default_factory=list)
    thumbnail: Optional[str] = ""
    tracks: List[Track] = Field(default_factory=list)


class PlaylistSummary(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    author: Optional[str] = ""
    itemCount: Optional[int] = 0
    thumbnails: List[Thumbnail] = Field(default_factory=list)
    thumbnail: Optional[str] = ""


class ShelfItem(BaseModel):
    id: str
    title: str
    subtitle: Optional[str] = ""
    type: str  # "song", "album", "artist", "playlist"
    thumbnail: Optional[str] = ""
    thumbnails: List[Thumbnail] = Field(default_factory=list)
    artists: List[ArtistBasic] = Field(default_factory=list)
    videoId: Optional[str] = None
    browseId: Optional[str] = None
    duration: Optional[str] = None


class Shelf(BaseModel):
    title: str
    contents: List[ShelfItem] = Field(default_factory=list)


class HomeResponse(BaseModel):
    shelves: List[Shelf] = Field(default_factory=list)


class SearchResults(BaseModel):
    query: str
    topResult: Optional[Dict[str, Any]] = None
    songs: List[Track] = Field(default_factory=list)
    albums: List[AlbumBasic] = Field(default_factory=list)
    artists: List[Dict[str, Any]] = Field(default_factory=list)
    playlists: List[PlaylistSummary] = Field(default_factory=list)
    videos: List[Track] = Field(default_factory=list)


class LyricWord(BaseModel):
    text: str
    startTime: int  # milliseconds
    endTime: Optional[int] = None  # milliseconds


class LyricLine(BaseModel):
    id: str
    text: str
    startTime: Optional[int] = None  # milliseconds
    endTime: Optional[int] = None  # milliseconds
    words: Optional[List[LyricWord]] = None
    script: Optional[str] = None  # e.g., "arabic", "devanagari", "bengali", "gurmukhi", "latin", "cjk", etc.
    direction: Optional[str] = None  # "ltr", "rtl", "auto"
    language: Optional[str] = None  # e.g., "ur", "ar", "fa", "hi", "bn", "pa", "en", "unknown"
    translation: Optional[str] = None
    romanization: Optional[str] = None


class LyricsResponse(BaseModel):
    videoId: str
    synced: bool = False
    hasLyrics: bool = False
    lines: List[LyricLine] = Field(default_factory=list)
    lyrics: Optional[str] = None
    source: Optional[str] = None
    provider: Optional[str] = None
    syncConfidence: Optional[str] = None
    lyricsDuration: Optional[float] = None
    mediaDuration: Optional[float] = None
    durationDifference: Optional[float] = None
    primaryScript: Optional[str] = None
    direction: Optional[str] = None  # "ltr", "rtl", "auto"
    language: Optional[str] = None
    instrumental: Optional[bool] = False

