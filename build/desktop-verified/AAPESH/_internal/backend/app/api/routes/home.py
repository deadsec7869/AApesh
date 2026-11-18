from fastapi import APIRouter, Query
from backend.app.services.ytmusic_service import ytmusic_service
from backend.app.schemas.music import HomeResponse

router = APIRouter(prefix="/home", tags=["Home"])


@router.get("", response_model=HomeResponse)
def get_home_feed(limit: int = Query(8, ge=1, le=20)):
    """Fetch personalized/trending home shelves from YouTube Music."""
    return ytmusic_service.get_home(limit=limit)
