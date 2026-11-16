import re
import urllib.request
import urllib.parse
import json
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, HttpUrl
from fastapi import APIRouter, HTTPException

from backend.app.services.ytmusic_service import ytmusic_service

logger = logging.getLogger("aurora.importer")

router = APIRouter(prefix="/import", tags=["Importer"])


class SpotifyImportRequest(BaseModel):
    url: str
    limit: Optional[int] = 50


class YouTubeImportRequest(BaseModel):
    url: str


class M3UImportRequest(BaseModel):
    content: str
    title: Optional[str] = "Imported M3U Playlist"


def _extract_spotify_metadata(url: str) -> Dict[str, Any]:
    """
    Extract public metadata from Spotify URL using Spotify oEmbed API and public open graph tags.
    """
    clean_url = url.split("?")[0].strip()
    encoded_url = urllib.parse.quote(clean_url, safe="")
    oembed_url = f"https://open.spotify.com/oembed?url={encoded_url}"

    title = "Spotify Playlist"
    author = "Spotify User"
    thumbnail_url = ""
    extracted_tracks: List[Dict[str, str]] = []

    try:
        req = urllib.request.Request(
            oembed_url,
            headers={"User-Agent": "AAPESH-MusicWorkstation/1.0 (Mozilla/5.0)"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                title = data.get("title") or title
                author = data.get("author_name") or author
                thumbnail_url = data.get("thumbnail_url") or ""
    except Exception as e:
        logger.debug("Spotify oEmbed query error: %s", e)

    # For tracks or album titles, parse title format "Title - Single by Artist" or "Title by Artist"
    if " by " in title:
        parts = title.split(" by ")
        t_name = parts[0].strip()
        a_name = parts[1].strip() if len(parts) > 1 else ""
        extracted_tracks.append({"title": t_name, "artist": a_name})
    elif " - " in title:
        parts = title.split(" - ")
        extracted_tracks.append({"title": parts[0].strip(), "artist": parts[1].strip() if len(parts) > 1 else ""})
    else:
        extracted_tracks.append({"title": title, "artist": author})

    return {
        "title": title,
        "author": author,
        "thumbnail_url": thumbnail_url,
        "extracted_items": extracted_tracks,
    }


def _extract_youtube_playlist_id(url_or_id: str) -> Optional[str]:
    """
    Extract playlist ID from YouTube or YouTube Music URL, or return cleaned ID.
    """
    target = url_or_id.strip()
    # Check query param list=
    match = re.search(r'[?&]list=([a-zA-Z0-9_-]+)', target)
    if match:
        return match.group(1)
    if target.startswith("PL") or target.startswith("RD") or target.startswith("OLAK5uy_"):
        return target
    return None


def _parse_m3u(content: str) -> List[Dict[str, str]]:
    """
    Parse M3U / M3U8 string content and extract track title and artist.
    Correctly associates #EXTINF lines with their succeeding audio path.
    """
    tracks: List[Dict[str, str]] = []
    lines = content.splitlines()
    has_extinf = False

    for line in lines:
        line = line.strip()
        if line.startswith("#EXTINF:"):
            info_part = line.split(",", 1)
            if len(info_part) > 1:
                raw_meta = info_part[1].strip()
                if " - " in raw_meta:
                    artist, title = raw_meta.split(" - ", 1)
                    tracks.append({"artist": artist.strip(), "title": title.strip()})
                else:
                    tracks.append({"artist": "", "title": raw_meta})
            has_extinf = True
        elif line and not line.startswith("#"):
            if has_extinf:
                # This line is the file path/URI for the preceding #EXTINF; do not duplicate
                has_extinf = False
                continue
            # Standalone file path or URL without #EXTINF
            filename = line.split("/")[-1].split("\\")[-1]
            title_only = filename.rsplit(".", 1)[0]
            if " - " in title_only:
                artist, title = title_only.split(" - ", 1)
                tracks.append({"artist": artist.strip(), "title": title.strip()})
            else:
                tracks.append({"artist": "", "title": title_only})
            has_extinf = False

    return tracks


@router.post("/spotify")
def import_spotify(payload: SpotifyImportRequest):
    """
    Resolve and import public Spotify playlist, album, or track into YouTube Music tracks.
    """
    if not payload.url or not re.search(r'open\.spotify\.com/(track|playlist|album)/[a-zA-Z0-9]+', payload.url):
        raise HTTPException(status_code=400, detail="Invalid Spotify URL. Please provide an open.spotify.com link.")

    meta = _extract_spotify_metadata(payload.url)
    items = meta.get("extracted_items", [])

    matched_tracks: List[Dict[str, Any]] = []

    for item in items[: payload.limit]:
        query = f"{item['title']} {item['artist']}".strip()
        if not query:
            continue
        try:
            search_res = ytmusic_service.search(query, filter_type="songs", limit=1)
            songs = search_res.get("songs") or []
            if songs:
                matched_tracks.append(songs[0])
            else:
                top = search_res.get("topResult")
                if top and top.get("type") == "song" and top.get("data"):
                    matched_tracks.append(top["data"])
        except Exception as e:
            logger.debug("Failed matching Spotify item %s: %s", query, e)

    return {
        "source": "spotify",
        "title": meta.get("title") or "Imported Spotify Playlist",
        "author": meta.get("author") or "Spotify User",
        "thumbnail_url": meta.get("thumbnail_url"),
        "track_count": len(matched_tracks),
        "tracks": matched_tracks,
    }


@router.post("/youtube")
def import_youtube(payload: YouTubeImportRequest):
    """
    Import public YouTube Music or YouTube playlist.
    """
    playlist_id = _extract_youtube_playlist_id(payload.url)
    if not playlist_id:
        raise HTTPException(status_code=400, detail="Could not extract a valid playlist ID from the provided URL.")

    try:
        data = ytmusic_service.get_playlist(playlist_id)
        if "error" in data:
            raise HTTPException(status_code=404, detail=f"Playlist not found: {data['error']}")
        
        tracks = data.get("tracks") or []
        return {
            "source": "youtube",
            "title": data.get("title") or "Imported YouTube Playlist",
            "description": data.get("description") or "",
            "thumbnail_url": data.get("thumbnail") or "",
            "track_count": len(tracks),
            "tracks": tracks,
        }
    except Exception as e:
        logger.error("Error importing YouTube playlist %s: %s", playlist_id, e)
        raise HTTPException(status_code=500, detail=f"Failed to fetch YouTube playlist: {str(e)}")


@router.post("/m3u")
def import_m3u(payload: M3UImportRequest):
    """
    Parse M3U / M3U8 string and match tracks in YouTube Music catalog.
    """
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="M3U content cannot be empty.")

    extracted = _parse_m3u(payload.content)
    matched_tracks: List[Dict[str, Any]] = []

    for item in extracted[:30]:  # Cap at 30 items for responsiveness
        query = f"{item['title']} {item['artist']}".strip()
        if not query:
            continue
        try:
            search_res = ytmusic_service.search(query, filter_type="songs", limit=1)
            songs = search_res.get("songs") or []
            if songs:
                matched_tracks.append(songs[0])
        except Exception as e:
            logger.debug("Failed matching M3U item %s: %s", query, e)

    return {
        "source": "m3u",
        "title": payload.title or "Imported M3U Playlist",
        "track_count": len(matched_tracks),
        "tracks": matched_tracks,
    }
