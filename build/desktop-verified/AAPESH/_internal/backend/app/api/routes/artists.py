from fastapi import APIRouter, HTTPException
from backend.app.services.ytmusic_service import ytmusic_service
from backend.app.schemas.music import Artist

router = APIRouter(prefix="/artists", tags=["Artists"])


@router.get("/{channel_id}", response_model=Artist)
def get_artist_details(channel_id: str):
    """Fetch artist profile, top tracks, albums, singles, and related artists."""
    data = ytmusic_service.get_artist(channel_id)
    if "error" in data:
        raise HTTPException(status_code=404, detail=f"Artist not found: {data['error']}")
    return data
