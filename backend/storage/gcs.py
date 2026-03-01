"""
Google Cloud Storage integration for audio persistence.

Uploads analysed audio files to GCS for durable storage beyond local disk.
Graceful degradation: logs and continues if GCS is unavailable — never crashes.
"""

import logging
from pathlib import Path
from typing import Optional

from config import GCS_BUCKET_NAME

logger = logging.getLogger("cadence.gcs")


def upload_to_gcs(local_path: str, session_id: str) -> Optional[str]:
    """
    Upload a local audio file to Google Cloud Storage.

    Stores at: gs://{bucket}/sessions/{session_id}/{filename}

    Args:
        local_path: Path to the local audio file.
        session_id: Session UUID for organizing uploads.

    Returns:
        GCS URI (gs://...) on success, or None on failure.
    """
    try:
        from google.cloud import storage
    except ImportError:
        logger.warning("google-cloud-storage not installed — skipping GCS upload")
        return None

    try:
        path = Path(local_path)
        if not path.exists():
            logger.warning(f"File not found for GCS upload: {local_path}")
            return None

        client = storage.Client()
        bucket = client.bucket(GCS_BUCKET_NAME)

        blob_name = f"sessions/{session_id}/{path.name}"
        blob = bucket.blob(blob_name)

        # Set content type based on extension
        content_type_map = {
            ".wav": "audio/wav",
            ".m4a": "audio/mp4",
            ".mp3": "audio/mpeg",
            ".webm": "audio/webm",
            ".mp4": "audio/mp4",
        }
        content_type = content_type_map.get(path.suffix.lower(), "application/octet-stream")

        blob.upload_from_filename(str(path), content_type=content_type)

        gcs_uri = f"gs://{GCS_BUCKET_NAME}/{blob_name}"
        logger.info(f"Uploaded to GCS: {gcs_uri}")
        return gcs_uri

    except Exception as exc:
        logger.warning(f"GCS upload failed — continuing without cloud storage: {exc}")
        return None
