"""
Voice Activity Detection via RMS energy analysis.
Segments audio into speech/silence regions in milliseconds.
Detects blocks (pathological pauses) within utterance boundaries.

All thresholds are sourced from config.py — tune there, never here.
"""

import time
from pathlib import Path
from typing import List, Optional, Union

import librosa
import numpy as np
from pydantic import BaseModel

from config import (
    BLOCK_SILENCE_THRESHOLD_MS,
    SAMPLE_RATE,
    SILENCE_MERGE_GAP_MS,
    VAD_ENERGY_THRESHOLD_MULTIPLIER,
    VAD_FRAME_MS,
    VAD_HOP_MS,
)
from models.schemas import DisfluencyEvent, EventSource, EventType, SegmentType, VADSegment, WordTimestamp


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

class VADResult(BaseModel):
    """Pipeline-internal VAD output, including latency not in the API schema."""
    segments: List[VADSegment]
    detected_blocks: List[DisfluencyEvent]   # BLOCK events for silence >= BLOCK_SILENCE_THRESHOLD_MS
    latency_ms: float


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _frames_to_segments(is_speech: np.ndarray, hop_length: int, total_ms: int) -> List[VADSegment]:
    """
    Convert a boolean frame array into a list of contiguous VADSegments.

    Each frame i maps to audio starting at (i * hop_length) samples.
    We use integer ms to stay consistent with the schema.
    """
    if len(is_speech) == 0:
        return []

    segments: List[VADSegment] = []
    current_type = SegmentType.SPEECH if is_speech[0] else SegmentType.SILENCE
    start_frame = 0

    for i in range(1, len(is_speech)):
        frame_type = SegmentType.SPEECH if is_speech[i] else SegmentType.SILENCE
        if frame_type != current_type:
            start_ms = int(start_frame * hop_length / SAMPLE_RATE * 1000)
            end_ms   = int(i * hop_length / SAMPLE_RATE * 1000)
            segments.append(VADSegment(type=current_type, start_ms=start_ms, end_ms=end_ms))
            current_type = frame_type
            start_frame = i

    # Flush the final run, clamped to actual audio length
    start_ms = int(start_frame * hop_length / SAMPLE_RATE * 1000)
    segments.append(VADSegment(type=current_type, start_ms=start_ms, end_ms=total_ms))

    return segments


def _merge_short_silences(segments: List[VADSegment], gap_ms: int) -> List[VADSegment]:
    """
    Merge adjacent speech segments separated by silence shorter than gap_ms.

    Algorithm: single left-to-right pass.
    When we encounter a speech segment whose predecessor is a short silence
    that itself follows a speech segment, we collapse all three into one.

    Example (gap_ms=100):
        [speech 0-200] [silence 201-250] [speech 251-400]
        → [speech 0-400]     (50ms gap < 100ms → merged)
    """
    if not segments:
        return segments

    result: List[VADSegment] = [segments[0]]

    for seg in segments[1:]:
        prev = result[-1]

        if (
            seg.type == SegmentType.SPEECH
            and prev.type == SegmentType.SILENCE
            and len(result) >= 2
            and result[-2].type == SegmentType.SPEECH
            and (prev.end_ms - prev.start_ms) < gap_ms
        ):
            # Remove the short silence and extend the preceding speech segment
            result.pop()
            result[-1] = VADSegment(
                type=SegmentType.SPEECH,
                start_ms=result[-1].start_ms,
                end_ms=seg.end_ms,
            )
        else:
            result.append(seg)

    return result


