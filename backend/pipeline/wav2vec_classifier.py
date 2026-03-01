"""
Phase 7 (Tier 2): wav2vec2-base disfluency classifier.
Extracts 768-dim frame embeddings → sklearn RF classifier → per-frame event labels.
Only runs when ANALYSIS_MODE=HYBRID_ML and classifier.pkl exists.
"""

from pathlib import Path
from typing import List

from models.schemas import DisfluencyEvent, WordTimestamp


def classify(audio_path: Path, words: List[WordTimestamp]) -> List[DisfluencyEvent]:
    """
    Run wav2vec2-base → sklearn classifier on audio, producing ML-sourced events.

    Args:
        audio_path: 16kHz mono WAV.
        words:      Word timestamps (used to align frame-level predictions to words).

    Returns:
        List of DisfluencyEvent with source=EventSource.ML.
    """
    # TODO Phase 7: implement
    # import torch, numpy as np, pickle
    # from transformers import Wav2Vec2Model, Wav2Vec2Processor
    # from config import WAV2VEC_MODEL_ID, WAV2VEC_CLASSIFIER_PATH
    # processor = Wav2Vec2Processor.from_pretrained(WAV2VEC_MODEL_ID)
    # model = Wav2Vec2Model.from_pretrained(WAV2VEC_MODEL_ID)
    # with open(WAV2VEC_CLASSIFIER_PATH, "rb") as f: clf = pickle.load(f)
    # ...extract embeddings per word window, classify, map to events...
    raise NotImplementedError("wav2vec classifier not yet implemented — see Phase 7")
