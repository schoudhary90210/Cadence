"""
Filler and interjection detection via keyword matching.
Matches against the FILLER_WORDS list in config.py.

Multi-word fillers ("you know", "i mean") are detected via a consecutive
token sliding window so that each constituent token is consumed only once.

Whisper sometimes capitalises, merges, or slightly misspells fillers
(e.g. "Um", "Uhm", "Umm"). We handle this with:
  1. Case-insensitive normalisation on all tokens
  2. A prefix/startswith check for single-word fillers so "umm" matches "um"
  3. Extra variations added directly to FILLER_WORDS in config.py
"""

import re
from typing import List, Set

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

# Single-word fillers used for prefix matching (catches "umm", "uhh", etc.)
_SINGLE_FILLERS: Set[str] = {t[0] for t in _FILLER_NGRAMS if len(t) == 1}


def _normalise_token(word: str) -> str:
    """Lowercase and strip punctuation from a single token."""
    return re.sub(r"[^\w']", "", word.lower())


def _is_filler_prefix(token: str) -> bool:
    """Check if token starts with any known single-word filler.

    Catches Whisper elongations like "umm", "uhh", "hmm", "errm", etc.
    Only matches if the token is purely alphabetical (avoids false positives
    on normal words that happen to start with "so" or "like").
    """
    if not token.isalpha():
        return False
    for filler in _SINGLE_FILLERS:
        # Only prefix-match short fillers (<=3 chars) to avoid matching
        # normal words starting with "like", "right", "so" etc.
        if len(filler) <= 3 and token.startswith(filler) and len(token) <= len(filler) + 2:
            return True
    return False


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_fillers(words: List[WordTimestamp]) -> List[DisfluencyEvent]:
    """
    Detect filler words and interjections by matching against FILLER_WORDS.

    Single-word fillers (um, uh, like, so ...) and multi-word phrases
    (you know, i mean) are both handled. Multi-word matches consume all
    constituent tokens so they cannot overlap with subsequent single-word
    matches.

    Additionally, prefix matching catches Whisper variations like "umm",
    "uhh", "errm" that are elongated versions of known fillers.

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

        matched = False

        # First try exact n-gram matching (longest first)
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
                matched = True
                break

        # Fallback: prefix match for elongated fillers ("umm", "uhh", etc.)
        if not matched and _is_filler_prefix(norm_tokens[0]):
            events.append(
                DisfluencyEvent(
                    type=EventType.FILLER,
                    start_ms=int(words[i].start * 1000),
                    end_ms=int(words[i].end * 1000),
                    confidence=0.85,
                    source=EventSource.RULES,
                    text=words[i].word,
                )
            )
            skip.add(i)

    return events
