"""
Prolongation detection via autocorrelation and spectral flatness analysis.

Detects prolonged sounds (e.g. "sssso", "mmmmmy") by analysing per-word
audio segments for high periodicity (autocorrelation) and tonal quality
(low spectral flatness = more tonal = prolonged vowel/consonant).

Thresholds are intentionally conservative to avoid false positives on
naturally elongated words.
"""

import logging
from typing import List

import librosa
import numpy as np

from config import SAMPLE_RATE
from models.schemas import DisfluencyEvent, EventSource, EventType, WordTimestamp

logger = logging.getLogger("cadence.prolongation")

# Thresholds
PROLONGATION_MIN_DURATION_MS = 600   # word must be at least this long (natural words are 300-500ms)
PROLONGATION_AUTOCORR_THRESHOLD = 0.85  # very high autocorrelation = highly periodic = prolonged
PROLONGATION_SPECTRAL_FLATNESS_MAX = 0.15  # very low flatness = strongly tonal (vowel/consonant hold)


def detect_prolongations(
    audio_path: str,
    words: List[WordTimestamp],
) -> List[DisfluencyEvent]:
    """
    Detect prolonged sounds by analysing per-word audio segments.

    For each word longer than PROLONGATION_MIN_DURATION_MS:
      1. Extract the audio segment corresponding to the word timestamps
      2. Compute normalised autocorrelation at lag ~pitch period
      3. Compute mean spectral flatness (Wiener entropy)
      4. If autocorrelation > threshold AND spectral flatness < threshold,
         flag as prolongation

    Args:
        audio_path: Path to the preprocessed 16kHz mono WAV.
        words:      Word-level timestamps from Whisper.

    Returns:
        List of DisfluencyEvent (type=PROLONGATION, source=RULES).
    """
    if not words:
        return []

    try:
        audio, _ = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True)
    except Exception as exc:
        logger.warning(f"Prolongation: failed to load audio: {exc}")
        return []

    events: List[DisfluencyEvent] = []
    total_samples = len(audio)

    for w in words:
        duration_ms = (w.end - w.start) * 1000
        if duration_ms < PROLONGATION_MIN_DURATION_MS:
            continue

        # Extract word audio segment
        start_sample = int(w.start * SAMPLE_RATE)
        end_sample = int(w.end * SAMPLE_RATE)
        start_sample = max(0, min(start_sample, total_samples - 1))
        end_sample = max(start_sample + 1, min(end_sample, total_samples))
        segment = audio[start_sample:end_sample]

        if len(segment) < 512:
            continue

        try:
            # Autocorrelation analysis
            autocorr = np.correlate(segment, segment, mode="full")
            autocorr = autocorr[len(autocorr) // 2:]  # positive lags only
            if autocorr[0] > 0:
                autocorr = autocorr / autocorr[0]  # normalise

            # Look for peak in pitch-period range (50-500 Hz → lag 32-320 at 16kHz)
            min_lag = max(32, SAMPLE_RATE // 500)
            max_lag = min(320, len(autocorr) - 1, SAMPLE_RATE // 50)
            if max_lag <= min_lag:
                continue

            peak_autocorr = float(np.max(autocorr[min_lag:max_lag]))

            # Spectral flatness (Wiener entropy)
            flatness = librosa.feature.spectral_flatness(y=segment, n_fft=512, hop_length=256)
            mean_flatness = float(np.mean(flatness))

            if (peak_autocorr >= PROLONGATION_AUTOCORR_THRESHOLD
                    and mean_flatness <= PROLONGATION_SPECTRAL_FLATNESS_MAX):
                confidence = min(0.5 + (peak_autocorr - 0.7) * 1.5, 0.95)
                events.append(
                    DisfluencyEvent(
                        type=EventType.PROLONGATION,
                        start_ms=int(w.start * 1000),
                        end_ms=int(w.end * 1000),
                        confidence=round(confidence, 3),
                        source=EventSource.RULES,
                        text=w.word,
                    )
                )

        except Exception as exc:
            logger.debug(f"Prolongation analysis failed for word '{w.word}': {exc}")
            continue

    return events
