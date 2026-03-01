"""
Cadence Pydantic schemas — single source of truth for all API data shapes.
TypeScript counterparts live in frontend/lib/types.ts — keep in sync.

IMPORTANT:
- All event times are in MILLISECONDS (start_ms, end_ms)
- phonetic_transcript is Optional — only present in HYBRID_ML mode
- w2v_classifier_ms / w2v_phonetic_ms are Optional — null in RULES_ONLY mode
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class AnalysisMode(str, Enum):
    RULES_ONLY = "RULES_ONLY"
    HYBRID_ML = "HYBRID_ML"


class EventType(str, Enum):
    BLOCK = "block"
    REPETITION = "repetition"
    PROLONGATION = "prolongation"
    FILLER = "filler"
    INTERJECTION = "interjection"


class EventSubtype(str, Enum):
    SOUND_REP = "sound_rep"
    WORD_REP = "word_rep"
    PHRASE_REP = "phrase_rep"


class EventSource(str, Enum):
    RULES = "rules"
    ML = "ml"
    PHONETIC = "phonetic"
    HYBRID = "hybrid"


class SegmentType(str, Enum):
    SPEECH = "speech"
    SILENCE = "silence"


class Severity(str, Enum):
    MILD = "mild"
    MODERATE = "moderate"
    MODERATE_SEVERE = "moderate-severe"
    SEVERE = "severe"


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------

class WordTimestamp(BaseModel):
    word: str
    start: float   # seconds (whisper native)
    end: float     # seconds


class Transcript(BaseModel):
    text: str
    words: List[WordTimestamp]


class CharTimestamp(BaseModel):
    char: str
    start: float   # seconds
    end: float     # seconds


class PhoneticTranscript(BaseModel):
    """Only present in HYBRID_ML mode (wav2vec2-base-960h CTC output)."""
    text: str
    characters: List[CharTimestamp]


class VADSegment(BaseModel):
    """Voice activity detection output — speech vs silence regions."""
    type: SegmentType
    start_ms: int
    end_ms: int


class DisfluencyEvent(BaseModel):
    type: EventType
    subtype: Optional[EventSubtype] = None   # for repetitions only
    start_ms: int
    end_ms: int
    confidence: float = Field(..., ge=0.0, le=1.0)
    source: EventSource
    text: Optional[str] = None   # matched transcript text, if applicable


class ScoreBreakdown(BaseModel):
    blocks: float
    prolongations: float
    sound_reps: float
    word_reps: float
    fillers: float
    pace: float


class FluencyScore(BaseModel):
    value: float = Field(..., ge=0.0, le=100.0, description="Composite fluency score 0–100")
    severity: Severity
    breakdown: ScoreBreakdown


class AnalysisMetrics(BaseModel):
    speaking_rate_syl_sec: float    # syllables per second during speech
    articulation_rate: float        # syl/sec excluding pauses
    pace_variability: float         # std dev of rolling rate windows
    total_disfluencies: int
    disfluencies_per_100_syllables: float
    total_syllables: int
    speech_duration_sec: float      # non-silence duration
    total_duration_sec: float       # full audio length


class PipelineLatency(BaseModel):
    preprocessing_ms: float
    whisper_ms: float
    vad_ms: float
    rules_ms: float
    scoring_ms: float
    total_ms: float
    w2v_classifier_ms: Optional[float] = None   # null in RULES_ONLY
    w2v_phonetic_ms: Optional[float] = None     # null in RULES_ONLY


# ---------------------------------------------------------------------------
# Top-level response
# ---------------------------------------------------------------------------

class AnalysisResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    mode: AnalysisMode
    transcript: Transcript
    phonetic_transcript: Optional[PhoneticTranscript] = None   # HYBRID_ML only
    segments: List[VADSegment]
    events: List[DisfluencyEvent]
    metrics: AnalysisMetrics
    score: FluencyScore
    latency: PipelineLatency
    limitations: List[str]
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Session list / history
# ---------------------------------------------------------------------------

class SessionSummary(BaseModel):
    """Lightweight row for the history table."""
    id: str
    created_at: datetime
    audio_filename: str
    mode: AnalysisMode
    score_value: float
    severity: Severity
    total_disfluencies: int
    total_duration_sec: float


# ---------------------------------------------------------------------------
# Misc API shapes
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str = "ok"
    mode: AnalysisMode
    uptime: float = 0.0       # seconds since server start


class DemoSample(BaseModel):
    filename: str
    label: str                # "fluent" | "stuttered" | "mixed"
    description: str
    duration: float
    cached: bool = False      # True when cached_results JSON exists


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None


# ---------------------------------------------------------------------------
# Practice mode
# ---------------------------------------------------------------------------

class ReadingPassage(BaseModel):
    id: str
    title: str
    text: str
    difficulty: str  # "easy" | "medium" | "hard"


class ConversationPrompt(BaseModel):
    id: str
    prompt: str
    category: str  # "casual" | "interview" | "storytelling"
