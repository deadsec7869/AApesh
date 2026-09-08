from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.services.recommendation_service import recommendation_service

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get("")
def get_user_recommendations(limit: int = Query(20, ge=1, le=50), db: Session = Depends(get_db)):
    """Fetch smart personalized recommendations based on listening history."""
    return recommendation_service.get_recommendations_for_user(db=db, limit=limit)


@router.get("/radio/{video_id}")
def get_track_radio(video_id: str, limit: int = Query(50, ge=1, le=100)):
    """Fetch dynamic radio tracks seeded from a given song."""
    return recommendation_service.get_radio_for_track(video_id=video_id, limit=limit)
