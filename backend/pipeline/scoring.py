"""
Composite fluency score computation.
Weighted penalty formula → 0–100 score + severity band.

All weights and severity thresholds are sourced from config.py.
"""

from typing import List

from pydantic import BaseModel

from config import NORMAL_RATE_MAX, NORMAL_RATE_MIN, SCORE_WEIGHTS, SEVERITY_BANDS
from models.schemas import (
    DisfluencyEvent,
    EventSubtype,
    EventType,
    FluencyScore,
    ScoreBreakdown,
    Severity,
)
from pipeline.speaking_rate import SpeakingRateResult


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

class ScoreResult(BaseModel):
    """Pipeline-internal scoring output — richer than the public FluencyScore."""
    value: float                          # 0–100 composite score
    severity: str                         # "mild" | "moderate" | "moderate-severe" | "severe"
    breakdown: ScoreBreakdown             # per-type penalty points
    disfluencies_per_100_syllables: float
    total_syllables: int


# ---------------------------------------------------------------------------
# Reference rates: counts per 100 syllables that trigger the full weight penalty.
# Values chosen to match clinical threshold literature (≥2 SLD/100 syl = notable).
# ---------------------------------------------------------------------------
_PENALTY_REFS = {
    "blocks":        2.0,   # ≥ 2 blocks per 100 syllables → full penalty
    "prolongations": 2.0,
    "sound_reps":    3.0,
    "word_reps":     3.0,
    "fillers":       5.0,   # fillers are more common even in fluent speech
}

# Map from internal count keys → SCORE_WEIGHTS keys
_WEIGHT_KEYS = {
    "blocks":        "blocks",
    "prolongations": "prolongations",
    "sound_reps":    "sound_repetitions",
    "word_reps":     "word_repetitions",
    "fillers":       "fillers",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def severity_from_score(score: float) -> str:
    """
    Map a score (0–100) to the matching SEVERITY_BANDS label.

    Bands (from config):
        mild             80–100
        moderate         60–80
        moderate-severe  40–60
        severe            0–40
    """
    for label, (low, high) in SEVERITY_BANDS.items():
        if low <= score <= high:
            return label
    return "severe"   # safety net below all bands (shouldn't occur after clamp)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compute_score(
    events: List[DisfluencyEvent],
    rate_result: SpeakingRateResult,
) -> ScoreResult:
    """
    Compute composite fluency score from detected events and speaking rate metrics.

    Formula:
        1. Count events by category (blocks, prolongations, sound_reps, word_reps, fillers)
        2. Normalise each count to per-100-syllables
        3. Per-category penalty = min(count_per_100 / ref_rate, 1.0) * SCORE_WEIGHTS[cat]
        4. Pace penalty = f(deviation from normal rate range, pace_variability)
        5. total_penalty = sum of all category and pace penalties
        6. score = clamp(100 − total_penalty, 0, 100)
        7. severity = SEVERITY_BANDS lookup

    Args:
        events:      All detected disfluency events (combined from rules pipeline).
        rate_result: SpeakingRateResult from analyze_speaking_rate().

    Returns:
        ScoreResult with value (0–100), severity string, breakdown, and stats.
    """
    total_syl = max(rate_result.total_syllables, 1)

    # ------------------------------------------------------------------
    # 1. Count events by category
    # ------------------------------------------------------------------
    counts = {
        "blocks":        0,
        "prolongations": 0,
        "sound_reps":    0,
        "word_reps":     0,
        "fillers":       0,
    }

    for ev in events:
        if ev.type == EventType.BLOCK:
            counts["blocks"] += 1
        elif ev.type == EventType.PROLONGATION:
            counts["prolongations"] += 1
        elif ev.type == EventType.REPETITION:
            if ev.subtype == EventSubtype.SOUND_REP:
                counts["sound_reps"] += 1
            else:
                # WORD_REP, PHRASE_REP, or unset → word/phrase repetition bucket
                counts["word_reps"] += 1
        elif ev.type in (EventType.FILLER, EventType.INTERJECTION):
            counts["fillers"] += 1

    # ------------------------------------------------------------------
    # 2–3. Normalised penalties per category
    # ------------------------------------------------------------------
    def per_100(count: int) -> float:
        return count / total_syl * 100

    def category_penalty(key: str) -> float:
        ref    = _PENALTY_REFS[key]
        weight = SCORE_WEIGHTS[_WEIGHT_KEYS[key]]
        return min(per_100(counts[key]) / ref, 1.0) * weight

    p_blocks        = category_penalty("blocks")
    p_prolongations = category_penalty("prolongations")
    p_sound_reps    = category_penalty("sound_reps")
    p_word_reps     = category_penalty("word_reps")
    p_fillers       = category_penalty("fillers")

    # ------------------------------------------------------------------
    # 4. Pace penalty
    #    Combines deviation from the normal rate range and pace variability.
    #    Rate deviation: how far speaking_rate is outside [MIN, MAX], as a
    #    fraction of the nearest boundary.
    #    Variability component: pace_variability std > 1.5 syl/sec is high.
    # ------------------------------------------------------------------
    rate = rate_result.speaking_rate_syl_sec
    if NORMAL_RATE_MIN <= rate <= NORMAL_RATE_MAX:
        rate_deviation = 0.0
    elif rate < NORMAL_RATE_MIN:
        rate_deviation = (NORMAL_RATE_MIN - rate) / NORMAL_RATE_MIN
    else:
        rate_deviation = (rate - NORMAL_RATE_MAX) / NORMAL_RATE_MAX

    variability_fraction = min(rate_result.pace_variability / 1.5, 1.0)
    pace_fraction = min((rate_deviation + variability_fraction) / 2.0, 1.0)
    p_pace = pace_fraction * SCORE_WEIGHTS["pace_variance"]

    # ------------------------------------------------------------------
    # 5–6. Total score
    # ------------------------------------------------------------------
    total_penalty = (
        p_blocks + p_prolongations + p_sound_reps + p_word_reps + p_fillers + p_pace
    )
    score_value = max(0.0, min(100.0, 100.0 - total_penalty))

    # ------------------------------------------------------------------
    # 7. Stats
    # ------------------------------------------------------------------
    total_disfluencies = sum(counts.values())
    d_per_100 = round(total_disfluencies / total_syl * 100, 2)

    return ScoreResult(
        value=round(score_value, 1),
        severity=severity_from_score(score_value),
        breakdown=ScoreBreakdown(
            blocks=round(p_blocks, 2),
            prolongations=round(p_prolongations, 2),
            sound_reps=round(p_sound_reps, 2),
            word_reps=round(p_word_reps, 2),
            fillers=round(p_fillers, 2),
            pace=round(p_pace, 2),
        ),
        disfluencies_per_100_syllables=d_per_100,
        total_syllables=total_syl,
    )
