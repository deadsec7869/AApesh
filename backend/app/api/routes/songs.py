from typing import Optional
from fastapi import APIRouter, Query
from backend.app.services.ytmusic_service import ytmusic_service
from backend.app.schemas.music import Track

router = APIRouter(prefix="/songs", tags=["Songs"])


@router.get("/{video_id}", response_model=Track)
def get_song_details(video_id: str):
    """Retrieve detailed song metadata."""
    return ytmusic_service.get_song(video_id)


@router.get("/{video_id}/watch")
def get_song_watch_playlist(video_id: str, playlist_id: Optional[str] = Query(None)):
    """Fetch watch playlist (radio/queue) related to a song."""
    return ytmusic_service.get_watch_playlist(video_id, playlist_id)
