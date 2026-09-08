from typing import Optional
from pydantic import BaseModel


class LikeRequest(BaseModel):
    videoId: str
    title: str
    artist: Optional[str] = "Unknown Artist"
    album: Optional[str] = ""
    thumbnail_url: Optional[str] = ""
    duration: Optional[str] = "0:00"
    duration_seconds: Optional[int] = 0


class HistoryRecordRequest(BaseModel):
    videoId: str
    title: str
    artist: Optional[str] = "Unknown Artist"
    album: Optional[str] = ""
    thumbnail_url: Optional[str] = ""
    duration: Optional[str] = "0:00"


class PreferenceUpdateRequest(BaseModel):
    key: str
    value: str
