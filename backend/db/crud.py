"""
CRUD operations for analysis sessions.
"""

from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session

from db.database import SessionRecord
from models.schemas import AnalysisResult, SessionSummary


def save_session(
    db: Session,
    result: AnalysisResult,
    audio_filename: str,
    audio_file_path: Optional[str] = None,
) -> None:
    """Persist a completed AnalysisResult to the database."""
    record = SessionRecord(
        id=result.id,
        audio_filename=audio_filename,
        audio_file_path=audio_file_path,
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


def get_session_audio_path(db: Session, session_id: str) -> Optional[str]:
    """Return the stored audio file path for a session, or None if unavailable."""
    record = db.query(SessionRecord).filter(SessionRecord.id == session_id).first()
    if not record:
        return None
    return record.audio_file_path


def _record_to_summary(r: SessionRecord) -> SessionSummary:
    """Convert a SessionRecord to a SessionSummary."""
    result = AnalysisResult.model_validate_json(r.result_json)
    return SessionSummary(
        id=result.id,
        created_at=result.created_at,
        audio_filename=r.audio_filename,
        mode=result.mode,
        score_value=result.score.value,
        severity=result.score.severity,
        total_disfluencies=result.metrics.total_disfluencies,
        total_duration_sec=result.metrics.total_duration_sec,
    )


def list_sessions(
    db: Session,
    limit: int = 50,
    date: Optional[str] = None,
    week_start: Optional[str] = None,
) -> List[SessionSummary]:
    """Return lightweight session summaries, newest first.

    Optional filters:
    - date: ISO date string (YYYY-MM-DD) — sessions on that day only
    - week_start: ISO date string — sessions in the 7-day window starting there
    """
    query = db.query(SessionRecord)

    if date:
        try:
            day = datetime.strptime(date, "%Y-%m-%d")
            day_end = day + timedelta(days=1)
            query = query.filter(
                SessionRecord.created_at >= day,
                SessionRecord.created_at < day_end,
            )
        except ValueError:
            pass  # ignore malformed date, return all

    elif week_start:
        try:
            ws = datetime.strptime(week_start, "%Y-%m-%d")
            we = ws + timedelta(days=7)
            query = query.filter(
                SessionRecord.created_at >= ws,
                SessionRecord.created_at < we,
            )
        except ValueError:
            pass

    records = query.order_by(SessionRecord.created_at.desc()).limit(limit).all()
    return [_record_to_summary(r) for r in records]


def get_session_stats(db: Session) -> dict:
    """Return aggregate statistics across all sessions."""
    records = db.query(SessionRecord).all()

    if not records:
        return {
            "total_sessions": 0,
            "avg_score": 0,
            "best_score": 0,
            "total_practice_time_sec": 0,
            "severity_counts": {},
            "sessions_by_day": {},
        }

    scores = []
    total_time = 0.0
    severity_counts: dict = {}
    sessions_by_day: dict = {}

    for r in records:
        result = AnalysisResult.model_validate_json(r.result_json)
        score = result.score.value
        scores.append(score)
        total_time += result.metrics.total_duration_sec
        sev = result.score.severity.value
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

        day_key = result.created_at.strftime("%Y-%m-%d")
        if day_key not in sessions_by_day:
            sessions_by_day[day_key] = {"count": 0, "avg_score": 0, "scores": []}
        sessions_by_day[day_key]["count"] += 1
        sessions_by_day[day_key]["scores"].append(score)

    # Calculate daily averages
    for day_data in sessions_by_day.values():
        day_scores = day_data.pop("scores")
        day_data["avg_score"] = round(sum(day_scores) / len(day_scores), 1) if day_scores else 0

    return {
        "total_sessions": len(records),
        "avg_score": round(sum(scores) / len(scores), 1) if scores else 0,
        "best_score": round(max(scores), 1) if scores else 0,
        "total_practice_time_sec": round(total_time, 1),
        "severity_counts": severity_counts,
        "sessions_by_day": sessions_by_day,
    }


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
