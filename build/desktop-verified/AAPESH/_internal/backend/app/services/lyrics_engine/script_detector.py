"""Unicode-aware script detection and text direction analyzer for multilingual lyrics."""

import re
from typing import Dict, Any, Tuple, Optional

# Unicode range definitions for major script families
SCRIPT_RANGES = [
    ("arabic", (0x0600, 0x06FF)),           # Arabic, Urdu, Persian, Punjabi (Shahmukhi)
    ("arabic_supp", (0x0750, 0x077F)),      # Arabic Supplement (Urdu, etc.)
    ("arabic_ext_a", (0x08A0, 0x08FF)),     # Arabic Extended-A
    ("arabic_pres_a", (0xFB50, 0xFDFF)),    # Arabic Presentation Forms-A
    ("arabic_pres_b", (0xFE70, 0xFEFF)),    # Arabic Presentation Forms-B
    ("hebrew", (0x0590, 0x05FF)),           # Hebrew, Yiddish
    ("devanagari", (0x0900, 0x097F)),       # Hindi, Marathi, Sanskrit, Nepali
    ("devanagari_ext", (0xA8E0, 0xA8FF)),   # Devanagari Extended
    ("bengali", (0x0980, 0x09FF)),          # Bengali, Assamese
    ("gurmukhi", (0x0A00, 0x0A7F)),         # Punjabi (Gurmukhi)
    ("gujarati", (0x0A80, 0x0AFF)),         # Gujarati
    ("oriya", (0x0B00, 0x0B7F)),            # Odia
    ("tamil", (0x0B80, 0x0BFF)),            # Tamil
    ("telugu", (0x0C00, 0x0C7F)),           # Telugu
    ("kannada", (0x0C80, 0x0CFF)),          # Kannada
    ("malayalam", (0x0D00, 0x0D7F)),        # Malayalam
    ("sinhala", (0x0D80, 0x0DFF)),          # Sinhala
    ("thai", (0x0E00, 0x0E7F)),             # Thai
    ("lao", (0x0E80, 0x0EFF)),              # Lao
    ("tibetan", (0x0F00, 0x0FFF)),          # Tibetan
    ("myanmar", (0x1000, 0x109F)),          # Myanmar (Burmese)
    ("georgian", (0x10A0, 0x10FF)),         # Georgian
    ("hangul", (0xAC00, 0xD7AF)),           # Korean Hangul Syllables
    ("hangul_jamo", (0x1100, 0x11FF)),      # Korean Hangul Jamo
    ("hangul_comp", (0x3130, 0x318F)),      # Korean Hangul Compatibility Jamo
    ("hiragana", (0x3040, 0x309F)),         # Japanese Hiragana
    ("katakana", (0x30A0, 0x30FF)),         # Japanese Katakana
    ("cjk", (0x4E00, 0x9FFF)),              # CJK Unified Ideographs (Chinese Han, Kanji)
    ("cjk_ext_a", (0x3400, 0x4DBF)),        # CJK Unified Ideographs Extension A
    ("cyrillic", (0x0400, 0x04FF)),         # Russian, Ukrainian, etc.
    ("cyrillic_supp", (0x0500, 0x052F)),    # Cyrillic Supplement
    ("greek", (0x0370, 0x03FF)),            # Greek
    ("latin", (0x0041, 0x005A)),            # Basic Latin uppercase
    ("latin_low", (0x0061, 0x007A)),        # Basic Latin lowercase
    ("latin_ext_a", (0x0100, 0x017F)),      # Latin Extended-A (European accents)
    ("latin_ext_b", (0x0180, 0x024F)),      # Latin Extended-B
    ("latin_supp", (0x00C0, 0x00FF)),       # Latin-1 Supplement (Spanish, French, German, etc.)
]

# Script family grouping
SCRIPT_FAMILY_MAP = {
    "arabic": "arabic",
    "arabic_supp": "arabic",
    "arabic_ext_a": "arabic",
    "arabic_pres_a": "arabic",
    "arabic_pres_b": "arabic",
    "hebrew": "hebrew",
    "devanagari": "devanagari",
    "devanagari_ext": "devanagari",
    "bengali": "bengali",
    "gurmukhi": "gurmukhi",
    "gujarati": "gujarati",
    "oriya": "oriya",
    "tamil": "tamil",
    "telugu": "telugu",
    "kannada": "kannada",
    "malayalam": "malayalam",
    "sinhala": "sinhala",
    "thai": "thai",
    "lao": "lao",
    "tibetan": "tibetan",
    "myanmar": "myanmar",
    "georgian": "georgian",
    "hangul": "hangul",
    "hangul_jamo": "hangul",
    "hangul_comp": "hangul",
    "hiragana": "kana",
    "katakana": "kana",
    "cjk": "cjk",
    "cjk_ext_a": "cjk",
    "cyrillic": "cyrillic",
    "cyrillic_supp": "cyrillic",
    "greek": "greek",
    "latin": "latin",
    "latin_low": "latin",
    "latin_ext_a": "latin",
    "latin_ext_b": "latin",
    "latin_supp": "latin",
}

# RTL Scripts
RTL_SCRIPTS = {"arabic", "hebrew"}

