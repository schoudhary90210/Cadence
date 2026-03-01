"""
Cadence Learn — progress tracking with dual storage.

When FIRESTORE_ENABLED=true: uses Firestore with FLAT collections
  - learn_progress: doc ID = "{userId}_{courseType}"
  - learn_sessions: auto-ID docs per session

When FIRESTORE_ENABLED=false: uses backend/learn_progress.json as flat file.

All functions gracefully degrade — never crash.
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from config import FIRESTORE_ENABLED

logger = logging.getLogger("cadence.learn.progress")

# ---------------------------------------------------------------------------
# JSON file path (fallback storage)
# ---------------------------------------------------------------------------
_JSON_PATH = Path(__file__).resolve().parent.parent / "learn_progress.json"


# ---------------------------------------------------------------------------
# JSON file helpers
# ---------------------------------------------------------------------------

def _load_json() -> Dict[str, Any]:
    """Load the JSON progress file. Returns empty structure if missing."""
    if not _JSON_PATH.exists():
        return {"progress": {}, "sessions": []}
    try:
        with open(_JSON_PATH, "r") as f:
            return json.load(f)
    except Exception:
        return {"progress": {}, "sessions": []}


def _save_json(data: Dict[str, Any]) -> None:
    """Write the JSON progress file."""
    try:
        with open(_JSON_PATH, "w") as f:
            json.dump(data, f, indent=2, default=str)
    except Exception as exc:
        logger.warning(f"Failed to save learn_progress.json: {exc}")


# ---------------------------------------------------------------------------
# Firestore helpers
# ---------------------------------------------------------------------------

def _get_firestore():
    """Get the Firestore client singleton (reuse from db.firestore_db)."""
    try:
        from db.firestore_db import _get_db
        return _get_db()
    except Exception:
        return None


# ---------------------------------------------------------------------------
# init_course
# ---------------------------------------------------------------------------

def init_course(user_id: str, course_type: str) -> Dict[str, Any]:
    """Create a progress doc with level=1, consecutive_passes=0. Returns the doc."""
    doc_id = f"{user_id}_{course_type}"
    now = datetime.now(timezone.utc).isoformat()
    progress_data = {
        "userId": user_id,
        "courseType": course_type,
        "current_level": 1,
        "consecutive_passes": 0,
        "total_sessions": 0,
        "best_scores": {},
        "unlocked_at": now,
    }

    if FIRESTORE_ENABLED:
        try:
            db = _get_firestore()
            if db:
                # Only create if not already exists
                doc_ref = db.collection("learn_progress").document(doc_id)
                doc = doc_ref.get()
                if doc.exists:
                    return doc.to_dict()
                doc_ref.set(progress_data)
                logger.info(f"Firestore: initialized course {course_type} for {user_id}")
                return progress_data
        except Exception as exc:
            logger.warning(f"Firestore init_course failed, using JSON: {exc}")

    # JSON fallback
    data = _load_json()
    if doc_id not in data["progress"]:
        data["progress"][doc_id] = progress_data
        _save_json(data)
    return data["progress"][doc_id]


# ---------------------------------------------------------------------------
# get_progress
# ---------------------------------------------------------------------------

def get_progress(user_id: str, course_type: str) -> Optional[Dict[str, Any]]:
    """Get progress for a user+course. Returns None if not started."""
    doc_id = f"{user_id}_{course_type}"

    if FIRESTORE_ENABLED:
        try:
            db = _get_firestore()
            if db:
                doc = db.collection("learn_progress").document(doc_id).get()
                if doc.exists:
                    return doc.to_dict()
                return None
        except Exception as exc:
            logger.warning(f"Firestore get_progress failed, using JSON: {exc}")

    data = _load_json()
    return data["progress"].get(doc_id)


# ---------------------------------------------------------------------------
# get_all_progress
# ---------------------------------------------------------------------------

def get_all_progress(user_id: str) -> List[Dict[str, Any]]:
    """Get progress for all active courses for a user."""
    if FIRESTORE_ENABLED:
        try:
            db = _get_firestore()
            if db:
                query = db.collection("learn_progress").where("userId", "==", user_id)
                results = []
                for doc in query.stream():
                    results.append(doc.to_dict())
                if results:
                    return results
        except Exception as exc:
            logger.warning(f"Firestore get_all_progress failed, using JSON: {exc}")

    data = _load_json()
    return [
        v for v in data["progress"].values()
        if v.get("userId") == user_id
    ]


# ---------------------------------------------------------------------------
# save_learn_session
# ---------------------------------------------------------------------------

def save_learn_session(
    user_id: str,
    course_type: str,
    level: int,
    exercise_text: str,
    score: float,
    passed: bool,
    events_count: int,
    gcs_uri: Optional[str] = None,
) -> Dict[str, Any]:
    """Save a single practice session record."""
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    session_data = {
        "id": session_id,
        "userId": user_id,
        "courseType": course_type,
        "level": level,
        "exercise_text": exercise_text,
        "score": score,
        "passed": passed,
        "events_count": events_count,
        "gcs_uri": gcs_uri,
        "timestamp": now,
    }

    if FIRESTORE_ENABLED:
        try:
            db = _get_firestore()
            if db:
                db.collection("learn_sessions").document(session_id).set(session_data)
                logger.info(f"Firestore: saved learn session {session_id}")
                return session_data
        except Exception as exc:
            logger.warning(f"Firestore save_learn_session failed, using JSON: {exc}")

    data = _load_json()
    data["sessions"].append(session_data)
    _save_json(data)
    return session_data


# ---------------------------------------------------------------------------
# evaluate_and_advance
# ---------------------------------------------------------------------------

def evaluate_and_advance(
    user_id: str,
    course_type: str,
    score: float,
) -> Dict[str, Any]:
    """
    Evaluate a score and advance the user if criteria met.

    Logic:
      score >= 80 → consecutive_passes += 1
        if consecutive_passes >= 3 AND level < 5 → ADVANCE
        if consecutive_passes >= 3 AND level == 5 → COMPLETE
        else → RETRY (passed=true, need more consecutive)
      score < 80 → consecutive_passes = 0, RETRY
    """
    doc_id = f"{user_id}_{course_type}"
    passed = score >= 80

    # Load current progress
    progress = get_progress(user_id, course_type)
    if not progress:
        progress = init_course(user_id, course_type)

    current_level = progress.get("current_level", 1)
    consecutive = progress.get("consecutive_passes", 0)
    total_sessions = progress.get("total_sessions", 0)
    best_scores = progress.get("best_scores", {})

    # Update best score for current level
    level_key = str(current_level)
    prev_best = best_scores.get(level_key, 0)
    if score > prev_best:
        best_scores[level_key] = score

    total_sessions += 1

    if passed:
        consecutive += 1
        if consecutive >= 3 and current_level < 5:
            next_action = "ADVANCE"
            current_level += 1
            consecutive = 0
        elif consecutive >= 3 and current_level == 5:
            next_action = "COMPLETE"
        else:
            next_action = "RETRY"
    else:
        consecutive = 0
        next_action = "RETRY"

    # Save updated progress
    updated = {
        "userId": user_id,
        "courseType": course_type,
        "current_level": current_level,
        "consecutive_passes": consecutive,
        "total_sessions": total_sessions,
        "best_scores": best_scores,
        "unlocked_at": progress.get("unlocked_at", datetime.now(timezone.utc).isoformat()),
    }

    if FIRESTORE_ENABLED:
        try:
            db = _get_firestore()
            if db:
                db.collection("learn_progress").document(doc_id).set(updated)
                return {
                    "passed": passed,
                    "consecutive_passes": consecutive,
                    "next_action": next_action,
                    "current_level": current_level,
                }
        except Exception as exc:
            logger.warning(f"Firestore evaluate_and_advance failed, using JSON: {exc}")

    data = _load_json()
    data["progress"][doc_id] = updated
    _save_json(data)

    return {
        "passed": passed,
        "consecutive_passes": consecutive,
        "next_action": next_action,
        "current_level": current_level,
    }


# ---------------------------------------------------------------------------
# reset_progress
# ---------------------------------------------------------------------------

def reset_progress(user_id: str) -> None:
    """Delete all progress and session records for a user."""
    if FIRESTORE_ENABLED:
        try:
            db = _get_firestore()
            if db:
                # Delete progress docs
                query = db.collection("learn_progress").where("userId", "==", user_id)
                for doc in query.stream():
                    doc.reference.delete()
                # Delete session docs
                query = db.collection("learn_sessions").where("userId", "==", user_id)
                for doc in query.stream():
                    doc.reference.delete()
                logger.info(f"Firestore: reset all progress for {user_id}")
                return
        except Exception as exc:
            logger.warning(f"Firestore reset_progress failed, using JSON: {exc}")

    data = _load_json()
    data["progress"] = {
        k: v for k, v in data["progress"].items()
        if v.get("userId") != user_id
    }
    data["sessions"] = [
        s for s in data["sessions"]
        if s.get("userId") != user_id
    ]
    _save_json(data)


# ---------------------------------------------------------------------------
# get_session_history
# ---------------------------------------------------------------------------

def get_session_history(
    user_id: str,
    course_type: str,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """Return the last N sessions for a user+course, newest first."""
    if FIRESTORE_ENABLED:
        try:
            db = _get_firestore()
            if db:
                query = (
                    db.collection("learn_sessions")
                    .where("userId", "==", user_id)
                    .where("courseType", "==", course_type)
                    .order_by("timestamp", direction="DESCENDING")
                    .limit(limit)
                )
                results = []
                for doc in query.stream():
                    results.append(doc.to_dict())
                if results:
                    return results
        except Exception as exc:
            logger.warning(f"Firestore get_session_history failed, using JSON: {exc}")

    data = _load_json()
    matching = [
        s for s in data["sessions"]
        if s.get("userId") == user_id and s.get("courseType") == course_type
    ]
    # Sort by timestamp descending
    matching.sort(key=lambda s: s.get("timestamp", ""), reverse=True)
    return matching[:limit]
