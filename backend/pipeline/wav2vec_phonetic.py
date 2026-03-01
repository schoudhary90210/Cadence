"""
Phase 7 (Tier 2): wav2vec2-base-960h CTC phonetic transcription.
Character-level transcript with timestamps for sub-word repetition/prolongation detection.
Only runs when ANALYSIS_MODE=HYBRID_ML.
"""

from pathlib import Path
from typing import Optional

from models.schemas import PhoneticTranscript


def transcribe_phonetic(audio_path: Path) -> Optional[PhoneticTranscript]:
    """
    Produce character-level CTC transcript using wav2vec2-base-960h.

    Args:
        audio_path: 16kHz mono WAV.

    Returns:
        PhoneticTranscript with character-level timestamps, or None if model unavailable.
    """
    # TODO Phase 7: implement
    # import torch, soundfile as sf
    # from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
    # from config import WAV2VEC_ASR_MODEL_ID
    # processor = Wav2Vec2Processor.from_pretrained(WAV2VEC_ASR_MODEL_ID)
    # model = Wav2Vec2ForCTC.from_pretrained(WAV2VEC_ASR_MODEL_ID)
    # ...CTC decode with timestamps...
    raise NotImplementedError("Phonetic transcription not yet implemented — see Phase 7")
