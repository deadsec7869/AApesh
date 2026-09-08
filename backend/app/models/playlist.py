import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.db.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True, default="")
    thumbnail_url = Column(String(1024), nullable=True, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    tracks = relationship(
        "PlaylistTrack",
        back_populates="playlist",
        cascade="all, delete-orphan",
        order_by="PlaylistTrack.position"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "thumbnail_url": self.thumbnail_url or (self.tracks[0].thumbnail_url if self.tracks else ""),
            "track_count": len(self.tracks) if self.tracks else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "tracks": [t.to_dict() for t in self.tracks] if self.tracks else []
        }


class PlaylistTrack(Base):
    __tablename__ = "playlist_tracks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    playlist_id = Column(String(36), ForeignKey("playlists.id", ondelete="CASCADE"), nullable=False)
    video_id = Column(String(64), nullable=False)
    title = Column(String(255), nullable=False)
    artist = Column(String(255), nullable=True, default="Unknown Artist")
    album = Column(String(255), nullable=True, default="")
    thumbnail_url = Column(String(1024), nullable=True, default="")
    duration = Column(String(32), nullable=True, default="0:00")
    duration_seconds = Column(Integer, nullable=True, default=0)
    position = Column(Integer, default=0)
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    playlist = relationship("Playlist", back_populates="tracks")

    def to_dict(self):
        return {
            "id": self.id,
            "playlist_id": self.playlist_id,
            "video_id": self.video_id,
            "title": self.title,
            "artist": self.artist,
            "album": self.album,
            "thumbnail_url": self.thumbnail_url,
            "duration": self.duration,
            "duration_seconds": self.duration_seconds,
            "position": self.position,
            "added_at": self.added_at.isoformat() if self.added_at else None,
        }
