"""
Cadence — FastAPI application entry point.

Run with:
    uvicorn main:app --reload --port 8000

Environment variables (see .env.example):
    ANALYSIS_MODE    RULES_ONLY (default) | HYBRID_ML
    DATABASE_URL     sqlite:///./cadence.db (default)
    WHISPER_MODEL    base.en (default)
    CORS_ORIGINS     http://localhost:3000 (default)
    LOG_LEVEL        INFO (default)
"""

import asyncio
import logging
import mimetypes
import os
import random
import shutil
import tempfile
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

import config
from config import (
    ANALYSIS_MODE,
    AUDIO_UPLOADS_DIR,
    CORS_ORIGINS,
    DEMO_CACHED_RESULTS_DIR,
    DEMO_SAMPLES_DIR,
    LIMITATIONS,
    LOG_LEVEL,
    MAX_UPLOAD_SIZE_MB,
)
from db.database import create_tables, get_db
from db import crud
from models.schemas import (
    AnalysisMetrics,
    AnalysisMode,
    AnalysisResult,
    ConversationPrompt,
    DemoSample,
    DisfluencyEvent,
    ErrorResponse,
    EventSource,
    EventSubtype,
    EventType,
    FluencyScore,
    HealthResponse,
    PipelineLatency,
    ReadingPassage,
    ScoreBreakdown,
    SessionSummary,
    Severity,
    Transcript,
    VADSegment,
    SegmentType,
    WordTimestamp,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))
logger = logging.getLogger("cadence")

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
_start_time = time.time()

