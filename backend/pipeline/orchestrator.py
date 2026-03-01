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
from typing import List, Optional

import config
from models.schemas import (
    AnalysisMetrics,
    AnalysisMode,
    AnalysisResult,
    DisfluencyEvent,
    EventSource,
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
        wav2vec_classifier → wav2vec_phonetic → detect_sound_repetitions
        → ensemble merge with confidence boosting → re-score
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
        vad_result = detect_voice_activity(norm_path, words=transcript_result.words)
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
        rules_events = vad_result.detected_blocks + rep_events + fill_events
        all_events   = list(rules_events)
        t_rules_ms   = _ms(t0)
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
        # Stage 6 — Composite scoring (Tier 1 baseline)
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
            # --- 7a. wav2vec2-base disfluency classifier ---
            ml_events: List[DisfluencyEvent] = []
            t0 = time.perf_counter()
            try:
                from pipeline.wav2vec_classifier import classify
                ml_events = classify(norm_path)
                t_w2v_classifier_ms = _ms(t0)
                logger.info(f"wav2vec2 classifier: {t_w2v_classifier_ms:.0f} ms, "
                            f"{len(ml_events)} ML events")
            except Exception as exc:
                logger.warning(f"wav2vec2 classifier failed — skipping: {exc}")

            # --- 7b. wav2vec2-base-960h phonetic CTC ---
            phonetic_events: List[DisfluencyEvent] = []
            t0 = time.perf_counter()
            try:
                from pipeline.wav2vec_phonetic import (
                    transcribe_phonetic,
                    detect_sound_repetitions,
                )
                phonetic_transcript = transcribe_phonetic(norm_path)
                if phonetic_transcript is not None:
                    phonetic_events = detect_sound_repetitions(phonetic_transcript)
                t_w2v_phonetic_ms = _ms(t0)
                logger.info(
                    f"wav2vec2 phonetic: {t_w2v_phonetic_ms:.0f} ms, "
                    f"{len(phonetic_events)} phonetic events"
                )
            except Exception as exc:
                logger.warning(f"wav2vec2 phonetic failed — skipping: {exc}")

            # --- 7c. Ensemble merge ---
            if ml_events or phonetic_events:
                all_events = _ensemble_merge(
                    rules_events, ml_events, phonetic_events
                )
                # Re-score with the merged event list
                score_result = compute_score(all_events, rate_result)
                logger.info(
                    f"Ensemble: {len(all_events)} total events "
                    f"(rules={len(rules_events)}, ml={len(ml_events)}, "
                    f"phonetic={len(phonetic_events)}), "
                    f"score={score_result.value}"
                )

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


def _events_overlap(a: DisfluencyEvent, b: DisfluencyEvent) -> bool:
    """Check if two events overlap in time."""
    return a.start_ms < b.end_ms and b.start_ms < a.end_ms


def _ensemble_merge(
    rules_events: List[DisfluencyEvent],
    ml_events: List[DisfluencyEvent],
    phonetic_events: List[DisfluencyEvent],
) -> List[DisfluencyEvent]:
    """
    Merge events from three sources with ensemble confidence boosting.

    Algorithm:
        1. Start with rules events as the base.
        2. For each ML/phonetic event, check overlap with existing events.
        3. If an ML/phonetic event overlaps a rules event OF THE SAME TYPE:
           → create a 'hybrid' event with boosted confidence (min(conf * 1.2, 1.0))
           → use the widest time span of the overlapping pair
        4. If no overlap → add the event as-is (new detection from ML/phonetic).

    Returns:
        Merged and sorted event list.
    """
    merged: List[DisfluencyEvent] = list(rules_events)

    # Process ML events
    for ml_ev in ml_events:
        matched = False
        for idx, existing in enumerate(merged):
            if _events_overlap(ml_ev, existing) and ml_ev.type == existing.type:
                # Same type, overlapping → boost confidence, mark as hybrid
                boosted_conf = min(existing.confidence * 1.2, 1.0)
                merged[idx] = DisfluencyEvent(
                    type=existing.type,
                    subtype=existing.subtype or ml_ev.subtype,
                    start_ms=min(existing.start_ms, ml_ev.start_ms),
                    end_ms=max(existing.end_ms, ml_ev.end_ms),
                    confidence=round(boosted_conf, 3),
                    source=EventSource.HYBRID,
                    text=existing.text or ml_ev.text,
                )
                matched = True
                break
        if not matched:
            merged.append(ml_ev)

    # Process phonetic events
    for ph_ev in phonetic_events:
        matched = False
        for idx, existing in enumerate(merged):
            if _events_overlap(ph_ev, existing) and ph_ev.type == existing.type:
                boosted_conf = min(existing.confidence * 1.2, 1.0)
                merged[idx] = DisfluencyEvent(
                    type=existing.type,
                    subtype=existing.subtype or ph_ev.subtype,
                    start_ms=min(existing.start_ms, ph_ev.start_ms),
                    end_ms=max(existing.end_ms, ph_ev.end_ms),
                    confidence=round(boosted_conf, 3),
                    source=EventSource.HYBRID,
                    text=existing.text or ph_ev.text,
                )
                matched = True
                break
        if not matched:
            merged.append(ph_ev)

    return sorted(merged, key=lambda e: e.start_ms)
