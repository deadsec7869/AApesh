from fastapi import APIRouter, Query
from backend.app.services.ytmusic_service import ytmusic_service

router = APIRouter(prefix="/charts", tags=["Charts"])


@router.get("")
def get_charts(country: str = Query("ZZ", description="Country code (e.g. US, GB, ZZ)")):
    """Fetch trending video tracks and top artists for the charts."""
    return ytmusic_service.get_charts(country=country)
