import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.api.routes.importer import (
    _extract_youtube_playlist_id,
    _parse_m3u,
    _extract_spotify_metadata,
)

client = TestClient(app)


def test_extract_youtube_playlist_id():
    assert _extract_youtube_playlist_id("https://music.youtube.com/playlist?list=PL12345ABC") == "PL12345ABC"
    assert _extract_youtube_playlist_id("https://www.youtube.com/watch?v=xyz&list=RDabcdef") == "RDabcdef"
    assert _extract_youtube_playlist_id("PL999XYZ") == "PL999XYZ"
    assert _extract_youtube_playlist_id("invalid_string") is None


def test_parse_m3u():
    sample_m3u = """#EXTM3U
#EXTINF:230,The Weeknd - Blinding Lights
/music/weeknd.mp3
#EXTINF:180,Daft Punk - One More Time
http://example.com/one_more_time.mp3
#EXTINF:120,Solo Artist Track
track.flac
raw_song_file - Some Artist.mp3
"""
    tracks = _parse_m3u(sample_m3u)
    assert len(tracks) >= 3
    assert tracks[0]["artist"] == "The Weeknd"
    assert tracks[0]["title"] == "Blinding Lights"
    assert tracks[1]["artist"] == "Daft Punk"
    assert tracks[1]["title"] == "One More Time"


def test_import_spotify_validation():
    # Invalid URL returns 400
    res = client.post("/api/import/spotify", json={"url": "https://notspotify.com/playlist"})
    assert res.status_code == 400


@patch("backend.app.api.routes.importer._extract_spotify_metadata")
@patch("backend.app.services.ytmusic_service.ytmusic_service.search")
def test_import_spotify_success(mock_search, mock_meta):
    mock_meta.return_value = {
        "title": "Starboy by The Weeknd",
        "author": "The Weeknd",
        "thumbnail_url": "https://spotify.com/art.jpg",
        "extracted_items": [{"title": "Starboy", "artist": "The Weeknd"}],
    }
    mock_search.return_value = {
        "songs": [
            {
                "videoId": "yt_starboy_1",
                "title": "Starboy",
                "artists": [{"name": "The Weeknd"}],
                "duration": "3:50",
            }
        ]
    }

    res = client.post("/api/import/spotify", json={"url": "https://open.spotify.com/track/12345"})
    assert res.status_code == 200
    data = res.json()
    assert data["source"] == "spotify"
    assert data["track_count"] == 1
    assert data["tracks"][0]["videoId"] == "yt_starboy_1"


def test_import_youtube_validation():
    res = client.post("/api/import/youtube", json={"url": "https://google.com"})
    assert res.status_code == 400


@patch("backend.app.services.ytmusic_service.ytmusic_service.get_playlist")
def test_import_youtube_success(mock_get_pl):
    mock_get_pl.return_value = {
        "title": "Synthwave Favorites",
        "description": "Retro beats",
        "thumbnail": "https://yt.com/thumb.jpg",
        "tracks": [
            {
                "videoId": "yt_synth_1",
                "title": "Nightcall",
                "artists": [{"name": "Kavinsky"}],
                "duration": "4:19",
            }
        ],
    }

    res = client.post("/api/import/youtube", json={"url": "https://music.youtube.com/playlist?list=PLsynth123"})
    assert res.status_code == 200
    data = res.json()
    assert data["source"] == "youtube"
    assert data["title"] == "Synthwave Favorites"
    assert data["track_count"] == 1
    assert data["tracks"][0]["videoId"] == "yt_synth_1"


def test_import_m3u_empty_validation():
    res = client.post("/api/import/m3u", json={"content": "   "})
    assert res.status_code == 400


@patch("backend.app.services.ytmusic_service.ytmusic_service.search")
def test_import_m3u_success(mock_search):
    mock_search.return_value = {
        "songs": [
            {
                "videoId": "yt_m3u_1",
                "title": "Get Lucky",
                "artists": [{"name": "Daft Punk"}],
                "duration": "4:08",
            }
        ]
    }

    m3u_text = "#EXTM3U\n#EXTINF:248,Daft Punk - Get Lucky\ndafe.mp3"
    res = client.post("/api/import/m3u", json={"content": m3u_text, "title": "French House"})
    assert res.status_code == 200
    data = res.json()
    assert data["source"] == "m3u"
    assert data["title"] == "French House"
    assert data["track_count"] == 1
    assert data["tracks"][0]["videoId"] == "yt_m3u_1"

