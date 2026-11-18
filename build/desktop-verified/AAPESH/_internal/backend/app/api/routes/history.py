from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.app.db.database import get_db
from backend.app.models.history import PlaybackHistory
from backend.app.schemas.user import HistoryRecordRequest

router = APIRouter(prefix="/history", tags=["History"])


@router.get("")
def get_playback_history(limit: int = Query(50, ge=1, le=100), db: Session = Depends(get_db)):
    """Retrieve playback history list."""
    history = db.query(PlaybackHistory).order_by(PlaybackHistory.played_at.desc()).limit(limit).all()
    return [h.to_dict() for h in history]


@router.post("", status_code=201)
def record_playback(payload: HistoryRecordRequest, db: Session = Depends(get_db)):
    """Record or update a played track."""
    existing = db.query(PlaybackHistory).filter(PlaybackHistory.video_id == payload.videoId).first()
    if existing:
        existing.played_at = datetime.now(timezone.utc)
        existing.play_count += 1
        if payload.thumbnail_url:
            existing.thumbnail_url = payload.thumbnail_url
        db.commit()
        db.refresh(existing)
        return existing.to_dict()

    new_entry = PlaybackHistory(
        video_id=payload.videoId,
        title=payload.title,
        artist=payload.artist or "Unknown Artist",
        album=payload.album or "",
        thumbnail_url=payload.thumbnail_url or "",
        duration=payload.duration or "0:00",
        played_at=datetime.now(timezone.utc),
        play_count=1,
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry.to_dict()


@router.delete("")
def clear_playback_history(db: Session = Depends(get_db)):
    """Clear all playback history."""
    db.query(PlaybackHistory).delete()
    db.commit()
    return {"status": "success", "message": "History cleared"}


@router.delete("/{history_id}")
def delete_history_item(history_id: str, db: Session = Depends(get_db)):
    """Delete a specific history entry."""
    entry = db.query(PlaybackHistory).filter(PlaybackHistory.id == history_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="History entry not found")
    db.delete(entry)
    db.commit()
    return {"status": "success", "message": "History entry deleted"}
