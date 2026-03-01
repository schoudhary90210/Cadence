"""
Cadence pipeline orchestrator.
Routes audio through Tier 1 (RULES_ONLY) and optionally Tier 2 (HYBRID_ML).

Fallback rules:
- If wav2vec2-base fails     → fall back to RULES_ONLY silently
- If wav2vec2-base-960h fails → skip phonetic layer, use rules + classifier only
- If faster-whisper fails     → raises RuntimeError with user-friendly message
- The pipeline NEVER crashes  — graceful degradation at every tier
"""

import logging
import os
import time
import uuid
from pathlib import Path
from typing import Optional

import config
from models.schemas import (
    AnalysisMetrics,
    AnalysisMode,
    AnalysisResult,
    FluencyScore,
    PipelineLatency,
    Severity,
    Transcript,
)

logger = logging.getLogger("cadence.orchestrator")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyze_audio(
    file_path: str,
    mode: str = "RULES_ONLY",
) -> AnalysisResult:
    """
    Run the full Cadence pipeline on an audio file.

    Tier 1 (always runs):
        preprocess → transcribe → VAD → repetition → filler →
        speaking_rate → scoring

    Tier 2 (runs only when mode == HYBRID_ML and models are available):
        wav2vec_classifier → wav2vec_phonetic → result merge
        Falls back to Tier 1 result on any ML failure.

    Args:
        file_path: Path to input audio (any format — pydub handles conversion).
        mode:      "RULES_ONLY" or "HYBRID_ML"

    Returns:
        AnalysisResult ready for the API response and DB persistence.

    Raises:
        RuntimeError:      If transcription fails completely.
        FileNotFoundError: If the input file does not exist.
    """
    t_pipeline_start = time.perf_counter()

    # ------------------------------------------------------------------
    # Stage 1 — Audio preprocessing
    # ------------------------------------------------------------------
    t0 = time.perf_counter()
    from pipeline.audio_preprocessing import preprocess_audio
    norm_path = preprocess_audio(file_path)
    t_preproc_ms = _ms(t0)
    logger.debug(f"Preprocessing: {t_preproc_ms:.0f} ms → {norm_path}")

    try:
        # ------------------------------------------------------------------
        # Stage 2 — Transcription (faster-whisper)
        # ------------------------------------------------------------------
        t0 = time.perf_counter()
        from pipeline.transcription import transcribe
        transcript_result = transcribe(norm_path)
        t_whisper_ms = _ms(t0)
        logger.debug(f"Whisper: {t_whisper_ms:.0f} ms, {len(transcript_result.words)} words")

        # ------------------------------------------------------------------
        # Stage 3 — Voice activity detection
        # ------------------------------------------------------------------
        t0 = time.perf_counter()
        from pipeline.vad import detect_voice_activity
        vad_result = detect_voice_activity(norm_path)
        t_vad_ms = _ms(t0)
        logger.debug(
            f"VAD: {t_vad_ms:.0f} ms, {len(vad_result.segments)} segments, "
            f"{len(vad_result.detected_blocks)} block(s)"
        )

        # ------------------------------------------------------------------
        # Stage 4 — Rules-based disfluency detection
        # ------------------------------------------------------------------
        t0 = time.perf_counter()
        from pipeline.repetition import detect_repetitions
        from pipeline.filler import detect_fillers
        rep_events  = detect_repetitions(transcript_result.words)
        fill_events = detect_fillers(transcript_result.words)
        all_events  = vad_result.detected_blocks + rep_events + fill_events
        t_rules_ms  = _ms(t0)
        logger.debug(
            f"Rules: {t_rules_ms:.0f} ms — "
            f"{len(vad_result.detected_blocks)} blocks, "
            f"{len(rep_events)} reps, {len(fill_events)} fillers"
        )

        # ------------------------------------------------------------------
        # Stage 5 — Speaking rate
        # ------------------------------------------------------------------
        from pipeline.speaking_rate import analyze_speaking_rate
        rate_result = analyze_speaking_rate(transcript_result.words, vad_result.segments)

        # ------------------------------------------------------------------
        # Stage 6 — Composite scoring
        # ------------------------------------------------------------------
        t0 = time.perf_counter()
        from pipeline.scoring import compute_score
        score_result = compute_score(all_events, rate_result)
        t_scoring_ms = _ms(t0)
        logger.debug(f"Scoring: {t_scoring_ms:.0f} ms — score={score_result.value}")

        # ------------------------------------------------------------------
        # Tier 2 — HYBRID_ML (wav2vec2 classifier + phonetic layer)
        # ------------------------------------------------------------------
        t_w2v_classifier_ms: Optional[float] = None
        t_w2v_phonetic_ms:   Optional[float] = None
        phonetic_transcript = None

        if mode == "HYBRID_ML":
            t0 = time.perf_counter()
            try:
                from pipeline.wav2vec_classifier import classify
                ml_events = classify(norm_path, transcript_result.words)
                all_events = _merge_events(all_events, ml_events)
                t_w2v_classifier_ms = _ms(t0)
                logger.info(f"wav2vec2 classifier: {t_w2v_classifier_ms:.0f} ms, "
                            f"{len(ml_events)} ML events")
            except Exception as exc:
                logger.warning(f"wav2vec2 classifier failed — falling back to RULES_ONLY: {exc}")

            t0 = time.perf_counter()
            try:
                from pipeline.wav2vec_phonetic import transcribe_phonetic
                phonetic_transcript = transcribe_phonetic(norm_path)
                t_w2v_phonetic_ms = _ms(t0)
                logger.info(f"wav2vec2 phonetic: {t_w2v_phonetic_ms:.0f} ms")
            except Exception as exc:
                logger.warning(f"wav2vec2 phonetic failed — skipping: {exc}")

            # Re-score if ML events changed the event list
            if t_w2v_classifier_ms is not None:
                score_result = compute_score(all_events, rate_result)

        # ------------------------------------------------------------------
        # Build AnalysisMetrics
        # ------------------------------------------------------------------
        metrics = AnalysisMetrics(
            speaking_rate_syl_sec=rate_result.speaking_rate_syl_sec,
            articulation_rate=rate_result.articulation_rate,
            pace_variability=rate_result.pace_variability,
            total_disfluencies=len(all_events),
            disfluencies_per_100_syllables=score_result.disfluencies_per_100_syllables,
            total_syllables=rate_result.total_syllables,
            speech_duration_sec=rate_result.speech_duration_sec,
            total_duration_sec=rate_result.total_duration_sec,
        )

        score = FluencyScore(
            value=score_result.value,
            severity=Severity(score_result.severity),
            breakdown=score_result.breakdown,
        )

        t_total_ms = _ms(t_pipeline_start)

        latency = PipelineLatency(
            preprocessing_ms=round(t_preproc_ms, 1),
            whisper_ms=round(t_whisper_ms, 1),
            vad_ms=round(t_vad_ms, 1),
            rules_ms=round(t_rules_ms, 1),
            scoring_ms=round(t_scoring_ms, 1),
            total_ms=round(t_total_ms, 1),
            w2v_classifier_ms=round(t_w2v_classifier_ms, 1) if t_w2v_classifier_ms else None,
            w2v_phonetic_ms=round(t_w2v_phonetic_ms, 1) if t_w2v_phonetic_ms else None,
        )

        return AnalysisResult(
            mode=AnalysisMode[mode],
            transcript=Transcript(
                text=transcript_result.text,
                words=transcript_result.words,
            ),
            phonetic_transcript=phonetic_transcript,
            segments=vad_result.segments,
            events=all_events,
            metrics=metrics,
            score=score,
            latency=latency,
            limitations=config.LIMITATIONS,
        )

    finally:
        # Always clean up the normalised temp WAV
        try:
            os.unlink(norm_path)
        except OSError:
            pass


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ms(t_start: float) -> float:
    """Elapsed milliseconds since t_start (perf_counter epoch)."""
    return (time.perf_counter() - t_start) * 1000


def _merge_events(rules_events, ml_events):
    """
    Merge ML-detected events with rules-based events.
    ML events that overlap an existing rules event are skipped (rules take priority).
    """
    merged = list(rules_events)
    for ml_ev in ml_events:
        overlaps = any(
            ml_ev.start_ms < ev.end_ms and ev.start_ms < ml_ev.end_ms
            for ev in merged
        )
        if not overlaps:
            merged.append(ml_ev)
    return sorted(merged, key=lambda e: e.start_ms)