# Characteristic characters for sub-language hint heuristics in Arabic script
# (DO NOT assume Arabic script is Arabic language; detect specific letters if present)
URDU_SPECIFIC_CHARS = set("ٹڈڑںہھےۓۃٿٽٺٻڄڅڈډڑږښکڳگڻںھہۂۃیے")
PERSIAN_SPECIFIC_CHARS = set("گچپژک")


def get_char_script(char: str) -> Optional[str]:
    """Return the script family for a single Unicode character, or None if symbol/space."""
    code = ord(char)
    for script_id, (start, end) in SCRIPT_RANGES:
        if start <= code <= end:
            return SCRIPT_FAMILY_MAP[script_id]
    return None


def analyze_text_script_and_direction(text: str) -> Dict[str, Any]:
    """
    Analyze a text string to determine:
    - Primary script
    - Text direction ('ltr' or 'rtl')
    - Language hint (or 'unknown')
    - Script character distribution counts
    """
    if not text or not text.strip():
        return {
            "primaryScript": "latin",
            "direction": "ltr",
            "language": "unknown",
            "isRtl": False,
            "hasMixedScripts": False,
            "scripts": {},
        }

    script_counts: Dict[str, int] = {}
    rtl_chars = 0
    ltr_chars = 0

    for char in text:
        script = get_char_script(char)
        if script:
            script_counts[script] = script_counts.get(script, 0) + 1
            if script in RTL_SCRIPTS:
                rtl_chars += 1
            else:
                ltr_chars += 1

    if not script_counts:
        # Punctuation / Numbers only -> default LTR / Latin
        return {
            "primaryScript": "latin",
            "direction": "ltr",
            "language": "unknown",
            "isRtl": False,
            "hasMixedScripts": False,
            "scripts": {},
        }

    # Determine primary script by character frequency
    primary_script = max(script_counts.items(), key=lambda x: x[1])[0]

    # For Japanese, if text contains Kana + CJK, treat primary script as 'japanese'
    if "kana" in script_counts:
        primary_script = "japanese"
    elif primary_script == "hangul":
        primary_script = "korean"

    # Direction determination: based on whether RTL script characters exist significantly
    # If the line has strong RTL characters (e.g. Urdu/Arabic phrase with an English song title),
    # direction is RTL with bidi isolation for the embedded LTR words.
    is_rtl = rtl_chars > 0 and (rtl_chars >= ltr_chars or primary_script in RTL_SCRIPTS)
    direction = "rtl" if is_rtl else "ltr"

    # Best-effort language heuristic
    language = "unknown"
    if primary_script == "arabic":
        # Check for specific Urdu or Persian characters
        urdu_hits = sum(1 for c in text if c in URDU_SPECIFIC_CHARS)
        persian_hits = sum(1 for c in text if c in PERSIAN_SPECIFIC_CHARS)
        if urdu_hits > 0:
            language = "ur"
        elif persian_hits > 0:
            language = "fa"
        else:
            # Could be Arabic, Urdu, Persian, etc. Keep language as unknown or arabic hint if pure
            language = "unknown"
    elif primary_script == "devanagari":
        language = "hi"
    elif primary_script == "bengali":
        language = "bn"
    elif primary_script == "gurmukhi":
        language = "pa"
    elif primary_script == "gujarati":
        language = "gu"
    elif primary_script == "tamil":
        language = "ta"
    elif primary_script == "telugu":
        language = "te"
    elif primary_script == "kannada":
        language = "kn"
    elif primary_script == "malayalam":
        language = "ml"
    elif primary_script == "japanese":
        language = "ja"
    elif primary_script == "korean":
        language = "ko"
    elif primary_script == "cjk":
        language = "zh"
    elif primary_script == "hebrew":
        language = "he"
    elif primary_script == "cyrillic":
        language = "ru"
    elif primary_script == "latin":
        language = "en"

    has_mixed_scripts = len(script_counts) > 1

    return {
        "primaryScript": primary_script,
        "direction": direction,
        "language": language,
        "isRtl": is_rtl,
        "hasMixedScripts": has_mixed_scripts,
        "scripts": script_counts,
    }


def annotate_lyric_lines(lines: list) -> Tuple[list, str, str, str]:
    """
    Annotates each lyric line in-place with its independent script, direction, and language,
    and calculates document-level overall primary script, direction, and language.
    """
    if not lines:
        return lines, "latin", "ltr", "unknown"

    script_totals: Dict[str, int] = {}
    rtl_line_count = 0
    annotated = []

    for line in lines:
        text = line.get("text", "")
        analysis = analyze_text_script_and_direction(text)
        
        line_copy = dict(line)
        line_copy["script"] = analysis["primaryScript"]
        line_copy["direction"] = analysis["direction"]
        line_copy["language"] = analysis["language"]
        
        script_name = analysis["primaryScript"]
        script_totals[script_name] = script_totals.get(script_name, 0) + len(text)
        if analysis["isRtl"]:
            rtl_line_count += 1
            
        annotated.append(line_copy)

    overall_script = max(script_totals.items(), key=lambda x: x[1])[0] if script_totals else "latin"
    overall_direction = "rtl" if rtl_line_count > len(lines) / 2 else "ltr"
    
    # Heuristic for document-level language
    overall_language = "unknown"
    for line in annotated:
        if line.get("language") and line["language"] != "unknown":
            overall_language = line["language"]
            break

    return annotated, overall_script, overall_direction, overall_language
