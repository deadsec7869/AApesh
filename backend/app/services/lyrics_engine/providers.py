"""Multi-provider lyrics architecture for Aurora Music."""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple
import logging
import urllib.parse
import urllib.request
import json
import re

from backend.app.services.lyrics_engine.script_detector import (
    annotate_lyric_lines,
    analyze_text_script_and_direction,
)

logger = logging.getLogger("aurora.lyrics_engine")


def extract_word_timings(raw_line_text: str, start_time_ms: int, end_time_ms: int) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Extract word-level timings from enhanced LRC tags (e.g. <00:12.34>word) if present,
    or generate naturalistic phonetic word timings distributed across the line duration.
    Returns (clean_text, words).
    """
    if not raw_line_text:
        return "", []

    inline_ts_pattern = re.compile(r"<(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?>")
    matches = list(inline_ts_pattern.finditer(raw_line_text))

    if matches:
        words = []
        for i, match in enumerate(matches):
            minutes = int(match.group(1))
            seconds = int(match.group(2))
            fraction_str = match.group(3)
            if fraction_str is None:
                fraction_ms = 0
            elif len(fraction_str) == 2:
                fraction_ms = int(fraction_str) * 10
            elif len(fraction_str) == 3:
                fraction_ms = int(fraction_str)
            else:
                fraction_ms = int(fraction_str[:3])
            w_start = (minutes * 60 + seconds) * 1000 + fraction_ms

            start_pos = match.end()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(raw_line_text)
            chunk = raw_line_text[start_pos:end_pos].strip()

            w_end = end_time_ms
            if i + 1 < len(matches):
                next_m = matches[i + 1]
                nm = int(next_m.group(1))
                ns = int(next_m.group(2))
                nf = int(next_m.group(3) or 0)
                if next_m.group(3) and len(next_m.group(3)) == 2:
                    nf *= 10
                w_end = (nm * 60 + ns) * 1000 + nf

            if chunk:
                words.append({
                    "text": chunk,
                    "startTime": w_start,
                    "endTime": max(w_start + 100, w_end),
                })

        clean_text = inline_ts_pattern.sub("", raw_line_text).strip()
        clean_text = re.sub(r"\s+", " ", clean_text)
        if words:
            return clean_text, words

    # If no inline timestamps, distribute across words proportionally
    clean_text = inline_ts_pattern.sub("", raw_line_text).strip()
    clean_text = re.sub(r"\s+", " ", clean_text)
    word_tokens = clean_text.split()
    if not word_tokens:
        return clean_text, []

    total_duration = max(350, end_time_ms - start_time_ms)
    weights = []
    for w in word_tokens:
        w_len = max(1, len(w))
        if w.endswith((",", ".", "!", "?", ";", "—", "-")):
            w_len += 2
        weights.append(w_len)

    total_weight = sum(weights)
    words = []
    curr = start_time_ms
    for idx, w in enumerate(word_tokens):
        w_dur = int((weights[idx] / total_weight) * total_duration)
        w_end = curr + w_dur if idx < len(word_tokens) - 1 else end_time_ms
        words.append({
            "text": w,
            "startTime": curr,
            "endTime": max(curr + 80, w_end),
        })
        curr = w_end

    return clean_text, words


def parse_lrc_lines(lrc_content: str) -> List[Dict[str, Any]]:
    """Parse standard and multi-timestamp LRC lines into structured millisecond-based entries with word timings."""
    if not lrc_content:
        return []

    timestamp_pattern = re.compile(r"\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]")
    parsed_lines = []

    for line in lrc_content.splitlines():
        line = line.strip()
        if not line:
            continue

        timestamps = list(timestamp_pattern.finditer(line))
        if not timestamps:
            continue

        raw_text = timestamp_pattern.sub("", line).strip()

        for match in timestamps:
            minutes = int(match.group(1))
            seconds = int(match.group(2))
            fraction_str = match.group(3)

            if fraction_str is None:
                fraction_ms = 0
            elif len(fraction_str) == 2:
                fraction_ms = int(fraction_str) * 10
            elif len(fraction_str) == 3:
                fraction_ms = int(fraction_str)
            else:
                fraction_ms = int(fraction_str[:3])

            start_time_ms = (minutes * 60 + seconds) * 1000 + fraction_ms
            parsed_lines.append({
                "startTime": start_time_ms,
                "raw_text": raw_text,
            })

    # Sort lines chronologically
    parsed_lines.sort(key=lambda x: x["startTime"])

    # Assign IDs, approximate endTimes, and word-by-word timings
    results = []
    for idx, item in enumerate(parsed_lines):
        end_time = parsed_lines[idx + 1]["startTime"] if idx + 1 < len(parsed_lines) else item["startTime"] + 4000
        clean_text, words = extract_word_timings(item["raw_text"], item["startTime"], end_time)
        results.append({
            "id": str(idx),
            "startTime": item["startTime"],
            "endTime": end_time,
            "text": clean_text,
            "words": words,
        })

    return results


class LyricsProvider(ABC):
    """Abstract base class for lyrics providers."""

    @abstractmethod
    def get_lyrics(self, track_info: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Fetch lyrics for a track.
        track_info keys: videoId, title, artist, album, duration (seconds), client (ytmusicapi instance), etc.
        """
        pass


