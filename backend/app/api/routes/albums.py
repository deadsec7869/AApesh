from fastapi import APIRouter, HTTPException
from backend.app.services.ytmusic_service import ytmusic_service
from backend.app.schemas.music import Album

router = APIRouter(prefix="/albums", tags=["Albums"])


@router.get("/{browse_id}", response_model=Album)
def get_album_details(browse_id: str):
    """Fetch album tracks and metadata."""
    data = ytmusic_service.get_album(browse_id)
    if "error" in data:
        raise HTTPException(status_code=404, detail=f"Album not found: {data['error']}")
    return data
