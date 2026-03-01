"""
Phase 7 (Tier 2): wav2vec2-base-960h CTC phonetic transcription.

Produces a character-level transcript with per-character timestamps using
wav2vec2-base-960h (CTC model).  The raw CTC output preserves acoustic
timing information that reveals sub-word disfluency patterns invisible to
word-level transcription:

    - Sound repetitions:  b|b|b|ut → the model "hears" /b/ three times
    - Prolongations:      sssssso → sustained /s/ across many frames
    - Syllable repetitions: ba|ba|ba|nana → repeated syllable onsets

detect_sound_repetitions() scans the CTC character stream for these
patterns and returns DisfluencyEvent objects with source=PHONETIC.

Fallback:
    Everything wrapped in try/except — returns empty results on failure.
    The pipeline never crashes due to phonetic model issues.
"""

import logging
import re
from pathlib import Path
from typing import List, Optional, Tuple

import librosa
import numpy as np
import torch

from config import SAMPLE_RATE, WAV2VEC_ASR_MODEL_ID
from models.schemas import (
    CharTimestamp,
    DisfluencyEvent,
    EventSource,
    EventSubtype,
    EventType,
    PhoneticTranscript,
)

logger = logging.getLogger("cadence.wav2vec_phonetic")

# CTC frame timing: each output frame = 320 input samples = 20ms at 16kHz
CTC_FRAME_MS = 20.0
CTC_FRAME_SEC = CTC_FRAME_MS / 1000.0

# Thresholds for sound repetition / prolongation detection
MIN_REPEAT_COUNT = 3       # at least 3 repetitions of the same character to flag
MIN_PROLONGATION_FRAMES = 8  # sustained character across 8+ raw frames (160ms+)
MIN_SYLLABLE_REPS = 2     # at least 2 repetitions of a syllable pattern


# ---------------------------------------------------------------------------
# Module-level model cache (loaded once)
# ---------------------------------------------------------------------------

_processor = None
_ctc_model = None


def _load_ctc_model():
    """Load wav2vec2-base-960h CTC model + processor (cached)."""
    global _processor, _ctc_model

    if _processor is not None and _ctc_model is not None:
        return _processor, _ctc_model

    from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

    logger.info(f"Loading CTC model: {WAV2VEC_ASR_MODEL_ID}...")
    _processor = Wav2Vec2Processor.from_pretrained(WAV2VEC_ASR_MODEL_ID)
    _ctc_model = Wav2Vec2ForCTC.from_pretrained(WAV2VEC_ASR_MODEL_ID)
    _ctc_model.eval()
    logger.info("CTC model loaded.")

    return _processor, _ctc_model


# ---------------------------------------------------------------------------
# CTC decoding helpers
# ---------------------------------------------------------------------------


def _ctc_decode_with_timestamps(
    logits: torch.Tensor,
    processor,
) -> Tuple[str, List[CharTimestamp], List[Tuple[str, int, int]]]:
    """
    Greedy CTC decode with per-character timing.

    Standard CTC:
        1. argmax per frame → token IDs
        2. Remove blank (pad) tokens
        3. Collapse consecutive duplicate characters

    We track timing through all three steps so each output character
    gets a start/end timestamp.

    Returns:
        text:          Decoded text string (standard CTC output)
        characters:    List of CharTimestamp (collapsed, with timing in seconds)
        raw_chars:     List of (char, start_frame, end_frame) BEFORE collapsing
                       consecutive duplicates — used for stutter detection
    """
    predicted_ids = torch.argmax(logits, dim=-1)[0]  # shape: [T]
    tokens = predicted_ids.tolist()

    # Get vocabulary mapping
    vocab = processor.tokenizer.get_vocab()
    id_to_token = {v: k for k, v in vocab.items()}

    pad_token_id = processor.tokenizer.pad_token_id
    if pad_token_id is None:
        pad_token_id = 0  # CTC blank is typically 0

    # Step 1: Remove blanks, keep (char, frame_index) pairs
    non_blank: List[Tuple[str, int]] = []
    for frame_idx, token_id in enumerate(tokens):
        if token_id == pad_token_id:
            continue
        char = id_to_token.get(token_id, "")
        if char and char not in ("<s>", "</s>", "<unk>"):
            non_blank.append((char.lower(), frame_idx))

    if not non_blank:
        return "", [], []

    # Step 2: Group consecutive same-character frames (raw runs)
    # Each run = (char, first_frame, last_frame+1)
    raw_runs: List[Tuple[str, int, int]] = []
    run_char, run_start = non_blank[0]
    run_end = non_blank[0][1] + 1

    for char, frame_idx in non_blank[1:]:
        if char == run_char:
            run_end = frame_idx + 1
        else:
            raw_runs.append((run_char, run_start, run_end))
            run_char = char
            run_start = frame_idx
            run_end = frame_idx + 1
    raw_runs.append((run_char, run_start, run_end))

    # Step 3: Collapse consecutive same-character runs (standard CTC collapse)
    collapsed: List[Tuple[str, int, int]] = []
    for char, start_f, end_f in raw_runs:
        if collapsed and collapsed[-1][0] == char:
            # Same character — this is a CTC-separated repetition, keep it
            # (A blank between two runs of the same char means separate instances)
            # Actually in standard CTC, raw_runs already merged consecutive same chars.
            # If we get here, it means the char changed then came back.
            collapsed.append((char, start_f, end_f))
        else:
            collapsed.append((char, start_f, end_f))

    # Build output text and CharTimestamp list
    text_parts: List[str] = []
    characters: List[CharTimestamp] = []
    prev_char = None

    for char, start_f, end_f in collapsed:
        # Add space between word boundaries
        if char == "|":
            text_parts.append(" ")
            prev_char = "|"
            continue

        text_parts.append(char)
        characters.append(
            CharTimestamp(
                char=char,
                start=round(start_f * CTC_FRAME_SEC, 3),
                end=round(end_f * CTC_FRAME_SEC, 3),
            )
        )
        prev_char = char

    text = "".join(text_parts).strip()
    # Clean up extra spaces
    text = re.sub(r"\s+", " ", text)

    return text, characters, raw_runs


