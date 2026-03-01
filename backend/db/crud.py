"""
CRUD operations for analysis sessions.
"""

from typing import List, Optional
from sqlalchemy.orm import Session

from db.database import SessionRecord
from models.schemas import AnalysisResult, SessionSummary


def save_session(db: Session, result: AnalysisResult, audio_filename: str) -> None:
    """Persist a completed AnalysisResult to the database."""
    record = SessionRecord(
        id=result.id,
        audio_filename=audio_filename,
        created_at=result.created_at,
        mode=result.mode.value,
        score_value=str(result.score.value),
        severity=result.score.severity.value,
        result_json=result.model_dump_json(),
    )
    db.add(record)
    db.commit()


def get_session(db: Session, session_id: str) -> Optional[AnalysisResult]:
    """Return a single AnalysisResult by ID, or None if not found."""
    record = db.query(SessionRecord).filter(SessionRecord.id == session_id).first()
    if not record:
        return None
    return AnalysisResult.model_validate_json(record.result_json)


def list_sessions(db: Session, limit: int = 50) -> List[SessionSummary]:
    """Return lightweight session summaries, newest first."""
    records = (
        db.query(SessionRecord)
        .order_by(SessionRecord.created_at.desc())
        .limit(limit)
        .all()
    )
    summaries = []
    for r in records:
        result = AnalysisResult.model_validate_json(r.result_json)
        summaries.append(
            SessionSummary(
                id=result.id,
                created_at=result.created_at,
                audio_filename=r.audio_filename,
                mode=result.mode,
                score_value=result.score.value,
                severity=result.score.severity,
                total_disfluencies=result.metrics.total_disfluencies,
                total_duration_sec=result.metrics.total_duration_sec,
            )
        )
    return summaries


def get_latest_session(db: Session) -> Optional[AnalysisResult]:
    """Return the most recently created AnalysisResult."""
    record = (
        db.query(SessionRecord)
        .order_by(SessionRecord.created_at.desc())
        .first()
    )
    if not record:
        return None
    return AnalysisResult.model_validate_json(record.result_json)
