"""Backend tests for Multilingual & RTL Lyrics Foundation in Aurora Music."""

import pytest
from backend.app.services.lyrics_engine.script_detector import (
    analyze_text_script_and_direction,
    annotate_lyric_lines,
    get_char_script,
)
from backend.app.services.lyrics_engine.providers import (
    parse_lrc_lines,
    CompositeLyricsService,
    LyricsProvider,
)
from backend.app.services.ytmusic_service import ytmusic_service


def test_script_and_direction_detection():
    # 1. English (Latin, LTR)
    res_en = analyze_text_script_and_direction("I want to live")
    assert res_en["primaryScript"] == "latin"
    assert res_en["direction"] == "ltr"
    assert res_en["isRtl"] is False

    # 2. Urdu (Arabic script, RTL)
    res_ur = analyze_text_script_and_direction("تم کیا کر رہے ہو")
    assert res_ur["primaryScript"] == "arabic"
    assert res_ur["direction"] == "rtl"
    assert res_ur["isRtl"] is True
    assert res_ur["language"] == "ur"

    # 3. Hindi (Devanagari, LTR)
    res_hi = analyze_text_script_and_direction("तुम क्या कर रहे हो")
    assert res_hi["primaryScript"] == "devanagari"
    assert res_hi["direction"] == "ltr"
    assert res_hi["isRtl"] is False

    # 4. Punjabi (Gurmukhi, LTR)
    res_pa = analyze_text_script_and_direction("ਤੁਸੀਂ ਕੀ ਕਰ ਰਹੇ ਹੋ")
    assert res_pa["primaryScript"] == "gurmukhi"
    assert res_pa["direction"] == "ltr"
    assert res_pa["isRtl"] is False

    # 5. Bengali (Bengali, LTR)
    res_bn = analyze_text_script_and_direction("তুমি কী করছো")
    assert res_bn["primaryScript"] == "bengali"
    assert res_bn["direction"] == "ltr"
    assert res_bn["isRtl"] is False

    # 6. Arabic (Arabic, RTL)
    res_ar = analyze_text_script_and_direction("ماذا تفعل؟")
    assert res_ar["primaryScript"] == "arabic"
    assert res_ar["direction"] == "rtl"
    assert res_ar["isRtl"] is True

    # 7. Persian (Arabic script with Persian characters, RTL)
    res_fa = analyze_text_script_and_direction("چه کار میکنی؟")
    assert res_fa["primaryScript"] == "arabic"
    assert res_fa["direction"] == "rtl"
    assert res_fa["isRtl"] is True

    # 8. Tamil (Tamil, LTR)
    res_ta = analyze_text_script_and_direction("நீ என்ன செய்கிறாய்?")
    assert res_ta["primaryScript"] == "tamil"
    assert res_ta["direction"] == "ltr"
    assert res_ta["isRtl"] is False

    # 9. Telugu (Telugu, LTR)
    res_te = analyze_text_script_and_direction("నువ్వు ఏమి చేస్తున్నావు?")
    assert res_te["primaryScript"] == "telugu"
    assert res_te["direction"] == "ltr"

    # 10. Kannada (Kannada, LTR)
    res_kn = analyze_text_script_and_direction("ನೀನು ಏನು ಮಾಡುತ್ತಿದ್ದೀಯ?")
    assert res_kn["primaryScript"] == "kannada"
    assert res_kn["direction"] == "ltr"

    # 11. Malayalam (Malayalam, LTR)
    res_ml = analyze_text_script_and_direction("നീ എന്താണ് ചെയ്യുന്നത്?")
    assert res_ml["primaryScript"] == "malayalam"
    assert res_ml["direction"] == "ltr"

    # 12. Japanese (Hiragana/Kanji, LTR)
    res_ja = analyze_text_script_and_direction("何をしているの？")
    assert res_ja["primaryScript"] == "japanese"
    assert res_ja["direction"] == "ltr"

    # 13. Korean (Hangul, LTR)
    res_ko = analyze_text_script_and_direction("무엇을 하고 있어?")
    assert res_ko["primaryScript"] == "korean"
    assert res_ko["direction"] == "ltr"

    # 14. Chinese (CJK, LTR)
    res_zh = analyze_text_script_and_direction("你在做什么？")
    assert res_zh["primaryScript"] == "cjk"
    assert res_zh["direction"] == "ltr"


