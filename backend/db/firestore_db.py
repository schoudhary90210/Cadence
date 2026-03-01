"""
Firestore session storage — cloud-native alternative to SQLite.

When FIRESTORE_ENABLED=true, sessions are stored in the 'sessions' collection
in Google Cloud Firestore. Falls back to SQLite on any failure.

Graceful degradation: all functions return sensible defaults on failure
so the app never crashes due to Firestore issues.
"""

import logging
from datetime import datetime
from typing import List, Optional

from models.schemas import AnalysisResult, SessionSummary

logger = logging.getLogger("cadence.firestore")

_db = None


def _get_db():
    """Get or create the Firestore client singleton."""
    global _db
    if _db is not None:
        return _db
    try:
        from google.cloud import firestore
        _db = firestore.Client()
        logger.info("Firestore client initialized")
        return _db
    except Exception as exc:
        logger.warning(f"Firestore client init failed: {exc}")
        return None


def save_session_firestore(
    result: AnalysisResult,
    audio_filename: str,
    audio_file_path: Optional[str] = None,
) -> bool:
    """
    Save an AnalysisResult to Firestore.

    Collection: 'sessions', document ID = result.id

    Returns True on success, False on failure.
    """
    try:
        db = _get_db()
        if db is None:
            return False

        doc_data = result.model_dump(mode="json")
        doc_data["audio_filename"] = audio_filename
        doc_data["audio_file_path"] = audio_file_path

        db.collection("sessions").document(result.id).set(doc_data)
        logger.info(f"Saved session {result.id} to Firestore")
        return True

    except Exception as exc:
        logger.warning(f"Firestore save failed: {exc}")
        return False


def get_session_firestore(session_id: str) -> Optional[AnalysisResult]:
    """Retrieve a single session from Firestore by ID."""
    try:
        db = _get_db()
        if db is None:
            return None

        doc = db.collection("sessions").document(session_id).get()
        if not doc.exists:
            return None

        data = doc.to_dict()
        # Remove extra fields not in AnalysisResult
        data.pop("audio_filename", None)
        data.pop("audio_file_path", None)
        return AnalysisResult.model_validate(data)

    except Exception as exc:
        logger.warning(f"Firestore get failed: {exc}")
        return None


def get_sessions_firestore(limit: int = 50) -> List[SessionSummary]:
    """List session summaries from Firestore, newest first."""
    try:
        db = _get_db()
        if db is None:
            return []

        query = (
            db.collection("sessions")
            .order_by("created_at", direction="DESCENDING")
            .limit(limit)
        )

        summaries = []
        for doc in query.stream():
            data = doc.to_dict()
            try:
                data.pop("audio_file_path", None)
                result = AnalysisResult.model_validate(data)
                summaries.append(
                    SessionSummary(
                        id=result.id,
                        created_at=result.created_at,
                        audio_filename=data.get("audio_filename", "unknown"),
                        mode=result.mode,
                        score_value=result.score.value,
                        severity=result.score.severity,
                        total_disfluencies=result.metrics.total_disfluencies,
                        total_duration_sec=result.metrics.total_duration_sec,
                    )
                )
            except Exception:
                continue

        return summaries

    except Exception as exc:
        logger.warning(f"Firestore list failed: {exc}")
        return []


def get_session_audio_path_firestore(session_id: str) -> Optional[str]:
    """Get the audio file path for a session from Firestore."""
    try:
        db = _get_db()
        if db is None:
            return None

        doc = db.collection("sessions").document(session_id).get()
        if not doc.exists:
            return None

        return doc.to_dict().get("audio_file_path")

    except Exception as exc:
        logger.warning(f"Firestore audio path lookup failed: {exc}")
        return None