app = FastAPI(
    title="Cadence API",
    version="1.0.0",
    description=(
        "Prototype speech fluency analytics — clinical-inspired metrics. "
        "NOT a medical diagnostic tool."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    create_tables()
    logger.info(f"Cadence started — mode: {ANALYSIS_MODE}")
    # Pre-warm librosa/numba JIT so the first real request isn't slow (~20s cold-start)
    def _warm():
        try:
            import librosa
            import numpy as np
            dummy = np.zeros(1600, dtype=np.float32)  # 100ms of silence
            librosa.feature.rms(y=dummy, frame_length=400, hop_length=160, center=False)
            logger.info("librosa JIT warmup complete")
        except Exception as e:
            logger.warning(f"librosa warmup skipped: {e}")
    await asyncio.get_event_loop().run_in_executor(None, _warm)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse, tags=["meta"])
async def health():
    """Liveness check. Returns current analysis mode and server uptime."""
    return HealthResponse(
        status="ok",
        mode=AnalysisMode[ANALYSIS_MODE],
        uptime=round(time.time() - _start_time, 1),
    )


@app.post("/analyze", response_model=AnalysisResult, tags=["analysis"])
async def analyze(
    file: UploadFile = File(..., description="Audio file (M4A, WAV, MP3 — 16kHz mono preferred)"),
    db: Session = Depends(get_db),
):
    """
    Upload audio and run the full fluency pipeline.

    Returns AnalysisResult with transcript, VAD segments, disfluency events,
    metrics, composite score, per-stage latency, and prototype limitations.

    If the uploaded filename matches a bundled demo sample a pre-computed
    cached result is returned instantly (no pipeline delay).
    """
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f} MB). Max: {MAX_UPLOAD_SIZE_MB} MB",
        )

    display_name = file.filename or "upload.m4a"

    # ------------------------------------------------------------------
    # Fast path: return pre-computed result for demo samples
    # ------------------------------------------------------------------
    stem = Path(display_name).stem
    suffix = Path(display_name).suffix or ".m4a"
    cached_path = Path(DEMO_CACHED_RESULTS_DIR) / f"{stem}.json"
    if cached_path.exists():
        result = AnalysisResult.model_validate_json(cached_path.read_text())
        # Assign a fresh ID + timestamp so each DB row is unique
        result = result.model_copy(
            update={"id": str(uuid.uuid4()), "created_at": datetime.utcnow()}
        )
        # Point audio at the existing demo sample file if present
        demo_audio = Path(DEMO_SAMPLES_DIR) / f"{stem}.m4a"
        audio_path: Optional[str] = str(demo_audio) if demo_audio.exists() else None
        crud.save_session(db, result, display_name, audio_file_path=audio_path)
        logger.info(f"[CACHED] {display_name} — score {result.score.value}")
        return result

    # ------------------------------------------------------------------
    # Full pipeline path — save audio permanently for playback
    # ------------------------------------------------------------------
    os.makedirs(AUDIO_UPLOADS_DIR, exist_ok=True)
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=suffix, prefix="cadence_upload_")
    os.close(tmp_fd)
    audio_file_path: Optional[str] = None

    try:
        with open(tmp_path, "wb") as f:
            f.write(content)

        from pipeline.orchestrator import analyze_audio
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: analyze_audio(tmp_path, mode=ANALYSIS_MODE)
        )

        # Move temp file to persistent store keyed by session ID
        final_path = os.path.join(AUDIO_UPLOADS_DIR, f"{result.id}{suffix}")
        shutil.move(tmp_path, final_path)
        audio_file_path = final_path
        tmp_path = None  # Signal: already moved, don't delete in finally

    except Exception as exc:
        logger.error(f"Pipeline error for {display_name}: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    crud.save_session(db, result, display_name, audio_file_path=audio_file_path)
    logger.info(f"Analyzed {display_name} — score {result.score.value}")
    return result


@app.get("/sessions", response_model=List[SessionSummary], tags=["sessions"])
async def list_sessions(db: Session = Depends(get_db)):
    """List all past analysis sessions as lightweight summaries, newest first."""
    return crud.list_sessions(db)


@app.get("/sessions/{session_id}", response_model=AnalysisResult, tags=["sessions"])
async def get_session(session_id: str, db: Session = Depends(get_db)):
    """Return full AnalysisResult for a specific session."""
    result = crud.get_session(db, session_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    return result


@app.get("/demo-samples", response_model=List[DemoSample], tags=["demo"])
async def demo_samples():
    """
    List bundled demo audio samples.
    Cached results return instantly (no pipeline delay).
    """
    demo_dir   = Path(DEMO_SAMPLES_DIR)
    cached_dir = Path(DEMO_CACHED_RESULTS_DIR)

    _META = {
        "fluent_sample": {
            "label":       "fluent",
            "description": "Clean reading passage — no disfluencies. Expected score ~80–90.",
            "duration":    30.0,
        },
        "stuttered_sample": {
            "label":       "stuttered",
            "description": "Intentional blocks, repetitions (b-b-but), and prolongations (sssso). Expected score ~40–70.",
            "duration":    30.0,
        },
        "mixed_sample": {
            "label":       "mixed",
            "description": "Mostly fluent with a few fillers and one repetition. Expected score ~70–85.",
            "duration":    30.0,
        },
    }

    samples: List[DemoSample] = []
    for m4a_file in sorted(demo_dir.glob("*.m4a")):
        stem = m4a_file.stem
        meta = _META.get(stem, {"label": stem, "description": "", "duration": 0.0})
        cached = (cached_dir / f"{stem}.json").exists()
        samples.append(
            DemoSample(
                filename=m4a_file.name,
                label=meta["label"],
                description=meta["description"],
                duration=meta["duration"],
                cached=cached,
            )
        )
    return samples


@app.post("/demo-samples/{filename}/analyze", response_model=AnalysisResult, tags=["demo"])
async def analyze_demo(filename: str, db: Session = Depends(get_db)):
    """
    Run analysis on a named demo sample.
    Returns cached JSON instantly if available; otherwise runs the full pipeline.
    """
    stem = Path(filename).stem
    cached_path = Path(DEMO_CACHED_RESULTS_DIR) / f"{stem}.json"

    if cached_path.exists():
        result = AnalysisResult.model_validate_json(cached_path.read_text())
        result = result.model_copy(
            update={"id": str(uuid.uuid4()), "created_at": datetime.utcnow()}
        )
        demo_audio_path = str(Path(DEMO_SAMPLES_DIR) / filename)
        crud.save_session(
            db, result, filename,
            audio_file_path=demo_audio_path if Path(demo_audio_path).exists() else None,
        )
        logger.info(f"Returning cached result for {filename}")
        return result

    # No cache — run live
    src = Path(DEMO_SAMPLES_DIR) / filename
    if not src.exists():
        raise HTTPException(status_code=404, detail=f"Demo sample '{filename}' not found")

    from pipeline.orchestrator import analyze_audio
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: analyze_audio(str(src), mode=ANALYSIS_MODE)
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    crud.save_session(db, result, filename, audio_file_path=str(src))
    return result


@app.get("/sessions/{session_id}/audio", tags=["sessions"])
async def get_session_audio(session_id: str, db: Session = Depends(get_db)):
    """
    Stream the original audio file for a session.
    Returns 404 if the session has no stored audio (e.g. older sessions before audio retention was added).
    """
    audio_path = crud.get_session_audio_path(db, session_id)
    if not audio_path:
        raise HTTPException(status_code=404, detail="Session not found")
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not available for this session")

    ext = Path(audio_path).suffix.lower()
    _AUDIO_MIME = {
        ".m4a":  "audio/mp4",
        ".mp4":  "audio/mp4",
        ".mp3":  "audio/mpeg",
        ".wav":  "audio/wav",
        ".webm": "audio/webm",
    }
    media_type = _AUDIO_MIME.get(ext) or mimetypes.guess_type(audio_path)[0] or "audio/mpeg"
    return FileResponse(audio_path, media_type=media_type)


@app.get("/practice/passages", response_model=List[ReadingPassage], tags=["practice"])
async def list_passages():
    """Return all reading passages grouped by difficulty for reading practice mode."""
    return [ReadingPassage(**p) for p in config.READING_PASSAGES]


@app.get("/practice/prompts", response_model=ConversationPrompt, tags=["practice"])
async def get_prompt(category: Optional[str] = None):
    """
    Return a random conversation prompt.
    Pass ?category=casual|interview|storytelling to filter.
    """
    prompts = config.CONVERSATION_PROMPTS
    if category:
        prompts = [p for p in prompts if p["category"] == category]
    if not prompts:
        raise HTTPException(
            status_code=404,
            detail=f"No prompts found for category '{category}'. Valid values: casual, interview, storytelling.",
        )
    return ConversationPrompt(**random.choice(prompts))


@app.get("/metrics/latest", tags=["metrics"])
async def latest_metrics(db: Session = Depends(get_db)):
    """Return metrics and score from the most recent analysis session."""
    result = crud.get_latest_session(db)
    if not result:
        raise HTTPException(status_code=404, detail="No sessions yet")
    return {
        "id":         result.id,
        "created_at": result.created_at,
        "mode":       result.mode,
        "metrics":    result.metrics,
        "score":      result.score,
        "latency":    result.latency,
    }
