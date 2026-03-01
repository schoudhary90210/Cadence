"""
Audio preprocessing pipeline module.
Converts any audio input to 16kHz mono WAV for all downstream stages.

Supports: .wav, .mp3, .m4a, .webm, .ogg (and any format ffmpeg handles).
WAV files are processed natively via pydub without ffmpeg.
All other formats require ffmpeg (brew install ffmpeg).
"""

import os
import tempfile
from pathlib import Path

from config import SAMPLE_RATE


def preprocess_audio(file_path: str) -> str:
    """
    Convert any audio file to a 16kHz mono WAV temp file.

    Uses pydub for format handling. WAV files are processed without ffmpeg;
    all other formats (MP3, M4A, WEBM, OGG, etc.) require ffmpeg to be
    installed and on PATH.

    Args:
        file_path: Absolute or relative path to the input audio file.

    Returns:
        Absolute path to a temporary 16kHz mono WAV file. The caller is
        responsible for deleting it when done (use try/finally).

    Raises:
        FileNotFoundError: If the input file does not exist.
        RuntimeError: If ffmpeg is missing (for non-WAV inputs) or the
                      file is corrupt / unsupported.
    """
    input_path = Path(file_path).expanduser().resolve()

    if not input_path.exists():
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    if not input_path.is_file():
        raise FileNotFoundError(f"Path is not a file: {file_path}")

    try:
        from pydub import AudioSegment
    except ImportError as exc:
        raise RuntimeError(
            "pydub is not installed. Run: pip install pydub"
        ) from exc

    # -------------------------------------------------------------------------
    # Load audio
    # -------------------------------------------------------------------------
    suffix = input_path.suffix.lower().lstrip(".")

    try:
        if suffix == "wav":
            # pydub reads WAV natively — no ffmpeg needed
            audio = AudioSegment.from_wav(str(input_path))
        elif suffix == "mp3":
            audio = AudioSegment.from_mp3(str(input_path))
        elif suffix in ("m4a", "mp4", "aac"):
            audio = AudioSegment.from_file(str(input_path), format="m4a")
        elif suffix == "ogg":
            audio = AudioSegment.from_ogg(str(input_path))
        elif suffix == "flac":
            audio = AudioSegment.from_file(str(input_path), format="flac")
        elif suffix == "webm":
            audio = AudioSegment.from_file(str(input_path), format="webm")
        else:
            # Generic fallback — let ffmpeg figure out the container
            audio = AudioSegment.from_file(str(input_path))

    except FileNotFoundError as exc:
        # pydub raises FileNotFoundError when ffmpeg/ffprobe is missing
        msg = str(exc).lower()
        if "ffmpeg" in msg or "ffprobe" in msg or "avconv" in msg or "couldn" in msg:
            raise RuntimeError(
                f"ffmpeg is required to decode '{suffix.upper()}' files but was not found. "
                "Install it with:  brew install ffmpeg"
            ) from exc
        raise FileNotFoundError(f"Audio file not found: {file_path}") from exc

    except Exception as exc:
        # Covers CouldntDecodeError and other pydub/codec errors
        cls = type(exc).__name__
        raise RuntimeError(
            f"Could not decode '{input_path.name}' ({cls}). "
            "The file may be corrupt, empty, or an unsupported format. "
            f"Detail: {exc}"
        ) from exc

    # -------------------------------------------------------------------------
    # Normalise: mono + 16kHz
    # -------------------------------------------------------------------------
    # Convert to mono by averaging channels (handles stereo, 5.1, etc.)
    if audio.channels != 1:
        audio = audio.set_channels(1)

    # Resample to target rate using audioop.ratecv (stdlib, no ffmpeg needed)
    if audio.frame_rate != SAMPLE_RATE:
        audio = audio.set_frame_rate(SAMPLE_RATE)

    # -------------------------------------------------------------------------
    # Write to a named temp file
    # -------------------------------------------------------------------------
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".wav", prefix="cadence_")
    os.close(tmp_fd)  # pydub opens the file itself; close the OS descriptor

    try:
        audio.export(tmp_path, format="wav")
    except Exception as exc:
        os.unlink(tmp_path)  # clean up on export failure
        raise RuntimeError(f"Failed to write processed WAV: {exc}") from exc

    return tmp_path


def preprocess(input_path: Path, output_path: Path) -> float:
    """
    Orchestrator-facing wrapper: normalise audio and write to a specific path.

    Args:
        input_path:  Source audio file (any format).
        output_path: Destination for the 16kHz mono WAV.

    Returns:
        Duration of the processed audio in seconds.
    """
    import wave

    tmp = preprocess_audio(str(input_path))
    try:
        # Move temp file to the requested output path
        import shutil
        shutil.move(tmp, str(output_path))
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise

    with wave.open(str(output_path)) as wf:
        duration = wf.getnframes() / wf.getframerate()

    return duration