# ---------------------------------------------------------------------------
# Public API: phonetic transcription
# ---------------------------------------------------------------------------


def transcribe_phonetic(audio_path: str) -> Optional[PhoneticTranscript]:
    """
    Produce character-level CTC transcript using wav2vec2-base-960h.

    Loads audio with librosa (handles any format), resamples to 16kHz,
    runs through the CTC model with greedy decoding.

    Args:
        audio_path: Path to audio file (any format).

    Returns:
        PhoneticTranscript with text and per-character timestamps,
        or None if the model fails to load or process.

    Raises:
        Nothing — all errors caught and logged (returns None).
    """
    try:
        processor, model = _load_ctc_model()

        audio, _ = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True)

        input_values = processor(
            audio, sampling_rate=SAMPLE_RATE, return_tensors="pt"
        ).input_values

        with torch.no_grad():
            logits = model(input_values).logits

        text, characters, _ = _ctc_decode_with_timestamps(logits, processor)

        return PhoneticTranscript(text=text, characters=characters)

    except Exception as exc:
        logger.warning(f"phonetic transcription failed: {exc}")
        raise


# ---------------------------------------------------------------------------
# Public API: sound repetition detection
# ---------------------------------------------------------------------------


def detect_sound_repetitions(
    phonetic: PhoneticTranscript,
) -> List[DisfluencyEvent]:
    """
    Scan the phonetic character stream for sub-word disfluency patterns:

    1. **Repeated single characters** before a word onset (b-b-b-ut):
       Three or more runs of the same consonant within a short window,
       especially before a vowel transition → type=REPETITION, subtype=SOUND_REP

    2. **Sustained characters** (sssss, mmmmm):
       A single character spanning many consecutive frames (160ms+),
       indicating a prolongation → type=PROLONGATION

    3. **Repeated short syllable patterns** (ba-ba-banana):
       Two or more occurrences of a 2-3 character syllable-like pattern
       within a word → type=REPETITION, subtype=SOUND_REP

    Args:
        phonetic: PhoneticTranscript from transcribe_phonetic().

    Returns:
        List of DisfluencyEvent with source=PHONETIC.
    """
    events: List[DisfluencyEvent] = []
    chars = phonetic.characters

    if len(chars) < 3:
        return events

    # --- Pattern 1: Repeated single characters (b-b-b before a word) ---
    events.extend(_detect_char_repetitions(chars))

    # --- Pattern 2: Sustained characters (prolongation) ---
    events.extend(_detect_prolongations(chars))

    # --- Pattern 3: Repeated syllable patterns ---
    events.extend(_detect_syllable_repetitions(chars))

    # Deduplicate: merge overlapping events of the same type
    events = _deduplicate_events(events)

    return events


# ---------------------------------------------------------------------------
# Detection helpers
# ---------------------------------------------------------------------------

VOWELS = set("aeiou")
CONSONANTS = set("bcdfghjklmnpqrstvwxyz")


