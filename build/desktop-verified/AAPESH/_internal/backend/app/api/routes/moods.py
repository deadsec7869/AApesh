from fastapi import APIRouter, Query
from backend.app.services.ytmusic_service import ytmusic_service

router = APIRouter(prefix="/moods", tags=["Moods & Genres"])


@router.get("")
def get_mood_categories():
    """Retrieve mood and genre category shelves."""
    return ytmusic_service.get_mood_categories()


@router.get("/playlists")
def get_mood_playlists(params: str = Query(..., description="Params token from category")):
    """Retrieve playlists for a selected mood or genre category."""
    return ytmusic_service.get_mood_playlists(params=params)
