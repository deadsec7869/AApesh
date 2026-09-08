from typing import Optional, List
from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from backend.app.services.ytmusic_service import ytmusic_service
from backend.app.schemas.music import SearchResults
from backend.app.db.database import get_db
from backend.app.models.search_history import SearchHistory

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=SearchResults)
def search_music(
    q: str = Query(..., min_length=1),
    filter: Optional[str] = Query(None, description="songs, albums, artists, playlists, videos"),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Search for songs, albums, artists, playlists, and videos with caching."""
    # Record to search history
    try:
        clean_q = q.strip()
        existing = db.query(SearchHistory).filter(SearchHistory.query == clean_q).first()
        if existing:
            existing.searched_at = datetime.now(timezone.utc)
        else:
            db.add(SearchHistory(query=clean_q))
        db.commit()
    except Exception:
        db.rollback()

    return ytmusic_service.search(query=q, filter_type=filter, limit=limit)


@router.get("/suggestions", response_model=List[str])
def search_suggestions(q: str = Query(..., min_length=1)):
    """Fetch instant auto-complete suggestions."""
    return ytmusic_service.get_search_suggestions(query=q)


@router.get("/history")
def get_search_history(limit: int = Query(10, ge=1, le=30), db: Session = Depends(get_db)):
    """Get recent search queries."""
    items = db.query(SearchHistory).order_by(SearchHistory.searched_at.desc()).limit(limit).all()
    return [i.to_dict() for i in items]


@router.delete("/history")
def clear_search_history(db: Session = Depends(get_db)):
    """Clear all search history."""
    db.query(SearchHistory).delete()
    db.commit()
    return {"status": "success", "message": "Search history cleared"}
