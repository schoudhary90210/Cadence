"""
Google Cloud Speech-to-Text dual transcription.

Runs Cloud STT alongside faster-whisper to catch words that Whisper
normalises away (e.g. repeated stuttered syllables). Returns the same
TranscriptResult schema so the orchestrator can compare both transcripts.

Graceful degradation: returns None on any failure (missing credentials,
network issues, API errors). The app works perfectly without it.
"""

import logging
import time
from pathlib import Path
from typing import Optional, Union

from models.schemas import WordTimestamp
from pipeline.transcription import TranscriptResult

logger = logging.getLogger("cadence.cloud_stt")


def cloud_transcribe(audio_path: Union[str, Path]) -> Optional[TranscriptResult]:
    """
    Transcribe audio using Google Cloud Speech-to-Text v1.

    Uses the 'latest_long' model with word-level timestamps enabled.
    Returns a TranscriptResult matching the same schema as faster-whisper
    output, or None on any failure.

    Args:
        audio_path: Path to a 16kHz mono WAV file.

    Returns:
        TranscriptResult or None if Cloud STT is unavailable/fails.
    """
    try:
        from google.cloud import speech_v1
    except ImportError:
        logger.warning("google-cloud-speech not installed — skipping Cloud STT")
        return None

    path = Path(audio_path)
    if not path.exists():
        logger.warning(f"Audio file not found: {audio_path}")
        return None

    try:
        t0 = time.perf_counter()

        client = speech_v1.SpeechClient()

        audio_content = path.read_bytes()
        audio = speech_v1.RecognitionAudio(content=audio_content)

        config = speech_v1.RecognitionConfig(
            encoding=speech_v1.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code="en-US",
            model="latest_long",
            enable_word_time_offsets=True,
            enable_automatic_punctuation=True,
        )

        response = client.recognize(config=config, audio=audio)

        words = []
        text_parts = []

        for result in response.results:
            alt = result.alternatives[0] if result.alternatives else None
            if not alt:
                continue
            text_parts.append(alt.transcript.strip())

            for word_info in alt.words:
                word_text = word_info.word.strip()
                if not word_text:
                    continue
                start_sec = (
                    word_info.start_time.seconds
                    + word_info.start_time.microseconds / 1_000_000
                )
                end_sec = (
                    word_info.end_time.seconds
                    + word_info.end_time.microseconds / 1_000_000
                )
                words.append(
                    WordTimestamp(word=word_text, start=start_sec, end=end_sec)
                )

        latency_ms = (time.perf_counter() - t0) * 1000
        full_text = " ".join(text_parts)

        if not full_text:
            logger.warning("Cloud STT returned empty transcript")
            return None

        logger.info(
            f"Cloud STT: {len(words)} words, {latency_ms:.0f} ms"
        )

        return TranscriptResult(
            text=full_text,
            words=words,
            language="en",
            latency_ms=round(latency_ms, 1),
        )

    except Exception as exc:
        logger.warning(f"Cloud STT failed — skipping: {exc}")
        return None
