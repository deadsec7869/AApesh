from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from backend.app.db.database import get_db
from backend.app.models.playlist import Playlist, PlaylistTrack
from backend.app.schemas.playlist import (
    PlaylistCreate,
    PlaylistUpdate,
    AddTrackRequest,
    ReorderTrackRequest,
)
from backend.app.services.ytmusic_service import ytmusic_service

router = APIRouter(prefix="/playlists", tags=["Playlists"])


@router.get("")
def list_user_playlists(db: Session = Depends(get_db)):
    """List all custom playlists created by the user."""
    playlists = db.query(Playlist).order_by(Playlist.created_at.desc()).all()
    return [p.to_dict() for p in playlists]


@router.post("", status_code=201)
def create_playlist(payload: PlaylistCreate, db: Session = Depends(get_db)):
    """Create a new custom playlist."""
    new_pl = Playlist(
        title=payload.title,
        description=payload.description or "",
        thumbnail_url=payload.thumbnail_url or "",
    )
    db.add(new_pl)
    db.commit()
    db.refresh(new_pl)
    return new_pl.to_dict()


@router.get("/{playlist_id}")
def get_playlist(playlist_id: str, db: Session = Depends(get_db)):
    """
    Get playlist by ID.
    Checks local custom database first, then falls back to YouTube Music.
    """
    local_pl = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if local_pl:
        return local_pl.to_dict()

    # Query YouTube Music
    data = ytmusic_service.get_playlist(playlist_id)
    if "error" in data:
        raise HTTPException(status_code=404, detail=f"Playlist not found: {data['error']}")
    return data


@router.patch("/{playlist_id}")
def update_playlist(
    playlist_id: str,
    payload: PlaylistUpdate,
    db: Session = Depends(get_db)
):
    """Update title, description, or thumbnail of a custom playlist."""
    pl = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not pl:
        raise HTTPException(status_code=404, detail="Custom playlist not found")

    if payload.title is not None:
        pl.title = payload.title
    if payload.description is not None:
        pl.description = payload.description
    if payload.thumbnail_url is not None:
        pl.thumbnail_url = payload.thumbnail_url

    pl.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pl)
    return pl.to_dict()


@router.delete("/{playlist_id}")
def delete_playlist(playlist_id: str, db: Session = Depends(get_db)):
    """Delete a custom playlist."""
    pl = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not pl:
        raise HTTPException(status_code=404, detail="Custom playlist not found")

    db.delete(pl)
    db.commit()
    return {"status": "success", "message": "Playlist deleted successfully"}


@router.post("/{playlist_id}/tracks")
def add_track_to_playlist(
    playlist_id: str,
    payload: AddTrackRequest,
    db: Session = Depends(get_db)
):
    """Add a track to a custom playlist."""
    pl = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not pl:
        raise HTTPException(status_code=404, detail="Custom playlist not found")

    current_count = len(pl.tracks)
    new_track = PlaylistTrack(
        playlist_id=pl.id,
        video_id=payload.videoId,
        title=payload.title,
        artist=payload.artist or "Unknown Artist",
        album=payload.album or "",
        thumbnail_url=payload.thumbnail_url or "",
        duration=payload.duration or "0:00",
        duration_seconds=payload.duration_seconds or 0,
        position=current_count,
    )
    db.add(new_track)
    pl.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pl)
    return pl.to_dict()


@router.delete("/{playlist_id}/tracks/{track_id}")
def remove_track_from_playlist(
    playlist_id: str,
    track_id: str,
    db: Session = Depends(get_db)
):
    """Remove a track from a custom playlist."""
    pl = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not pl:
        raise HTTPException(status_code=404, detail="Custom playlist not found")

    track = db.query(PlaylistTrack).filter(
        PlaylistTrack.id == track_id,
        PlaylistTrack.playlist_id == playlist_id
    ).first()

    if not track:
        raise HTTPException(status_code=404, detail="Track not found in playlist")

    db.delete(track)
    # Re-normalize positions
    remaining_tracks = db.query(PlaylistTrack).filter(
        PlaylistTrack.playlist_id == playlist_id
    ).order_by(PlaylistTrack.position).all()

    for idx, t in enumerate(remaining_tracks):
        t.position = idx

    pl.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pl)
    return pl.to_dict()


@router.post("/{playlist_id}/reorder")
def reorder_playlist_tracks(
    playlist_id: str,
    payload: ReorderTrackRequest,
    db: Session = Depends(get_db)
):
    """Reorder a track within the custom playlist."""
    pl = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not pl:
        raise HTTPException(status_code=404, detail="Custom playlist not found")

    track = db.query(PlaylistTrack).filter(
        PlaylistTrack.id == payload.track_id,
        PlaylistTrack.playlist_id == playlist_id
    ).first()

    if not track:
        raise HTTPException(status_code=404, detail="Track not found in playlist")

    tracks = db.query(PlaylistTrack).filter(
        PlaylistTrack.playlist_id == playlist_id
    ).order_by(PlaylistTrack.position).all()

    # Reorder list in memory
    tracks = [t for t in tracks if t.id != track.id]
    target_pos = max(0, min(payload.new_position, len(tracks)))
    tracks.insert(target_pos, track)

    for idx, t in enumerate(tracks):
        t.position = idx

    pl.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pl)
    return pl.to_dict()
