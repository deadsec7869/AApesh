"""Lyrics engine module for Aurora Music."""

from backend.app.services.lyrics_engine.script_detector import (
    analyze_text_script_and_direction,
    annotate_lyric_lines,
    get_char_script,
)
from backend.app.services.lyrics_engine.providers import (
    LyricsProvider,
    YouTubeMusicLyricsProvider,
    LRCLIBProvider,
    CompositeLyricsService,
    parse_lrc_lines,
)

__all__ = [
    "analyze_text_script_and_direction",
    "annotate_lyric_lines",
    "get_char_script",
    "LyricsProvider",
    "YouTubeMusicLyricsProvider",
    "LRCLIBProvider",
    "CompositeLyricsService",
    "parse_lrc_lines",
]
