from typing import Optional, List
from pydantic import BaseModel, Field


class PlaylistCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = ""
    thumbnail_url: Optional[str] = ""


class PlaylistUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None


class AddTrackRequest(BaseModel):
    videoId: str
    title: str
    artist: Optional[str] = "Unknown Artist"
    album: Optional[str] = ""
    thumbnail_url: Optional[str] = ""
    duration: Optional[str] = "0:00"
    duration_seconds: Optional[int] = 0


class ReorderTrackRequest(BaseModel):
    track_id: str
    new_position: int
