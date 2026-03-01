"""
Speaking rate and pace variability analysis.
Uses CMUDict (via nltk) for syllable counting with a vowel-group heuristic fallback.

Requires: python -m nltk.downloader cmudict
"""

import re
from typing import List, Optional

import numpy as np
from pydantic import BaseModel

from config import NORMAL_RATE_MAX, NORMAL_RATE_MIN, PACE_WINDOW_SEC
from models.schemas import SegmentType, VADSegment, WordTimestamp


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

class SpeakingRateResult(BaseModel):
    """Pipeline-internal speaking rate output (richer than the public API schema)."""
    speaking_rate_syl_sec: float   # syllables/sec over total duration (incl. pauses)
    articulation_rate: float       # syllables/sec over speech-only duration
    pace_variability: float        # std dev of per-window syllable rates
    total_syllables: int
    speech_duration_sec: float
    total_duration_sec: float


# ---------------------------------------------------------------------------
# Syllable counting
# ---------------------------------------------------------------------------

_cmudict: Optional[dict] = None
_cmudict_loaded: bool = False


def _get_cmudict() -> Optional[dict]:
    """Load CMUDict once and cache it for the process lifetime."""
    global _cmudict, _cmudict_loaded
    if _cmudict_loaded:
        return _cmudict
    try:
        import nltk
        _cmudict = nltk.corpus.cmudict.dict()
    except Exception:
        _cmudict = None
    _cmudict_loaded = True
    return _cmudict


def count_syllables(word: str) -> int:
    """
    Count syllables in a word using CMUDict, falling back to vowel-group counting.

    CMUDict phonemes ending in a digit carry lexical stress marks; counting
    those gives the syllable count. Fallback applies a silent-e correction
    on top of the vowel-group count for reasonable accuracy on unknown words.

    Args:
        word: A single word token (may contain punctuation).

    Returns:
        Syllable count >= 1.
    """
    clean = re.sub(r"[^a-zA-Z']", "", word).lower()
    if not clean:
        return 1

    d = _get_cmudict()
    if d and clean in d:
        # Each phoneme ending in a digit marks a vowel nucleus → one syllable
        return max(1, sum(1 for ph in d[clean][0] if ph[-1].isdigit()))

    # -------------------------------------------------------------------
    # Vowel-group heuristic fallback
    # -------------------------------------------------------------------
    count = 0
    in_vowel = False
    for ch in clean:
        if ch in "aeiou":
            if not in_vowel:
                count += 1
            in_vowel = True
        else:
            in_vowel = False

    # Silent-e correction: words ending in 'e' after a consonant typically
    # do not add a syllable (e.g. "like"=1, "same"=1, "the"=1 stays 1).
    if clean.endswith("e") and count > 1:
        count -= 1

    return max(count, 1)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyze_speaking_rate(
    words: List[WordTimestamp],
    segments: List[VADSegment],
) -> SpeakingRateResult:
    """
    Compute speaking rate, articulation rate, pace variability, and total syllables.

    Rates:
        speaking_rate    = total_syllables / total_audio_duration  (includes pauses)
        articulation_rate = total_syllables / speech_only_duration (excludes pauses)
        pace_variability  = std dev of per-window rates across PACE_WINDOW_SEC windows

    Args:
        words:    Word-level timestamps (seconds) from transcription.
        segments: VAD segment list (used to measure true speech duration).

    Returns:
        SpeakingRateResult with all computed metrics.
    """
    if not words:
        return SpeakingRateResult(
            speaking_rate_syl_sec=0.0,
            articulation_rate=0.0,
            pace_variability=0.0,
            total_syllables=0,
            speech_duration_sec=0.0,
            total_duration_sec=0.0,
        )

    # ------------------------------------------------------------------
    # 1. Syllable counts per word
    # ------------------------------------------------------------------
    syllable_counts = [count_syllables(w.word) for w in words]
    total_syllables = sum(syllable_counts)

    # ------------------------------------------------------------------
    # 2. Duration
    # ------------------------------------------------------------------
    # Total duration: use whichever is larger — last word end or last VAD segment
    total_duration_sec = words[-1].end
    if segments:
        total_duration_sec = max(total_duration_sec, segments[-1].end_ms / 1000)
    total_duration_sec = max(total_duration_sec, 1e-6)

    speech_duration_sec = sum(
        (seg.end_ms - seg.start_ms) / 1000
        for seg in segments
        if seg.type == SegmentType.SPEECH
    )
    speech_duration_sec = max(speech_duration_sec, 1e-6)

    # ------------------------------------------------------------------
    # 3. Speaking rate and articulation rate
    # ------------------------------------------------------------------
    speaking_rate_syl_sec = total_syllables / total_duration_sec
    articulation_rate     = total_syllables / speech_duration_sec

    # ------------------------------------------------------------------
    # 4. Pace variability — non-overlapping PACE_WINDOW_SEC windows
    # ------------------------------------------------------------------
    window_rates: List[float] = []
    audio_start  = words[0].start
    audio_end    = words[-1].end
    window_start = audio_start

    while window_start < audio_end:
        window_end = window_start + PACE_WINDOW_SEC
        # Syllables for words whose midpoint falls within this window
        window_syl = sum(
            syllable_counts[j]
            for j, w in enumerate(words)
            if window_start <= (w.start + w.end) / 2.0 < window_end
        )
        actual_dur = min(window_end, audio_end) - window_start
        # Only count windows with at least 500ms of speech content
        if actual_dur >= 0.5:
            window_rates.append(window_syl / actual_dur)
        window_start += PACE_WINDOW_SEC

    pace_variability = float(np.std(window_rates)) if len(window_rates) > 1 else 0.0

    return SpeakingRateResult(
        speaking_rate_syl_sec=round(speaking_rate_syl_sec, 3),
        articulation_rate=round(articulation_rate, 3),
        pace_variability=round(pace_variability, 3),
        total_syllables=total_syllables,
        speech_duration_sec=round(speech_duration_sec, 3),
        total_duration_sec=round(total_duration_sec, 3),
    )
