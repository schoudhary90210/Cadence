"""
ASR transcription via faster-whisper.
Returns full transcript text, per-word timestamps, and pipeline latency.

Model is loaded once at first call and cached for the process lifetime —
reloading a Whisper model on every request would add ~2-5s overhead.
"""

import time
from pathlib import Path
from typing import List, Optional, Union

from pydantic import BaseModel

from config import WHISPER_MODEL
from models.schemas import WordTimestamp


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

class TranscriptResult(BaseModel):
    """Pipeline-internal result — includes latency not present in the API schema."""
    text: str
    words: List[WordTimestamp]
    language: str
    latency_ms: float


# ---------------------------------------------------------------------------
# Module-level model singleton
# ---------------------------------------------------------------------------

_model = None  # type: Optional[object]


def _get_model():
    """Load the WhisperModel once and cache it for the process lifetime."""
    global _model
    if _model is not None:
        return _model

    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise RuntimeError(
            "faster-whisper is not installed. Run: pip install faster-whisper"
        ) from exc

    _model = WhisperModel(
        WHISPER_MODEL,
        device="cpu",
        compute_type="int8",   # quantised INT8 — fastest on CPU, minimal quality loss
    )
    return _model


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def transcribe(audio_path: Union[str, Path]) -> TranscriptResult:
    """
    Transcribe a preprocessed 16kHz mono WAV file using faster-whisper.

    The Whisper model is loaded on the first call and reused on all subsequent
    calls. Expect ~2-5s cold-start on the first invocation; subsequent calls
    are faster (just inference time).

    Args:
        audio_path: Path to a 16kHz mono WAV file (output of preprocess_audio).
                    Accepts str or Path.

    Returns:
        TranscriptResult with:
            text        — full transcript string
            words       — list of WordTimestamp(word, start, end) in seconds
            language    — detected language code (e.g. "en")
            latency_ms  — wall-clock time for this transcription call in ms

    Raises:
        RuntimeError:    If faster-whisper is not installed.
        FileNotFoundError: If the audio file does not exist.
        ValueError:      If the audio file is empty or produces no transcript.
    """
    path = Path(audio_path)
    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    model = _get_model()

    t0 = time.perf_counter()

    # transcribe() returns a generator of Segment objects — iterate fully
    segments_iter, info = model.transcribe(
        str(path),
        word_timestamps=True,   # required for per-word start/end times
        language="en",          # skip language detection — we know it's English
        beam_size=5,            # default beam search width
        vad_filter=True,        # suppress silence/noise segments
        vad_parameters={
            "min_silence_duration_ms": 300,
        },
    )

    words: List[WordTimestamp] = []
    text_parts: List[str] = []

    for segment in segments_iter:
        seg_text = segment.text.strip()
        if seg_text:
            text_parts.append(seg_text)

        if segment.words:
            for w in segment.words:
                word = w.word.strip()
                if word:
                    words.append(
                        WordTimestamp(word=word, start=w.start, end=w.end)
                    )

    latency_ms = (time.perf_counter() - t0) * 1000
    full_text = " ".join(text_parts)

    if not full_text:
        raise ValueError(
            f"Transcription produced no output for '{path.name}'. "
            "The file may be silent, too short, or not speech."
        )

    return TranscriptResult(
        text=full_text,
        words=words,
        language=info.language,
        latency_ms=round(latency_ms, 1),
    )
