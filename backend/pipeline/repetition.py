"""
Repetition detection via sliding window Levenshtein comparison.
Detects word repetitions, phrase repetitions, and sound-level repetitions
from Whisper word timestamps.

Thresholds and window sizes come from config.py — never hardcoded here.
"""

import re
from typing import List, Set, Tuple

from config import LEVENSHTEIN_THRESHOLD, REPETITION_WINDOW_SIZES
from models.schemas import DisfluencyEvent, EventSource, EventSubtype, EventType, WordTimestamp

# ---------------------------------------------------------------------------
# Levenshtein ratio — use C-extension if available, fall back to difflib
# ---------------------------------------------------------------------------
try:
    from Levenshtein import ratio as _lev_ratio
except ImportError:
    from difflib import SequenceMatcher as _SM
    def _lev_ratio(a: str, b: str) -> float:  # type: ignore[misc]
        return _SM(None, a, b).ratio()


# ---------------------------------------------------------------------------
# Sound-repetition patterns (character / syllable level within one token)
#
# These fire on individual word tokens that look like stuttered surface forms,
# e.g. Whisper transcribes severe sound reps literally:
#   "b-b-but"  "w-w-want"  "sssso"  "mmm"  "ba-ba-baby"
# ---------------------------------------------------------------------------
_SOUND_REP_PATTERNS = [
    # Hyphenated initial char repetition: "b-b", "b-b-b", "w-w-want"
    re.compile(r'^([a-z])-(?:\1-)+', re.IGNORECASE),
    # Prolonged initial character: "sssso", "mmm" (≥3 identical chars at start)
    re.compile(r'^([a-z])\1{2,}', re.IGNORECASE),
    # Repeated syllable within token: "ba-ba", "da-da-da", "ma-ma"
    re.compile(r'^([a-z]{2,4})-\1(?:-\1)*\b', re.IGNORECASE),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalise(word: str) -> str:
    """Lowercase and strip punctuation for stable Levenshtein comparison."""
    return re.sub(r"[^\w']", "", word.lower()).strip()


def _check_sound_rep(word: WordTimestamp) -> DisfluencyEvent | None:
    """
    Return a SOUND_REP event if this single token looks like a stuttered form.
    Returns None if the word looks clean.
    """
    raw = word.word.strip()
    for pattern in _SOUND_REP_PATTERNS:
        if pattern.search(raw):
            return DisfluencyEvent(
                type=EventType.REPETITION,
                subtype=EventSubtype.SOUND_REP,
                start_ms=int(word.start * 1000),
                end_ms=int(word.end * 1000),
                confidence=0.85,
                source=EventSource.RULES,
                text=raw,
            )
    return None


def _spans_overlap(a_start: int, a_end: int, b_start: int, b_end: int) -> bool:
    """True if two ms intervals share any overlap."""
    return a_start < b_end and b_start < a_end


def _deduplicate(events: List[DisfluencyEvent]) -> List[DisfluencyEvent]:
    """
    Remove events whose span is fully contained within a larger event's span.
    When two events have the identical span, keep the higher-confidence one.

    Operates on a span-sorted list; modifies nothing in place.
    """
    # Sort by span length descending so larger spans come first
    sorted_events = sorted(events, key=lambda e: -(e.end_ms - e.start_ms))
    kept: List[DisfluencyEvent] = []

    for candidate in sorted_events:
        dominated = False
        for existing in kept:
            # Exact duplicate span — keep higher confidence
            if existing.start_ms == candidate.start_ms and existing.end_ms == candidate.end_ms:
                dominated = True
                break
            # Candidate is fully contained within an existing larger event
            if existing.start_ms <= candidate.start_ms and existing.end_ms >= candidate.end_ms:
                dominated = True
                break
        if not dominated:
            kept.append(candidate)

    return sorted(kept, key=lambda e: e.start_ms)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_repetitions(words: List[WordTimestamp]) -> List[DisfluencyEvent]:
    """
    Detect word, phrase, and sound-level repetitions from Whisper word tokens.

    Algorithm:
        Pass 1 — Sound reps: scan each token against _SOUND_REP_PATTERNS.
        Pass 2 — Word/phrase reps: for each window size N in
                 REPETITION_WINDOW_SIZES (largest first), compare every
                 consecutive pair of N-grams using Levenshtein ratio.
                 Match if ratio >= LEVENSHTEIN_THRESHOLD (0.85).
        Pass 3 — Deduplicate overlapping/contained events.

    Subtype assignment:
        window == 1   → WORD_REP   (single word repeated)
        window >= 2   → PHRASE_REP (multi-word chunk repeated)
        regex match   → SOUND_REP  (sound/syllable level within one token)

    Args:
        words: Per-word timestamps from transcription.transcribe().

    Returns:
        List of DisfluencyEvent, sorted by start_ms, deduplicated.
    """
    if not words:
        return []

    events: List[DisfluencyEvent] = []

    # ------------------------------------------------------------------
    # Pass 1: sound-level repetitions (within individual tokens)
    # ------------------------------------------------------------------
    for word in words:
        ev = _check_sound_rep(word)
        if ev:
            events.append(ev)

    # ------------------------------------------------------------------
    # Pass 2: word / phrase repetitions via sliding window
    # Process largest windows first so phrase reps take priority in dedup.
    # ------------------------------------------------------------------
    n = len(words)

    for window_size in sorted(REPETITION_WINDOW_SIZES, reverse=True):
        # Need at least 2*window_size words to form a pair of n-grams
        if n < window_size * 2:
            continue

        for i in range(n - window_size * 2 + 1):
            gram_a_words = words[i : i + window_size]
            gram_b_words = words[i + window_size : i + window_size * 2]

            gram_a = " ".join(_normalise(w.word) for w in gram_a_words)
            gram_b = " ".join(_normalise(w.word) for w in gram_b_words)

            # Skip empty tokens (punctuation-only words after normalisation)
            if not gram_a or not gram_b:
                continue

            similarity = _lev_ratio(gram_a, gram_b)
            if similarity < LEVENSHTEIN_THRESHOLD:
                continue

            start_ms = int(gram_a_words[0].start * 1000)
            end_ms   = int(gram_b_words[-1].end  * 1000)

            # Build display text: "gram_a → gram_b" (original casing)
            original_a = " ".join(w.word for w in gram_a_words)
            original_b = " ".join(w.word for w in gram_b_words)
            text = f"{original_a} {original_b}"

            subtype = (
                EventSubtype.WORD_REP if window_size == 1 else EventSubtype.PHRASE_REP
            )

            events.append(
                DisfluencyEvent(
                    type=EventType.REPETITION,
                    subtype=subtype,
                    start_ms=start_ms,
                    end_ms=end_ms,
                    confidence=round(float(similarity), 3),
                    source=EventSource.RULES,
                    text=text,
                )
            )

    # ------------------------------------------------------------------
    # Pass 3: deduplicate (remove contained sub-events)
    # ------------------------------------------------------------------
    return _deduplicate(events)
