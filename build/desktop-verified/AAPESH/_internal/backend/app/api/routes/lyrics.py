from fastapi import APIRouter
from backend.app.services.ytmusic_service import ytmusic_service
from backend.app.schemas.music import LyricsResponse

router = APIRouter(prefix="/lyrics", tags=["Lyrics"])


@router.get("/{video_id}", response_model=LyricsResponse)
def get_track_lyrics(video_id: str):
    """Retrieve lyrics for a given track."""
    return ytmusic_service.get_lyrics(video_id)