def test_mixed_script_and_direction():
    # Mixed Urdu + English
    mixed_ur = "مجھے آج Summer of Love سننا ہے"
    res = analyze_text_script_and_direction(mixed_ur)
    assert res["isRtl"] is True
    assert res["direction"] == "rtl"
    assert res["hasMixedScripts"] is True

    # Mixed Hindi + English
    mixed_hi = "मुझे आज Summer of Love सुनना है"
    res_hi = analyze_text_script_and_direction(mixed_hi)
    assert res_hi["direction"] == "ltr"
    assert res_hi["hasMixedScripts"] is True


def test_annotate_lyric_lines():
    multilingual_lrc = """
[00:10.00]تم کیا کر رہے ہو
[00:15.00]What are you doing?
[00:20.00]तुम क्या कर रहे हो
[00:25.00]তুমি কী করছো
[00:30.00]ماذا تفعل؟
"""
    parsed = parse_lrc_lines(multilingual_lrc)
    assert len(parsed) == 5

    annotated, overall_script, overall_dir, overall_lang = annotate_lyric_lines(parsed)

    # Line 0: Urdu -> RTL
    assert annotated[0]["text"] == "تم کیا کر رہے ہو"
    assert annotated[0]["direction"] == "rtl"
    assert annotated[0]["script"] == "arabic"

    # Line 1: English -> LTR
    assert annotated[1]["text"] == "What are you doing?"
    assert annotated[1]["direction"] == "ltr"
    assert annotated[1]["script"] == "latin"

    # Line 2: Hindi -> LTR
    assert annotated[2]["text"] == "तुम क्या कर रहे हो"
    assert annotated[2]["direction"] == "ltr"
    assert annotated[2]["script"] == "devanagari"

    # Line 3: Bengali -> LTR
    assert annotated[3]["text"] == "তুমি কী করছো"
    assert annotated[3]["direction"] == "ltr"
    assert annotated[3]["script"] == "bengali"

    # Line 4: Arabic -> RTL
    assert annotated[4]["text"] == "ماذا تفعل؟"
    assert annotated[4]["direction"] == "rtl"
    assert annotated[4]["script"] == "arabic"


def test_composite_lyrics_provider_fallback(monkeypatch):
    class MockSyncedProvider(LyricsProvider):
        def get_lyrics(self, track_info):
            if track_info.get("videoId") == "synced_track":
                return {
                    "videoId": "synced_track",
                    "synced": True,
                    "hasLyrics": True,
                    "lines": [{"id": "0", "startTime": 1000, "text": "Hello"}],
                    "provider": "mock_synced",
                }
            return None

    class MockPlainProvider(LyricsProvider):
        def get_lyrics(self, track_info):
            if track_info.get("videoId") == "plain_track":
                return {
                    "videoId": "plain_track",
                    "synced": False,
                    "hasLyrics": True,
                    "lines": [{"id": "0", "text": "Plain line"}],
                    "provider": "mock_plain",
                }
            return None

    service = CompositeLyricsService()
    service.providers = [MockSyncedProvider(), MockPlainProvider()]

    # Test Synced
    res_synced = service.get_lyrics({"videoId": "synced_track"})
    assert res_synced["synced"] is True
    assert res_synced["provider"] == "mock_synced"

    # Test Plain Fallback
    res_plain = service.get_lyrics({"videoId": "plain_track"})
    assert res_plain["synced"] is False
    assert res_plain["hasLyrics"] is True
    assert res_plain["provider"] == "mock_plain"

    # Test None
    res_none = service.get_lyrics({"videoId": "unknown_track"})
    assert res_none["hasLyrics"] is False
