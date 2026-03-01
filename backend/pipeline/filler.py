"""
Filler and interjection detection via keyword matching.
Matches against the FILLER_WORDS list in config.py.

Multi-word fillers ("you know", "i mean") are detected via a consecutive
token sliding window so that each constituent token is consumed only once.
"""

import re
from typing import List

from config import FILLER_WORDS
from models.schemas import DisfluencyEvent, EventSource, EventType, WordTimestamp


# ---------------------------------------------------------------------------
# Pre-process filler list
# ---------------------------------------------------------------------------
# Split each phrase into a token tuple; sort longest-first so multi-word
# phrases are matched before their single-word prefixes.
_FILLER_NGRAMS: List[tuple] = sorted(
    [tuple(fw.lower().split()) for fw in FILLER_WORDS],
    key=lambda t: -len(t),
)


def _normalise_token(word: str) -> str:
    """Lowercase and strip punctuation from a single token."""
    return re.sub(r"[^\w']", "", word.lower())


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_fillers(words: List[WordTimestamp]) -> List[DisfluencyEvent]:
    """
    Detect filler words and interjections by matching against FILLER_WORDS.

    Single-word fillers (um, uh, like, so …) and multi-word phrases
    (you know, i mean) are both handled. Multi-word matches consume all
    constituent tokens so they cannot overlap with subsequent single-word
    matches.

    Args:
        words: Word-level timestamps from the transcriber.

    Returns:
        List of DisfluencyEvent (type=FILLER) sorted by start_ms.
        Events are non-overlapping.
    """
    if not words:
        return []

    n = len(words)
    events: List[DisfluencyEvent] = []
    skip: set = set()   # word indices already claimed by a multi-word match

    for i in range(n):
        if i in skip:
            continue

        # Pre-compute normalised tokens for the lookahead window (max 3 words)
        lookahead = min(3, n - i)
        norm_tokens = [_normalise_token(words[i + k].word) for k in range(lookahead)]

        for ngram in _FILLER_NGRAMS:
            span = len(ngram)
            if span > lookahead:
                continue
            if tuple(norm_tokens[:span]) == ngram:
                end_idx = i + span - 1
                raw_text = " ".join(words[i + k].word for k in range(span))
                events.append(
                    DisfluencyEvent(
                        type=EventType.FILLER,
                        start_ms=int(words[i].start * 1000),
                        end_ms=int(words[end_idx].end * 1000),
                        confidence=0.9,
                        source=EventSource.RULES,
                        text=raw_text,
                    )
                )
                for j in range(i, i + span):
                    skip.add(j)
                break   # stop checking shorter ngrams for this position

    return events