class YouTubeMusicLyricsProvider(LyricsProvider):
    """Fetches official YouTube Music timed/static lyrics via ytmusicapi."""

    def get_lyrics(self, track_info: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        video_id = track_info.get("videoId")
        ytmusic_client = track_info.get("client")
        media_dur = track_info.get("duration")

        if not video_id or not ytmusic_client:
            return None

        try:
            # 1. Fetch watch playlist to obtain browseId
            watch_data = ytmusic_client.get_watch_playlist(videoId=video_id)
            browse_id = watch_data.get("lyrics")
            if not browse_id:
                return None

            lyrics_raw = ytmusic_client.get_lyrics(browse_id, timestamps=True)
            if not lyrics_raw:
                return None

            source = lyrics_raw.get("source") or "Source: Musixmatch / YouTube Music"
            has_timestamps = lyrics_raw.get("hasTimestamps", False)
            raw_content = lyrics_raw.get("lyrics")

            # Official Timed Lyrics (Musixmatch)
            if has_timestamps and isinstance(raw_content, list) and len(raw_content) > 0:
                lines = []
                for idx, item in enumerate(raw_content):
                    if hasattr(item, "start_time"):
                        s_time = getattr(item, "start_time", 0)
                        e_time = getattr(item, "end_time", None)
                        text_val = getattr(item, "text", "")
                        line_id = str(getattr(item, "id", idx))
                    elif isinstance(item, dict):
                        s_time = item.get("start_time", item.get("startTime", 0))
                        e_time = item.get("end_time", item.get("endTime"))
                        text_val = item.get("text", "")
                        line_id = str(item.get("id", idx))
                    else:
                        continue
                    clean_text, words = extract_word_timings(text_val, s_time, e_time if e_time else s_time + 4000)
                    lines.append({
                        "id": line_id,
                        "startTime": s_time,
                        "endTime": e_time,
                        "text": clean_text,
                        "words": words,
                    })

                if not lines:
                    return None

                annotated_lines, primary_script, direction, language = annotate_lyric_lines(lines)
                full_text = "\n".join(l["text"] for l in annotated_lines)
                last_end = round(float(annotated_lines[-1]["endTime"] / 1000), 2) if annotated_lines[-1].get("endTime") else None
                duration_diff = round(abs(media_dur - last_end), 2) if (media_dur and last_end) else 0.0

                return {
                    "videoId": video_id,
                    "synced": True,
                    "hasLyrics": True,
                    "lines": annotated_lines,
                    "lyrics": full_text,
                    "source": source,
                    "provider": "youtube_musixmatch",
                    "syncConfidence": "excellent",
                    "lyricsDuration": last_end,
                    "mediaDuration": media_dur,
                    "durationDifference": duration_diff,
                    "primaryScript": primary_script,
                    "direction": direction,
                    "language": language,
                    "instrumental": False,
                }

            # If raw_content is a string with embedded timestamps
            if isinstance(raw_content, str) and raw_content.strip():
                parsed_lines = parse_lrc_lines(raw_content)
                if parsed_lines:
                    annotated_lines, primary_script, direction, language = annotate_lyric_lines(parsed_lines)
                    last_end = round(float(annotated_lines[-1]["endTime"] / 1000), 2) if annotated_lines[-1].get("endTime") else None
                    duration_diff = round(abs(media_dur - last_end), 2) if (media_dur and last_end) else 0.0

                    return {
                        "videoId": video_id,
                        "synced": True,
                        "hasLyrics": True,
                        "lines": annotated_lines,
                        "lyrics": raw_content,
                        "source": source,
                        "provider": "youtube_musixmatch",
                        "syncConfidence": "excellent",
                        "lyricsDuration": last_end,
                        "mediaDuration": media_dur,
                        "durationDifference": duration_diff,
                        "primaryScript": primary_script,
                        "direction": direction,
                        "language": language,
                        "instrumental": False,
                    }

                # Plain lyrics without timestamps
                static_lines = [
                    {"id": str(i), "text": line.strip()}
                    for i, line in enumerate(raw_content.splitlines())
                    if line.strip()
                ]
                annotated_lines, primary_script, direction, language = annotate_lyric_lines(static_lines)
                return {
                    "videoId": video_id,
                    "synced": False,
                    "hasLyrics": True,
                    "lines": annotated_lines,
                    "lyrics": raw_content,
                    "source": source,
                    "provider": "youtube_musixmatch",
                    "syncConfidence": "uncertain",
                    "lyricsDuration": None,
                    "mediaDuration": media_dur,
                    "durationDifference": None,
                    "primaryScript": primary_script,
                    "direction": direction,
                    "language": language,
                    "instrumental": False,
                }

        except Exception as e:
            logger.debug("YouTube Music lyrics lookup failed for %s: %s", video_id, e)
            return None


class LRCLIBProvider(LyricsProvider):
    """Fetches open community synced lyrics via LRCLIB."""

    def get_lyrics(self, track_info: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        video_id = track_info.get("videoId")
        title = track_info.get("title", "")
        artist = track_info.get("artist", "")
        album = track_info.get("album", "")
        media_dur = track_info.get("duration")

        if not title:
            return None

        # Clean noise words while preserving specific version keywords
        clean_title = re.sub(
            r"\s*(\(|\[)(official\s*(music\s*)?video|hd|hq|4k|audio|lyric\s*video|visualizer|mv)(\)|\])",
            "",
            title,
            flags=re.IGNORECASE,
        ).strip()
        clean_title = re.sub(r"\s+", " ", clean_title)

        params = {
            "track_name": clean_title,
            "artist_name": artist or "",
        }
        if album:
            params["album_name"] = album
        if media_dur and media_dur > 0:
            params["duration"] = int(media_dur)

        url = f"https://lrclib.net/api/get?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={"User-Agent": "AuroraMusic/1.0 (https://github.com/aurora)"})

        try:
            with urllib.request.urlopen(req, timeout=4) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    is_instrumental = data.get("instrumental", False)
                    synced_raw = data.get("syncedLyrics")
                    plain_raw = data.get("plainLyrics")
                    lyrics_dur = float(data["duration"]) if data.get("duration") else None

                    # Compute duration correlation and sync confidence
                    duration_diff = None
                    sync_confidence = "good"

                    if media_dur and lyrics_dur:
                        duration_diff = round(abs(media_dur - lyrics_dur), 2)
                        if duration_diff < 1.5:
                            sync_confidence = "excellent"
                        elif duration_diff <= 3.0:
                            sync_confidence = "good"
                        elif duration_diff <= 5.0:
                            sync_confidence = "uncertain"
                        else:
                            sync_confidence = "poor"

                    if synced_raw:
                        parsed = parse_lrc_lines(synced_raw)
                        if parsed:
                            annotated_lines, primary_script, direction, language = annotate_lyric_lines(parsed)
                            return {
                                "videoId": video_id,
                                "synced": True,
                                "hasLyrics": True,
                                "lines": annotated_lines,
                                "lyrics": plain_raw or synced_raw,
                                "source": "Source: LRCLIB (Open Synchronized Lyrics)",
                                "provider": "open_synced_lrclib",
                                "syncConfidence": sync_confidence,
                                "lyricsDuration": lyrics_dur,
                                "mediaDuration": media_dur,
                                "durationDifference": duration_diff,
                                "primaryScript": primary_script,
                                "direction": direction,
                                "language": language,
                                "instrumental": is_instrumental,
                            }

                    if plain_raw:
                        static_lines = [
                            {"id": str(i), "text": line.strip()}
                            for i, line in enumerate(plain_raw.splitlines())
                            if line.strip()
                        ]
                        annotated_lines, primary_script, direction, language = annotate_lyric_lines(static_lines)
                        return {
                            "videoId": video_id,
                            "synced": False,
                            "hasLyrics": True,
                            "lines": annotated_lines,
                            "lyrics": plain_raw,
                            "source": "Source: LRCLIB",
                            "provider": "open_synced_lrclib",
                            "syncConfidence": "uncertain",
                            "lyricsDuration": lyrics_dur,
                            "mediaDuration": media_dur,
                            "durationDifference": duration_diff,
                            "primaryScript": primary_script,
                            "direction": direction,
                            "language": language,
                            "instrumental": is_instrumental,
                        }
        except Exception as e:
            logger.debug("LRCLIB lookup failed for %s (%s): %s", title, video_id, e)
            return None


class CompositeLyricsService:
    """Manages the fallback hierarchy across multiple lyrics providers."""

    def __init__(self):
        self.providers: List[LyricsProvider] = [
            YouTubeMusicLyricsProvider(),
            LRCLIBProvider(),
        ]

    def get_lyrics(self, track_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Queries providers in priority order:
        1. If a provider returns synced lyrics, return it immediately.
        2. If a provider returns plain lyrics, remember it as fallback while checking other providers for synced lyrics.
        3. If all fail, return clean empty schema.
        """
        video_id = track_info.get("videoId", "")
        media_dur = track_info.get("duration")

        plain_fallback: Optional[Dict[str, Any]] = None

        for provider in self.providers:
            result = provider.get_lyrics(track_info)
            if result and result.get("hasLyrics"):
                if result.get("synced"):
                    return result
                elif not plain_fallback:
                    plain_fallback = result

        if plain_fallback:
            return plain_fallback

        # No lyrics found across all providers
        return {
            "videoId": video_id,
            "synced": False,
            "hasLyrics": False,
            "lines": [],
            "lyrics": None,
            "source": None,
            "provider": None,
            "syncConfidence": None,
            "lyricsDuration": None,
            "mediaDuration": media_dur,
            "durationDifference": None,
            "primaryScript": "latin",
            "direction": "ltr",
            "language": "unknown",
            "instrumental": False,
        }