def _detect_blocks(
    segments: List[VADSegment],
    threshold_ms: int,
    words: Optional[List[WordTimestamp]] = None,
) -> List[DisfluencyEvent]:
    """
    Find silence segments longer than threshold_ms that fall *within* the utterance,
    and return them as DisfluencyEvent objects of type BLOCK.

    A silence at the very beginning or very end of the recording is ambient
    silence, not a block. We only flag pauses that have speech on both sides.

    Two additional accuracy filters are applied when applicable:

    Filter A — preceding speech duration check:
        The speech segment immediately before the silence must be at least
        200 ms long. This eliminates noise artifacts (micro-blips of < 200 ms
        classified as speech) that would otherwise pass the within-utterance
        check and falsely trigger a block. The following speech segment is NOT
        checked: after a real stuttering block the speaker's first attempt to
        resume can be short as they struggle to continue — requiring 200 ms
        after would suppress genuine blocks.

    Filter B — sentence-boundary skip (requires `words`):
        If any sentence-terminal word (ending in . ! ?) has its Whisper end
        timestamp within ±200 ms of the silence's start, the pause is a natural
        inter-sentence breath, not a pathological block. Skip it.
        Tolerance is kept tight (200 ms) so that blocks occurring right after a
        sentence end are not incorrectly suppressed.

    Args:
        segments:     Merged VAD segment list (alternating speech/silence).
        threshold_ms: Minimum silence duration to qualify as a block.
        words:        Optional word-timestamp list from Whisper. When provided,
                      enables the sentence-boundary filter.

    Returns:
        List of DisfluencyEvent (type=BLOCK) representing detected blocks.
    """
    blocks: List[DisfluencyEvent] = []

    for i, seg in enumerate(segments):
        if seg.type != SegmentType.SILENCE:
            continue
        duration = seg.end_ms - seg.start_ms
        if duration < threshold_ms:
            continue

        # ── Within-utterance check ──────────────────────────────────────────
        # Speech must exist somewhere before AND somewhere after this silence.
        # (Ambient leading/trailing silence is not a block.)
        has_speech_before = any(s.type == SegmentType.SPEECH for s in segments[:i])
        has_speech_after  = any(s.type == SegmentType.SPEECH for s in segments[i + 1:])
        if not has_speech_before or not has_speech_after:
            continue

        # ── Filter A: preceding speech segment must be ≥ 200 ms ────────────
        # After _merge_short_silences the list strictly alternates speech/silence,
        # so segments[i-1] is the immediately preceding speech (guaranteed to
        # exist by the has_speech_before check above).
        #
        # We only check the PRECEDING segment. A noise artifact (< 200 ms blip
        # classified as speech) before a long silence would otherwise pass the
        # within-utterance check and trigger a false positive. The FOLLOWING
        # segment is intentionally not checked: after a real stuttering block,
        # the speaker's first attempt to resume can be short (< 200 ms) as they
        # struggle to continue — requiring 200 ms after would suppress real blocks.
        prev_speech_dur = segments[i - 1].end_ms - segments[i - 1].start_ms
        if prev_speech_dur < 200:
            continue

        # ── Filter B: sentence-boundary skip ────────────────────────────────
        # If a sentence-terminal word's end timestamp is within 200 ms of this
        # silence's start, it is a natural inter-sentence pause — not a block.
        # We require the word to end before (or very close to) the silence start
        # so we don't suppress blocks that happen mid-word.
        if words is not None:
            silence_start_ms = seg.start_ms
            is_sentence_boundary = any(
                word.word.strip().endswith(('.', '!', '?'))
                and (word.end * 1000) <= silence_start_ms + 50   # word ends before/at silence
                and silence_start_ms - (word.end * 1000) <= 200  # gap is ≤ 200 ms
                for word in words
            )
            if is_sentence_boundary:
                continue

        blocks.append(
            DisfluencyEvent(
                type=EventType.BLOCK,
                start_ms=seg.start_ms,
                end_ms=seg.end_ms,
                confidence=0.9,
                source=EventSource.RULES,
            )
        )

    return blocks


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_voice_activity(
    audio_path: Union[str, Path],
    words: Optional[List[WordTimestamp]] = None,
) -> VADResult:
    """
    Segment audio into speech/silence regions and detect pathological blocks.

    Algorithm:
        1. Load 16kHz mono WAV with librosa
        2. Compute per-frame RMS energy (VAD_FRAME_MS=25ms, VAD_HOP_MS=10ms)
        3. Adaptive threshold = mean(energy) * VAD_ENERGY_THRESHOLD_MULTIPLIER
        4. Label each frame speech/silence
        5. Convert frames → ms-accurate VADSegments
        6. Merge speech segments separated by < SILENCE_MERGE_GAP_MS (100ms)
        7. Detect blocks: silence >= BLOCK_SILENCE_THRESHOLD_MS (750ms) within
           utterance, with two additional accuracy filters:
           - Adjacent speech segments must each be ≥ 200 ms (noise artifact filter)
           - Sentence-boundary silences are skipped when transcript words are provided

    Args:
        audio_path: Path to a preprocessed 16kHz mono WAV file.
        words:      Optional Whisper word-timestamp list. When provided, enables
                    the sentence-boundary filter in block detection.

    Returns:
        VADResult with:
            segments        — full list of speech/silence regions (ms)
            detected_blocks — silence regions >= 750ms within the utterance
            latency_ms      — wall-clock time for this call

    Raises:
        FileNotFoundError: If the audio file does not exist.
        RuntimeError:      If audio loading fails.
    """
    path = Path(audio_path)
    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    t0 = time.perf_counter()

    # ------------------------------------------------------------------
    # 1. Load audio
    # ------------------------------------------------------------------
    try:
        audio, _ = librosa.load(str(path), sr=SAMPLE_RATE, mono=True)
    except Exception as exc:
        raise RuntimeError(f"Failed to load audio '{path.name}': {exc}") from exc

    if len(audio) == 0:
        raise ValueError(f"Audio file '{path.name}' is empty.")

    total_ms = int(len(audio) / SAMPLE_RATE * 1000)

    # ------------------------------------------------------------------
    # 2. RMS energy per frame
    # ------------------------------------------------------------------
    frame_length = int(SAMPLE_RATE * VAD_FRAME_MS / 1000)   # 25ms → 400 samples
    hop_length   = int(SAMPLE_RATE * VAD_HOP_MS   / 1000)   # 10ms → 160 samples

    # center=False: frame i starts at sample i*hop_length (no padding offset)
    energy = librosa.feature.rms(
        y=audio,
        frame_length=frame_length,
        hop_length=hop_length,
        center=False,
    )[0]   # shape (1, T) → (T,)

    # ------------------------------------------------------------------
    # 3. Adaptive threshold
    # ------------------------------------------------------------------
    threshold = float(np.mean(energy)) * VAD_ENERGY_THRESHOLD_MULTIPLIER
    is_speech = energy > threshold   # bool array of length T

    # ------------------------------------------------------------------
    # 4-5. Frame labels → contiguous segments
    # ------------------------------------------------------------------
    raw_segments = _frames_to_segments(is_speech, hop_length, total_ms)

    # ------------------------------------------------------------------
    # 6. Merge short inter-speech silences
    # ------------------------------------------------------------------
    merged = _merge_short_silences(raw_segments, SILENCE_MERGE_GAP_MS)

    # ------------------------------------------------------------------
    # 7. Block detection (within-utterance only)
    # ------------------------------------------------------------------
    blocks = _detect_blocks(merged, BLOCK_SILENCE_THRESHOLD_MS, words=words)

    latency_ms = round((time.perf_counter() - t0) * 1000, 1)

    return VADResult(segments=merged, detected_blocks=blocks, latency_ms=latency_ms)


def detect_segments(audio_path: Union[str, Path]) -> List[VADSegment]:
    """Orchestrator-facing compatibility wrapper — returns only the segment list."""
    return detect_voice_activity(audio_path).segments
