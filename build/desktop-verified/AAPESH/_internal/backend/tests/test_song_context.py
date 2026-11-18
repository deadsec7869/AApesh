import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.ytmusic_service import ytmusic_service
from backend.app.services.cache_service import cache_service

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_context_cache():
    cache_service.clear()
    yield
    cache_service.clear()


def test_song_context_endpoint_valid_song():
    with patch.object(ytmusic_service, "get_song") as mock_song, \
         patch.object(ytmusic_service.client, "get_watch_playlist") as mock_watch, \
         patch.object(ytmusic_service.client, "get_song_related") as mock_related, \
         patch.object(ytmusic_service.client, "get_album") as mock_album, \
         patch.object(ytmusic_service.client, "get_song_credits") as mock_credits:

        mock_song.return_value = {
            "videoId": "vid_123",
            "title": "Blinding Lights",
            "artists": [{"id": "art_123", "name": "The Weeknd"}],
            "album": "After Hours",
            "albumId": "alb_123",
            "duration": "3:20",
            "duration_seconds": 200,
            "thumbnails": [{"url": "https://img.com/bl.jpg", "width": 500, "height": 500}],
            "thumbnail": "https://img.com/bl.jpg",
            "isExplicit": False,
        }

        mock_watch.return_value = {
            "tracks": [{
                "videoId": "vid_123",
                "title": "Blinding Lights",
                "artists": [{"name": "The Weeknd", "id": "art_123"}],
                "thumbnail": [{"url": "https://img.com/bl.jpg", "width": 500, "height": 500}],
                "length": "3:20",
                "isExplicit": False,
            }],
            "lyrics": "MPLYt_123",
            "related": "rel_browse_123",
        }

        mock_related.return_value = [
            {
                "title": "About the artist",
                "contents": "The Weeknd is a Canadian singer and songwriter.",
            },
            {
                "title": "You might also like",
                "contents": [
                    {
                        "videoId": "vid_456",
                        "title": "Save Your Tears",
                        "artists": [{"name": "The Weeknd"}],
                    }
                ],
            },
        ]

        mock_album.return_value = {
            "title": "After Hours",
            "year": "2020",
            "type": "Album",
            "trackCount": 14,
            "tracks": [
                {
                    "videoId": "vid_123",
                    "title": "Blinding Lights",
                    "creditsBrowseId": "MPTC_blinding_lights",
                }
            ],
        }

        mock_credits.return_value = {
            "performed_by": {"localized_title": "Performed By", "data": ["The Weeknd"]},
            "written_by": {"localized_title": "Written By", "data": ["Abel Tesfaye", "Max Martin"]},
            "produced_by": {"localized_title": "Produced By", "data": ["Max Martin", "Oscar Holter"]},
            "other_sections": [],
        }

        response = client.get("/api/songs/vid_123/context")
        assert response.status_code == 200
        data = response.json()

        assert data["videoId"] == "vid_123"
        assert data["title"] == "Blinding Lights"
        assert data["artists"][0]["name"] == "The Weeknd"
        assert data["album"] == "After Hours"
        assert data["year"] == "2020"
        assert data["artistDetails"]["description"] == "The Weeknd is a Canadian singer and songwriter."
        assert data["credits"]["performed_by"]["data"] == ["The Weeknd"]
        assert "Max Martin" in data["credits"]["written_by"]["data"]
        assert data["dataSource"] == "YouTube Music"


def test_song_context_missing_credits_and_artist_bio_graceful():
    with patch.object(ytmusic_service, "get_song") as mock_song, \
         patch.object(ytmusic_service.client, "get_watch_playlist") as mock_watch, \
         patch.object(ytmusic_service.client, "get_album") as mock_album:

        mock_song.return_value = {
            "videoId": "vid_indie",
            "title": "Indie Track",
            "artists": [{"id": "art_indie", "name": "Indie Artist"}],
            "album": None,
            "albumId": None,
            "duration": "2:45",
            "duration_seconds": 165,
            "thumbnails": [],
            "thumbnail": "",
            "isExplicit": False,
        }

        mock_watch.return_value = {
            "tracks": [],
            "lyrics": None,
            "related": None,
        }

        mock_album.return_value = None

        response = client.get("/api/songs/vid_indie/context")
        assert response.status_code == 200
        data = response.json()

        assert data["videoId"] == "vid_indie"
        assert data["title"] == "Indie Track"
        assert data["credits"] is None
        assert data["albumDetails"] is None
        assert data["artistDetails"]["name"] == "Indie Artist"
        assert data["artistDetails"]["description"] is None


def test_song_context_caching():
    with patch.object(ytmusic_service, "get_song") as mock_song, \
         patch.object(ytmusic_service.client, "get_watch_playlist") as mock_watch:

        mock_song.return_value = {
            "videoId": "vid_cached",
            "title": "Cached Song",
            "artists": [{"name": "Cache Artist"}],
        }
        mock_watch.return_value = {}

        # 1. First fetch -> calls provider
        res1 = client.get("/api/songs/vid_cached/context")
        assert res1.status_code == 200
        assert mock_song.call_count == 1

        # 2. Second fetch -> hits cache
        res2 = client.get("/api/songs/vid_cached/context")
        assert res2.status_code == 200
        assert res1.json() == res2.json()
        assert mock_song.call_count == 1  # Not called again


def test_song_context_provider_exception_resilience():
    with patch.object(ytmusic_service, "get_song", side_effect=Exception("Provider timeout")), \
         patch.object(ytmusic_service.client, "get_watch_playlist", side_effect=Exception("Watch playlist error")):

        response = client.get("/api/songs/vid_err/context")
        assert response.status_code == 200
        data = response.json()

        # Resilient fallback response
        assert data["videoId"] == "vid_err"
        assert data["title"] == "Unknown Title"
        assert data["credits"] is None
        assert data["dataSource"] == "YouTube Music"
