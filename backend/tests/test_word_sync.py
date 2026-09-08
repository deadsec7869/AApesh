"""Unit tests for word-to-word lyrics synchronization in Aurora Music."""

from backend.app.services.lyrics_engine.providers import extract_word_timings, parse_lrc_lines


def test_enhanced_lrc_word_timings():
    raw_lrc = "[00:12.00]<00:12.00>Never <00:12.40>gonna <00:12.80>give <00:13.20>you <00:13.60>up"
    parsed = parse_lrc_lines(raw_lrc)
    assert len(parsed) == 1
    line = parsed[0]
    assert line["text"] == "Never gonna give you up"
    assert "words" in line
    assert len(line["words"]) == 5
    assert line["words"][0]["text"] == "Never"
    assert line["words"][0]["startTime"] == 12000
    assert line["words"][0]["endTime"] == 12400
    assert line["words"][1]["text"] == "gonna"
    assert line["words"][1]["startTime"] == 12400
    assert line["words"][1]["endTime"] == 12800


def test_standard_lrc_proportional_word_timings():
    raw_lrc = "[00:10.00]Hello world of music\n[00:15.00]Next line"
    parsed = parse_lrc_lines(raw_lrc)
    assert len(parsed) == 2
    first_line = parsed[0]
    assert first_line["text"] == "Hello world of music"
    assert "words" in first_line
    assert len(first_line["words"]) == 4
    words = first_line["words"]
    # Check that timestamps are sequential and cover line duration (10s to 15s)
    assert words[0]["startTime"] == 10000
    assert words[0]["endTime"] <= words[1]["startTime"] + 1
    assert words[3]["endTime"] == 15000


def test_multilingual_word_timings():
    # Urdu line: تم میرے دل میں ہو
    urdu_line = "[01:05.00]تم میرے دل میں ہو\n[01:10.00]اگلی لائن"
    parsed = parse_lrc_lines(urdu_line)
    assert len(parsed) == 2
    first_line = parsed[0]
    assert len(first_line["words"]) == 5
    assert first_line["words"][0]["text"] == "تم"
    assert first_line["words"][-1]["text"] == "ہو"
