import logging
from typing import Optional, List
from fastapi import APIRouter, Query, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from backend.app.services.ytmusic_service import ytmusic_service
from backend.app.schemas.music import SearchResults
from backend.app.db.database import get_db
from backend.app.models.search_history import SearchHistory

logger = logging.getLogger("aurora.search")

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=SearchResults)
def search_music(
    q: str = Query(..., min_length=1),
    filter: Optional[str] = Query(None, description="songs, albums, artists, playlists, videos"),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Search for songs, albums, artists, playlists, and videos with caching."""
    clean_q = q.strip()
    if not clean_q:
        return SearchResults(query=q)

    # Record to search history
    try:
        existing = db.query(SearchHistory).filter(SearchHistory.query == clean_q).first()
        if existing:
            existing.searched_at = datetime.now(timezone.utc)
        else:
            db.add(SearchHistory(query=clean_q))
        db.commit()
    except Exception:
        db.rollback()

    # Sanitize filter parameter
    clean_filter = filter.lower().strip() if filter else None
    if clean_filter == "all" or clean_filter not in {"songs", "albums", "artists", "playlists", "videos"}:
        clean_filter = None

    try:
        return ytmusic_service.search(query=clean_q, filter_type=clean_filter, limit=limit)
    except Exception as e:
        logger.error("Search failed for query %r (filter=%r): %s", clean_q, clean_filter, e)
        raise HTTPException(
            status_code=503,
            detail=f"Music search service unavailable: {str(e)}"
        )


@router.get("/suggestions", response_model=List[str])
def search_suggestions(q: str = Query(..., min_length=1)):
    """Fetch instant auto-complete suggestions."""
    clean_q = q.strip()
    if not clean_q:
        return []
    try:
        return ytmusic_service.get_search_suggestions(query=clean_q)
    except Exception as e:
        logger.warning("Error fetching suggestions for %r: %s", clean_q, e)
        return []


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


@router.delete("/history/{item_id}")
def delete_search_history_item(item_id: str, db: Session = Depends(get_db)):
    """Delete a single search history item by ID."""
    item = db.query(SearchHistory).filter(SearchHistory.id == item_id).first()
    if item:
        db.delete(item)
        db.commit()
    return {"status": "success", "message": "History item removed"}

