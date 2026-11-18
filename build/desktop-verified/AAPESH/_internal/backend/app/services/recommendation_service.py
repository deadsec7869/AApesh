import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.services.ytmusic_service import ytmusic_service
from backend.app.models.history import PlaybackHistory
from backend.app.models.liked import LikedTrack

logger = logging.getLogger("aurora.recommendation")


class RecommendationService:
    def __init__(self, yt_service=None):
        self.yt = yt_service or ytmusic_service

    def get_recommendations_for_user(self, db: Session, limit: int = 20) -> List[Dict[str, Any]]:
        # 1. Try to find user's last played or most played tracks
        recent_history = db.query(PlaybackHistory).order_by(PlaybackHistory.played_at.desc()).limit(3).all()
        liked_tracks = db.query(LikedTrack).order_by(LikedTrack.liked_at.desc()).limit(3).all()

        seed_video_id = None
        if recent_history:
            seed_video_id = recent_history[0].video_id
        elif liked_tracks:
            seed_video_id = liked_tracks[0].video_id

        # If we have a seed track, fetch its watch playlist (radio)
        if seed_video_id:
            try:
                watch_data = self.yt.get_watch_playlist(seed_video_id)
                tracks = watch_data.get("tracks", [])
                if tracks:
                    # Filter out the seed track itself
                    rec_tracks = [t for t in tracks if t.get("videoId") != seed_video_id][:limit]
                    if rec_tracks:
                        return rec_tracks
            except Exception as e:
                logger.warning("Failed to generate radio recommendations for seed %s: %s", seed_video_id, e)

        # Fallback: charts videos
        try:
            charts = self.yt.get_charts(country="ZZ")
            videos = charts.get("videos", [])
            if videos:
                return videos[:limit]
        except Exception as e:
            logger.warning("Failed to generate charts fallback recommendations: %s", e)

        # Fallback: search for top hits
        search_res = self.yt.search("Top Hits", filter_type="songs", limit=limit)
        return search_res.get("songs", [])

    def get_radio_for_track(self, video_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            watch_data = self.yt.get_watch_playlist(video_id)
            return watch_data.get("tracks", [])[:limit]
        except Exception as e:
            logger.error("Error creating radio for %s: %s", video_id, e)
            return []


recommendation_service = RecommendationService()
