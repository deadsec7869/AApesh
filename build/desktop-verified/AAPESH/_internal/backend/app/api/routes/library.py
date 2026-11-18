from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.models.liked import LikedTrack
from backend.app.models.playlist import Playlist
from backend.app.schemas.user import LikeRequest

router = APIRouter(prefix="/library", tags=["Library"])


@router.get("")
def get_library_overview(db: Session = Depends(get_db)):
    """Fetch user's library summary."""
    liked_count = db.query(LikedTrack).count()
    playlists = db.query(Playlist).order_by(Playlist.updated_at.desc()).all()
    recent_liked = db.query(LikedTrack).order_by(LikedTrack.liked_at.desc()).limit(10).all()

    return {
        "likedCount": liked_count,
        "playlistCount": len(playlists),
        "playlists": [p.to_dict() for p in playlists],
        "recentLiked": [t.to_dict() for t in recent_liked],
    }


@router.get("/liked")
def get_liked_tracks(db: Session = Depends(get_db)):
    """Retrieve all liked tracks ordered by newest first."""
    tracks = db.query(LikedTrack).order_by(LikedTrack.liked_at.desc()).all()
    return [t.to_dict() for t in tracks]


@router.get("/status/{video_id}")
def check_like_status(video_id: str, db: Session = Depends(get_db)):
    """Check if a track is liked."""
    liked = db.query(LikedTrack).filter(LikedTrack.video_id == video_id).first()
    return {"videoId": video_id, "isLiked": bool(liked)}


@router.post("/like", status_code=201)
def like_track(payload: LikeRequest, db: Session = Depends(get_db)):
    """Like a track."""
    existing = db.query(LikedTrack).filter(LikedTrack.video_id == payload.videoId).first()
    if existing:
        return existing.to_dict()

    new_liked = LikedTrack(
        video_id=payload.videoId,
        title=payload.title,
        artist=payload.artist or "Unknown Artist",
        album=payload.album or "",
        thumbnail_url=payload.thumbnail_url or "",
        duration=payload.duration or "0:00",
        duration_seconds=payload.duration_seconds or 0,
    )
    db.add(new_liked)
    db.commit()
    db.refresh(new_liked)
    return new_liked.to_dict()


@router.delete("/like/{video_id}")
def unlike_track(video_id: str, db: Session = Depends(get_db)):
    """Remove a track from liked tracks."""
    existing = db.query(LikedTrack).filter(LikedTrack.video_id == video_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Track is not liked")

    db.delete(existing)
    db.commit()
    return {"status": "success", "message": "Track removed from Liked Songs"}
