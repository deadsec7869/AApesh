import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime
from backend.app.db.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class LikedTrack(Base):
    __tablename__ = "liked_tracks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    video_id = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    artist = Column(String(255), nullable=True, default="Unknown Artist")
    album = Column(String(255), nullable=True, default="")
    thumbnail_url = Column(String(1024), nullable=True, default="")
    duration = Column(String(32), nullable=True, default="0:00")
    duration_seconds = Column(Integer, nullable=True, default=0)
    liked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "video_id": self.video_id,
            "title": self.title,
            "artist": self.artist,
            "album": self.album,
            "thumbnail_url": self.thumbnail_url,
            "duration": self.duration,
            "duration_seconds": self.duration_seconds,
            "liked_at": self.liked_at.isoformat() if self.liked_at else None,
        }