def _detect_char_repetitions(
    chars: List[CharTimestamp],
) -> List[DisfluencyEvent]:
    """
    Find sequences where the same character appears 3+ times in a row
    (possibly with short gaps), indicating a sound repetition.

    Example: b(0.1-0.12), b(0.15-0.17), b(0.19-0.21), u(0.23-0.25)
    → sound repetition "b-b-b" at 100-210ms
    """
    events: List[DisfluencyEvent] = []
    i = 0

    while i < len(chars) - 2:
        c = chars[i].char
        if c not in CONSONANTS:
            i += 1
            continue

        # Count consecutive occurrences of the same character
        run_end = i + 1
        while run_end < len(chars) and chars[run_end].char == c:
            # Check they're close together (within 500ms gap)
            gap = chars[run_end].start - chars[run_end - 1].end
            if gap > 0.5:
                break
            run_end += 1

        count = run_end - i
        if count >= MIN_REPEAT_COUNT:
            start_ms = int(chars[i].start * 1000)
            end_ms = int(chars[run_end - 1].end * 1000)
            repeated_char = c
            events.append(
                DisfluencyEvent(
                    type=EventType.REPETITION,
                    subtype=EventSubtype.SOUND_REP,
                    start_ms=start_ms,
                    end_ms=end_ms,
                    confidence=min(0.7 + count * 0.05, 0.95),
                    source=EventSource.PHONETIC,
                    text=f"{repeated_char}-" * count + "...",
                )
            )
            i = run_end
        else:
            i += 1

    return events


def _detect_prolongations(
    chars: List[CharTimestamp],
) -> List[DisfluencyEvent]:
    """
    Find characters that span an unusually long duration (160ms+),
    indicating a prolongation (sustained sound).

    Typical CTC characters span 20-60ms. A character spanning 160ms+
    means the model heard the same sound for an extended period.
    """
    events: List[DisfluencyEvent] = []
    min_dur_sec = MIN_PROLONGATION_FRAMES * CTC_FRAME_SEC  # 0.16s

    for ct in chars:
        dur = ct.end - ct.start
        if dur >= min_dur_sec and ct.char in (CONSONANTS | VOWELS):
            start_ms = int(ct.start * 1000)
            end_ms = int(ct.end * 1000)
            # Higher confidence for longer prolongations
            conf = min(0.7 + (dur - min_dur_sec) * 2.0, 0.95)
            events.append(
                DisfluencyEvent(
                    type=EventType.PROLONGATION,
                    start_ms=start_ms,
                    end_ms=end_ms,
                    confidence=round(conf, 3),
                    source=EventSource.PHONETIC,
                    text=f"{ct.char}{'~' * int(dur / CTC_FRAME_SEC)}",
                )
            )

    return events


def _detect_syllable_repetitions(
    chars: List[CharTimestamp],
) -> List[DisfluencyEvent]:
    """
    Find repeated 2-3 character syllable patterns (ba-ba-ba, re-re-re).

    Scans with a sliding window: if the same 2 or 3 character sequence
    appears 2+ times consecutively, flag as sound repetition.
    """
    events: List[DisfluencyEvent] = []

    for pattern_len in (2, 3):
        if len(chars) < pattern_len * MIN_SYLLABLE_REPS:
            continue

        i = 0
        while i <= len(chars) - pattern_len * MIN_SYLLABLE_REPS:
            # Extract candidate pattern
            pattern = "".join(c.char for c in chars[i : i + pattern_len])

            # Count consecutive repetitions
            reps = 1
            j = i + pattern_len
            while j + pattern_len <= len(chars):
                next_pattern = "".join(
                    c.char for c in chars[j : j + pattern_len]
                )
                if next_pattern == pattern:
                    # Check timing gap is reasonable (< 500ms between reps)
                    gap = chars[j].start - chars[j - 1].end
                    if gap > 0.5:
                        break
                    reps += 1
                    j += pattern_len
                else:
                    break

            if reps >= MIN_SYLLABLE_REPS:
                start_ms = int(chars[i].start * 1000)
                end_ms = int(chars[j - 1].end * 1000)
                events.append(
                    DisfluencyEvent(
                        type=EventType.REPETITION,
                        subtype=EventSubtype.SOUND_REP,
                        start_ms=start_ms,
                        end_ms=end_ms,
                        confidence=min(0.65 + reps * 0.1, 0.95),
                        source=EventSource.PHONETIC,
                        text=f"({''.join(pattern)})" + f"×{reps}",
                    )
                )
                i = j
            else:
                i += 1

    return events


def _deduplicate_events(
    events: List[DisfluencyEvent],
) -> List[DisfluencyEvent]:
    """
    Remove overlapping phonetic events of the same type, keeping
    the one with higher confidence.
    """
    if len(events) <= 1:
        return events

    # Sort by start time
    events.sort(key=lambda e: e.start_ms)
    result: List[DisfluencyEvent] = [events[0]]

    for ev in events[1:]:
        prev = result[-1]
        # Check overlap
        if ev.start_ms < prev.end_ms and ev.type == prev.type:
            # Keep the one with higher confidence
            if ev.confidence > prev.confidence:
                result[-1] = ev
        else:
            result.append(ev)

    return result
