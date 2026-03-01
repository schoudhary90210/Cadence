"""
SQLite database setup via SQLAlchemy.
Sessions are stored as JSON blobs keyed by UUID.
"""

import os
from sqlalchemy import create_engine, Column, String, Text, DateTime, inspect as sa_inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cadence.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # needed for SQLite + FastAPI
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class SessionRecord(Base):
    """Stores one analysis session per row. Result JSON is denormalized for simplicity."""
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True)
    audio_filename = Column(String, nullable=False)
    audio_file_path = Column(String, nullable=True)   # path to stored audio file; null if not retained
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    mode = Column(String, nullable=False)
    score_value = Column(String, nullable=False)   # stored as string to avoid float precision issues
    severity = Column(String, nullable=False)
    result_json = Column(Text, nullable=False)     # full AnalysisResult JSON


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    # Migrate existing databases: add audio_file_path column if absent
    try:
        inspector = sa_inspect(engine)
        cols = [c["name"] for c in inspector.get_columns("sessions")]
        if "audio_file_path" not in cols:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE sessions ADD COLUMN audio_file_path TEXT"))
                conn.commit()
    except Exception:
        pass  # Table may not exist yet — create_all above handles that


def get_db():
    """FastAPI dependency — yields a SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
