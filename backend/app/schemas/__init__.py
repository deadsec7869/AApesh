from backend.app.schemas.music import (
    Track,
    ArtistBasic,
    AlbumBasic,
    Artist,
    Album,
    PlaylistSummary,
    ShelfItem,
    Shelf,
    HomeResponse,
    SearchResults,
    LyricsResponse,
    Thumbnail,
)
from backend.app.schemas.playlist import (
    PlaylistCreate,
    PlaylistUpdate,
    AddTrackRequest,
    ReorderTrackRequest,
)
from backend.app.schemas.user import (
    LikeRequest,
    HistoryRecordRequest,
    PreferenceUpdateRequest,
)

__all__ = [
    "Track",
    "ArtistBasic",
    "AlbumBasic",
    "Artist",
    "Album",
    "PlaylistSummary",
    "ShelfItem",
    "Shelf",
    "HomeResponse",
    "SearchResults",
    "LyricsResponse",
    "Thumbnail",
    "PlaylistCreate",
    "PlaylistUpdate",
    "AddTrackRequest",
    "ReorderTrackRequest",
    "LikeRequest",
    "HistoryRecordRequest",
    "PreferenceUpdateRequest",
]
