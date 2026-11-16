import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.cache_service import cache_service

client = TestClient(app)


def setup_function():
    cache_service.clear()


def test_search_whitespace_query():
    res = client.get("/api/search?q=%20%20%20")
    assert res.status_code == 200
    data = res.json()
    assert data["query"] == "   "
    assert data["songs"] == []
    assert data["albums"] == []
    assert data["artists"] == []
    assert data["playlists"] == []


def test_search_filter_all_sanitization():
    mock_raw = [
        {
            "resultType": "song",
            "videoId": "vid123",
            "title": "Fix You",
            "artists": [{"name": "Coldplay", "id": "coldplay1"}],
            "album": {"name": "X&Y", "id": "xy1"},
            "duration": "4:55",
            "thumbnails": [{"url": "https://example.com/art.jpg", "width": 100, "height": 100}],
        }
    ]
    with patch("backend.app.services.ytmusic_service.ytmusic_service.client.search") as mock_search:
        mock_search.return_value = mock_raw
        res = client.get("/api/search?q=coldplay&filter=all")
        assert res.status_code == 200
        # Check that filter passed to ytmusic was None (all sanitized to None)
        mock_search.assert_called_once_with("coldplay", limit=20)
        data = res.json()
        assert len(data["songs"]) == 1
        assert data["songs"][0]["videoId"] == "vid123"


def test_search_malformed_playlist_and_album_normalization():
    mock_raw = [
        {
            "resultType": "playlist",
            "browseId": "VL_chill_01",
            "title": "Ultimate Chill",
            "description": "Relaxing beats",
            "author": [{"name": "DJ Curator"}, {"name": "Assistant"}],
            "itemCount": "75 tracks",
            "thumbnails": [{"url": "https://example.com/thumb.jpg", "width": 120, "height": 120}],
        },
        {
            "resultType": "album",
            "browseId": "MPRE_album_01",
            "title": "A Head Full of Dreams",
            "year": 2015,
            "trackCount": "11 songs",
            "artists": [{"name": "Coldplay", "id": "cp"}],
            "thumbnails": [],
        },
    ]
    with patch("backend.app.services.ytmusic_service.ytmusic_service.client.search", return_value=mock_raw):
        res = client.get("/api/search?q=chill")
        assert res.status_code == 200
        data = res.json()
        assert len(data["playlists"]) == 1
        pl = data["playlists"][0]
        assert pl["author"] == "DJ Curator, Assistant"
        assert pl["itemCount"] == 75

        assert len(data["albums"]) == 1
        alb = data["albums"][0]
        assert alb["trackCount"] == 11
        assert alb["year"] == "2015"


def test_search_top_result_extraction():
    mock_raw = [
        {
            "category": "Top result",
            "resultType": "artist",
            "subscribers": "213M",
            "artists": [{"name": "Ed Sheeran", "id": "UClmXPfaYhXOYsNn_QUyheWQ"}],
            "thumbnails": [{"url": "https://example.com/ed.jpg", "width": 120, "height": 120}],
        },
        {
            "resultType": "song",
            "videoId": "shape_01",
            "title": "Shape of You",
            "artists": [{"name": "Ed Sheeran", "id": "UClmXPfaYhXOYsNn_QUyheWQ"}],
            "duration": "3:53",
            "thumbnails": [],
        },
    ]
    with patch("backend.app.services.ytmusic_service.ytmusic_service.client.search", return_value=mock_raw):
        res = client.get("/api/search?q=ed%20sheeran")
        assert res.status_code == 200
        data = res.json()
        assert data["topResult"] is not None
        assert data["topResult"]["type"] == "artist"
        assert data["topResult"]["data"]["name"] == "Ed Sheeran"
        assert data["topResult"]["data"]["channelId"] == "UClmXPfaYhXOYsNn_QUyheWQ"


def test_search_provider_failure_returns_503():
    with patch("backend.app.services.ytmusic_service.ytmusic_service.client.search", side_effect=RuntimeError("Connection reset by peer")):
        res = client.get("/api/search?q=crashme")
        assert res.status_code == 503
        data = res.json()
        assert "Music search service unavailable" in data["detail"]
        assert "Connection reset by peer" in data["detail"]


def test_search_suggestions_empty_query():
    res = client.get("/api/search/suggestions?q=%20%20")
    assert res.status_code == 200
    assert res.json() == []
