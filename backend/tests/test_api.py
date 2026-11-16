import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.cache_service import TTLCache


client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Aurora Music API" in data["app"]


def test_ttl_cache():
    cache = TTLCache(default_ttl=2)
    cache.set("test_key", {"foo": "bar"})
    assert cache.get("test_key") == {"foo": "bar"}
    cache.delete("test_key")
    assert cache.get("test_key") is None


def test_playlist_crud_and_tracks():
    # 1. Create playlist
    res = client.post("/api/playlists", json={
        "title": "Midnight Chill",
        "description": "Late night coding vibes",
        "thumbnail_url": "https://example.com/thumb.jpg"
    })
    assert res.status_code == 201
    pl = res.json()
    playlist_id = pl["id"]
    assert pl["title"] == "Midnight Chill"
    assert pl["track_count"] == 0

    # 2. Add track to playlist
    add_res = client.post(f"/api/playlists/{playlist_id}/tracks", json={
        "videoId": "test12345",
        "title": "Starboy",
        "artist": "The Weeknd",
        "album": "Starboy",
        "duration": "3:50",
        "duration_seconds": 230,
        "thumbnail_url": "https://example.com/starboy.jpg"
    })
    assert add_res.status_code == 200
    updated_pl = add_res.json()
    assert updated_pl["track_count"] == 1
    assert updated_pl["tracks"][0]["title"] == "Starboy"
    track_id = updated_pl["tracks"][0]["id"]

    # 3. Get playlist
    get_res = client.get(f"/api/playlists/{playlist_id}")
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Midnight Chill"

    # 4. Remove track
    del_track_res = client.delete(f"/api/playlists/{playlist_id}/tracks/{track_id}")
    assert del_track_res.status_code == 200
    assert del_track_res.json()["track_count"] == 0

    # 5. Delete playlist
    del_res = client.delete(f"/api/playlists/{playlist_id}")
    assert del_res.status_code == 200


def test_liked_songs_and_history():
    # Like a song
    like_res = client.post("/api/library/like", json={
        "videoId": "synthwave_01",
        "title": "Resonance",
        "artist": "HOME",
        "album": "Odyssey",
        "duration": "3:32"
    })
    assert like_res.status_code == 201

    # Check like status
    status_res = client.get("/api/library/status/synthwave_01")
    assert status_res.status_code == 200
    assert status_res.json()["isLiked"] is True

    # Check liked list
    liked_list = client.get("/api/library/liked")
    assert liked_list.status_code == 200
    assert any(t["video_id"] == "synthwave_01" for t in liked_list.json())

    # Record playback history
    hist_res = client.post("/api/history", json={
        "videoId": "synthwave_01",
        "title": "Resonance",
        "artist": "HOME"
    })
    assert hist_res.status_code == 201

    # Get history
    hist_list = client.get("/api/history")
    assert hist_list.status_code == 200
    assert len(hist_list.json()) >= 1

    # Unlike song
    unlike_res = client.delete("/api/library/like/synthwave_01")
    assert unlike_res.status_code == 200

    status_after = client.get("/api/library/status/synthwave_01")
    assert status_after.json()["isLiked"] is False


def test_auth_status_endpoint():
    res = client.get("/api/auth/status")
    assert res.status_code == 200
    data = res.json()
    assert "isAuthenticated" in data
    assert "mode" in data
    assert "features" in data
