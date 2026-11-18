import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.database import init_db
from backend.app.services.ytmusic_service import ytmusic_service

# Ensure DB is initialized for testing
init_db()
client = TestClient(app)


def test_parse_lrc_standard_and_variations():
    sample_lrc = """
    [ti:Blinding Lights]
    [ar:The Weeknd]
    [al:After Hours]
    [length:03:20]
    [by:LyricsCreator]

    [00:13.52] Yeah
    [00:16.24] ♪
    [01:02:345] I'm blinded by the lights
    [02:15] Outro line
    """

    parsed = ytmusic_service.parse_lrc(sample_lrc)
    assert len(parsed) == 4

    # First line: 00:13.52 -> 13520 ms
    assert parsed[0]["id"] == "0"
    assert parsed[0]["startTime"] == 13520
    assert parsed[0]["endTime"] == 16240
    assert parsed[0]["text"] == "Yeah"

    # Second line: 00:16.24 -> 16240 ms
    assert parsed[1]["id"] == "1"
    assert parsed[1]["startTime"] == 16240
    assert parsed[1]["endTime"] == 62345
    assert parsed[1]["text"] == "♪"

    # Third line: 01:02:345 -> 62345 ms
    assert parsed[2]["id"] == "2"
    assert parsed[2]["startTime"] == 62345
    assert parsed[2]["endTime"] == 135000
    assert parsed[2]["text"] == "I'm blinded by the lights"

    # Fourth line: 02:15 -> 135000 ms
    assert parsed[3]["id"] == "3"
    assert parsed[3]["startTime"] == 135000
    assert parsed[3]["endTime"] == 139000
    assert parsed[3]["text"] == "Outro line"


def test_parse_lrc_empty_or_plain_text():
    assert ytmusic_service.parse_lrc("") == []
    assert ytmusic_service.parse_lrc("   ") == []
    plain_text = "Hello world\nThis is a plain lyric without timestamps\nEnjoy the song"
    assert ytmusic_service.parse_lrc(plain_text) == []


def test_parse_lrc_multiple_timestamps_per_line():
    sample = "[00:10.00][00:20.00] Repeat chorus"
    parsed = ytmusic_service.parse_lrc(sample)
    assert len(parsed) == 2
    assert parsed[0]["startTime"] == 10000
    assert parsed[0]["text"] == "Repeat chorus"
    assert parsed[1]["startTime"] == 20000
    assert parsed[1]["text"] == "Repeat chorus"


def test_lyrics_api_endpoint_schema():
    # Use real Blinding Lights videoId
    response = client.get("/api/lyrics/J7p4bzqLvCw")
    assert response.status_code == 200
    data = response.json()

    assert "videoId" in data
    assert "synced" in data
    assert "hasLyrics" in data
    assert "lines" in data
    assert isinstance(data["lines"], list)

    if data["hasLyrics"] and data["synced"]:
        assert len(data["lines"]) > 0
        first_line = data["lines"][0]
        assert "id" in first_line
        assert "text" in first_line
        assert "startTime" in first_line
        assert isinstance(first_line["startTime"], int)
