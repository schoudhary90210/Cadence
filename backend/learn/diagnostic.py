"""
Cadence Learn — diagnostic report generator.

Counts disfluency events from an AnalysisResult and maps them to
recommended Learn courses. NO LLM — pure counting logic.
"""

from typing import Any, Dict, List

from models.schemas import AnalysisResult
from learn.courses import (
    BLOCK_COURSE,
    FILLER_COURSE,
    PROLONGATION_COURSE,
    REPETITION_COURSE,
)


# Map event types / subtypes to impediment profile keys
_EVENT_MAP: Dict[str, str] = {
    "block": "blocks",
    "prolongation": "prolongations",
    "filler": "fillers",
    "interjection": "fillers",
}

# Map impediment profile keys to course types
_IMPEDIMENT_TO_COURSE: Dict[str, str] = {
    "blocks": BLOCK_COURSE,
    "prolongations": PROLONGATION_COURSE,
    "word_reps": REPETITION_COURSE,
    "sound_reps": REPETITION_COURSE,
    "fillers": FILLER_COURSE,
}

# Friendly labels for report text
_IMPEDIMENT_LABELS: Dict[str, str] = {
    "blocks": "speech blocks",
    "prolongations": "sound prolongations",
    "word_reps": "word repetitions",
    "sound_reps": "sound repetitions",
    "fillers": "filler words",
}


def generate_diagnostic(analysis_result: AnalysisResult) -> Dict[str, Any]:
    """
    Analyse an AnalysisResult and produce a diagnostic report.

    Returns:
        {
            impediment_profile: {blocks, prolongations, word_reps, sound_reps, fillers},
            primary_impediment: str,
            recommended_courses: list[str],
            report_text: str,
        }
    """
    profile: Dict[str, int] = {
        "blocks": 0,
        "prolongations": 0,
        "word_reps": 0,
        "sound_reps": 0,
        "fillers": 0,
    }

    for event in analysis_result.events:
        etype = event.type.value
        subtype = event.subtype.value if event.subtype else None

        if etype == "repetition":
            if subtype == "word_rep" or subtype == "phrase_rep":
                profile["word_reps"] += 1
            elif subtype == "sound_rep":
                profile["sound_reps"] += 1
            else:
                profile["word_reps"] += 1  # default repetition bucket
        elif etype in _EVENT_MAP:
            profile[_EVENT_MAP[etype]] += 1

    # Sort impediments by count descending, filter to non-zero
    sorted_impediments = sorted(
        [(k, v) for k, v in profile.items() if v > 0],
        key=lambda x: x[1],
        reverse=True,
    )

    # Primary impediment
    primary = sorted_impediments[0][0] if sorted_impediments else "none"

    # Recommended courses — deduplicated, ordered by severity
    seen_courses: set = set()
    recommended: List[str] = []
    for impediment, _count in sorted_impediments:
        course = _IMPEDIMENT_TO_COURSE.get(impediment)
        if course and course not in seen_courses:
            seen_courses.add(course)
            recommended.append(course)

    # Default: if zero events, recommend filler course
    if not recommended:
        recommended = [FILLER_COURSE]

    # Report text
    if not sorted_impediments:
        report_text = (
            "No disfluencies were detected in this sample. "
            "We recommend the Confident Pausing course to refine your fluency further."
        )
    else:
        parts = []
        for impediment, count in sorted_impediments:
            label = _IMPEDIMENT_LABELS.get(impediment, impediment)
            parts.append(f"{count} {label}")
        summary = ", ".join(parts)
        report_text = (
            f"We detected {summary}. "
            f"Your primary area to work on is {_IMPEDIMENT_LABELS.get(primary, primary)}. "
            f"We recommend starting with the courses below."
        )

    return {
        "impediment_profile": profile,
        "primary_impediment": primary,
        "recommended_courses": recommended,
        "report_text": report_text,
    }
