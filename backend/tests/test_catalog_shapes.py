from unittest.mock import Mock
from backend.app.services.ytmusic_service import YTMusicService


def test_album_tracks_can_omit_artwork():
    service = YTMusicService()
    service._yt = Mock()
    service._yt.get_album.return_value = {
        "title": "Album", "tracks": [{"videoId": "one", "title": "Song", "thumbnails": None}]
    }
    album = service.get_album("nullable-artwork-regression")
    assert album["tracks"][0]["title"] == "Song"
    assert album["tracks"][0]["thumbnails"] == []


def test_chart_playlists_resolve_to_playable_tracks(monkeypatch):
    service = YTMusicService()
    service._yt = Mock()
    service._yt.get_charts.return_value = {
        "videos": [{"playlistId": "daily-chart"}],
        "artists": [{"browseId": "artist-1", "title": "Artist"}],
    }
    get_playlist = Mock(return_value={"tracks": [{"videoId": "one"}]})
    monkeypatch.setattr(service, "get_playlist", get_playlist)
    chart = service.get_charts("regression")
    get_playlist.assert_called_once_with("daily-chart")
    assert chart["videos"][0]["videoId"] == "one"
    assert chart["artists"][0]["name"] == "Artist"
