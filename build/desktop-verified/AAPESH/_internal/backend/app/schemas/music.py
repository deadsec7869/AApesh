import re
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, field_validator


class Thumbnail(BaseModel):
    url: str
    width: Optional[int] = None
    height: Optional[int] = None


class ArtistBasic(BaseModel):
    id: Optional[str] = None
    name: str
    thumbnails: List[Thumbnail] = Field(default_factory=list)
    thumbnail: Optional[str] = ""
    subscribers: Optional[str] = None

    @field_validator("name", mode="before")
    @classmethod
    def coerce_name(cls, v: Any) -> str:
        if not v:
            return "Unknown Artist"
        return str(v)


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

    @field_validator("videoId", mode="before")
    @classmethod
    def coerce_video_id(cls, v: Any) -> str:
        if not v:
            return ""
        return str(v)

    @field_validator("title", mode="before")
    @classmethod
    def coerce_title(cls, v: Any) -> str:
        if not v:
            return "Unknown Title"
        return str(v)


class AlbumBasic(BaseModel):
    browseId: str
    title: str
    type: Optional[str] = "Album"
    year: Optional[str] = None
    artists: List[ArtistBasic] = Field(default_factory=list)
    thumbnails: List[Thumbnail] = Field(default_factory=list)
    thumbnail: Optional[str] = ""
    trackCount: Optional[int] = None

    @field_validator("trackCount", mode="before")
    @classmethod
    def coerce_track_count(cls, v: Any) -> Optional[int]:
        if v is None:
            return None
        if isinstance(v, int):
            return v
        if isinstance(v, str):
            m = re.search(r'\d+', v.replace(',', ''))
            return int(m.group(0)) if m else None
        return None

    @field_validator("year", mode="before")
    @classmethod
    def coerce_year(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        return str(v)


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
    videos: List[Track] = Field(default_factory=list)
    featuredRelease: Optional[AlbumBasic] = None
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

    @field_validator("author", mode="before")
    @classmethod
    def coerce_author(cls, v: Any) -> Optional[str]:
        if not v:
            return ""
        if isinstance(v, str):
            return v
        if isinstance(v, list):
            names = [str(x.get("name") if isinstance(x, dict) else x) for x in v if x]
            return ", ".join(names)
        if isinstance(v, dict):
            return str(v.get("name") or "")
        return str(v)

    @field_validator("itemCount", mode="before")
    @classmethod
    def coerce_item_count(cls, v: Any) -> Optional[int]:
        if v is None:
            return 0
        if isinstance(v, int):
            return v
        if isinstance(v, str):
            m = re.search(r'\d+', v.replace(',', ''))
            return int(m.group(0)) if m else 0
        return 0


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


class SongCreditSection(BaseModel):
    localized_title: str
    data: List[str] = Field(default_factory=list)


class SongCredits(BaseModel):
    performed_by: Optional[SongCreditSection] = None
    written_by: Optional[SongCreditSection] = None
    produced_by: Optional[SongCreditSection] = None
    composed_by: Optional[SongCreditSection] = None
    music_metadata_provided_by: Optional[SongCreditSection] = None
    other_sections: List[SongCreditSection] = Field(default_factory=list)


class ArtistSummary(BaseModel):
    id: Optional[str] = None
    name: str
    subscribers: Optional[str] = None
    thumbnail: Optional[str] = None
    description: Optional[str] = None


class AlbumSummary(BaseModel):
    browseId: str
    title: str
    year: Optional[str] = None
    trackCount: Optional[int] = None
    thumbnail: Optional[str] = None
    artists: List[ArtistBasic] = Field(default_factory=list)


class SongRelatedContext(BaseModel):
    fromAlbum: List[Track] = Field(default_factory=list)
    moreFromArtist: List[Track] = Field(default_factory=list)
    youMightLike: List[Track] = Field(default_factory=list)


class LyricsContextInfo(BaseModel):
    hasLyrics: bool = False
    synced: bool = False
    provider: Optional[str] = None
    language: Optional[str] = None


class SongContextResponse(BaseModel):
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
    year: Optional[str] = None
    releaseDate: Optional[str] = None
    genre: Optional[str] = None
    albumType: Optional[str] = None
    language: Optional[str] = None
    artistDetails: Optional[ArtistSummary] = None
    albumDetails: Optional[AlbumSummary] = None
    credits: Optional[SongCredits] = None
    related: Optional[SongRelatedContext] = None
    lyricsInfo: Optional[LyricsContextInfo] = None
    dataSource: Optional[str] = "YouTube Music"


