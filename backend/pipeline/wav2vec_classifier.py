"""
Phase 7 (Tier 2): wav2vec2-base disfluency classifier.

Extracts 768-dim frame-level embeddings from wav2vec2-base, then runs a
sklearn RandomForestClassifier to label each frame as fluent or one of
several disfluency types (block, repetition, filler, etc.).

Bootstrap training:
    If no classifier.pkl or training data exists, the classifier auto-bootstraps
    by running the RULES_ONLY pipeline on the demo samples and using the
    resulting events as frame-level pseudo-labels.  This produces a small but
    functional training set (~3000 frames across 3 samples) that lets the
    RF learn to detect disfluencies from acoustic features.

Fallback:
    classify() wraps everything in try/except — returns [] on any failure.
    The pipeline never crashes due to ML failures.
"""

import logging
import os
import pickle
from collections import Counter
from pathlib import Path
from typing import List, Optional

import librosa
import numpy as np
import torch

from config import SAMPLE_RATE, WAV2VEC_CLASSIFIER_PATH, WAV2VEC_MODEL_ID
from models.schemas import (
    DisfluencyEvent,
    EventSource,
    EventType,
)

logger = logging.getLogger("cadence.wav2vec_classifier")

# Frame timing: wav2vec2 outputs 1 frame per 320 input samples (20ms at 16kHz)
FRAME_STRIDE_SAMPLES = 320
FRAME_MS = FRAME_STRIDE_SAMPLES / SAMPLE_RATE * 1000  # 20.0

# Fluent label (non-event)
LABEL_FLUENT = "fluent"

# Map classifier string labels → DisfluencyEvent.type enum values
LABEL_TO_EVENT_TYPE = {
    "block": EventType.BLOCK,
    "repetition": EventType.REPETITION,
    "prolongation": EventType.PROLONGATION,
    "filler": EventType.FILLER,
    "interjection": EventType.INTERJECTION,
}


# ---------------------------------------------------------------------------
# Classifier class
# ---------------------------------------------------------------------------


class DisfluencyClassifier:
    """
    wav2vec2-base → 768-dim frame embeddings → RandomForest → disfluency labels.

    Lifecycle:
        1. Load wav2vec2-base feature extractor + model (cached by HF).
        2. Load classifier.pkl if it exists.
        3. Otherwise, load training_embeddings.npy + training_labels.npy.
           If those don't exist either, bootstrap from demo samples.
        4. Train RF, print accuracy + per-class F1, save classifier.pkl.
    """

    def __init__(self):
        from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2Model

        logger.info("Loading wav2vec2-base model...")
        self.feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(
            WAV2VEC_MODEL_ID
        )
        self.model = Wav2Vec2Model.from_pretrained(WAV2VEC_MODEL_ID)
        self.model.eval()
        logger.info("wav2vec2-base loaded.")

        classifier_path = Path(WAV2VEC_CLASSIFIER_PATH)

        if classifier_path.exists():
            logger.info(f"Loading classifier from {classifier_path}")
            with open(classifier_path, "rb") as f:
                self.classifier = pickle.load(f)
            logger.info(
                f"Classifier loaded — classes: {list(self.classifier.classes_)}"
            )
        else:
            emb_path = Path("ml_cache/training_embeddings.npy")
            lbl_path = Path("ml_cache/training_labels.npy")

            if not emb_path.exists() or not lbl_path.exists():
                logger.info("No training data — bootstrapping from demo samples...")
                self._bootstrap_training_data(emb_path, lbl_path)

            embeddings = np.load(str(emb_path))
            labels = np.load(str(lbl_path), allow_pickle=True)

            logger.info(
                f"Training RF on {embeddings.shape[0]} frames, "
                f"{len(set(labels))} classes"
            )

            from sklearn.ensemble import RandomForestClassifier
            from sklearn.metrics import classification_report

            self.classifier = RandomForestClassifier(
                n_estimators=100, n_jobs=-1, random_state=42
            )
            self.classifier.fit(embeddings, labels)

            preds = self.classifier.predict(embeddings)
            accuracy = float((preds == labels).mean())
            print(f"Training accuracy: {accuracy:.3f}")
            print("Per-class F1:")
            print(classification_report(labels, preds, zero_division=0))

            classifier_path.parent.mkdir(parents=True, exist_ok=True)
            with open(classifier_path, "wb") as f:
                pickle.dump(self.classifier, f)
            logger.info(f"Classifier saved → {classifier_path}")

    # -------------------------------------------------------------------
    # Bootstrap: generate training data from demo samples
    # -------------------------------------------------------------------

    def _bootstrap_training_data(self, emb_path: Path, lbl_path: Path):
        """
        Extract wav2vec2 frame embeddings from demo audio and label them
        using the rules-based pipeline detections as ground truth.

        Each frame (20ms) gets labelled with the event type it falls within,
        or 'fluent' if it's outside all events.
        """
        import glob

        from pipeline.audio_preprocessing import preprocess_audio
        from pipeline.orchestrator import analyze_audio

        demo_files = sorted(glob.glob("demo_samples/*.m4a")) + sorted(
            glob.glob("demo_samples/*.wav")
        )
        if not demo_files:
            raise FileNotFoundError(
                "No demo samples found in demo_samples/ for bootstrap training"
            )

        all_embeddings: List[np.ndarray] = []
        all_labels: List[np.ndarray] = []

        for demo_path in demo_files:
            logger.info(f"Bootstrap: processing {demo_path}")

            # 1. Run rules pipeline to get event labels
            result = analyze_audio(demo_path, mode="RULES_ONLY")

            # 2. Preprocess audio and extract wav2vec2 embeddings
            norm_path = preprocess_audio(demo_path)
            try:
                embeddings = self._extract_embeddings(norm_path)
            finally:
                try:
                    os.unlink(norm_path)
                except OSError:
                    pass

            # 3. Label each frame based on which event it falls within
            num_frames = embeddings.shape[0]
            labels = np.full(num_frames, LABEL_FLUENT, dtype=object)

            for event in result.events:
                start_frame = max(0, int(event.start_ms / FRAME_MS))
                end_frame = min(num_frames, int(event.end_ms / FRAME_MS))
                label = event.type.value
                for f_idx in range(start_frame, end_frame):
                    labels[f_idx] = label

            all_embeddings.append(embeddings)
            all_labels.append(labels)

            disfluent_count = int(np.sum(labels != LABEL_FLUENT))
            logger.info(f"  → {num_frames} frames, {disfluent_count} disfluent")

        combined_emb = np.concatenate(all_embeddings, axis=0)
        combined_lbl = np.concatenate(all_labels, axis=0)

        emb_path.parent.mkdir(parents=True, exist_ok=True)
        np.save(str(emb_path), combined_emb)
        np.save(str(lbl_path), combined_lbl, allow_pickle=True)

        label_counts = dict(Counter(combined_lbl))
        logger.info(
            f"Bootstrap complete: {combined_emb.shape[0]} frames, "
            f"label distribution: {label_counts}"
        )

    # -------------------------------------------------------------------
    # Embedding extraction
    # -------------------------------------------------------------------

    def _extract_embeddings(self, audio_path: str) -> np.ndarray:
        """
        Extract per-frame 768-dim embeddings from audio using wav2vec2-base.

        Loads audio with librosa (handles WAV, M4A, MP3, etc.), normalises
        to 16kHz mono, runs through the wav2vec2-base encoder.

        Returns:
            numpy array of shape (num_frames, 768).
        """
        audio, _ = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True)

        inputs = self.feature_extractor(
            audio,
            sampling_rate=SAMPLE_RATE,
            return_tensors="pt",
        )

        with torch.no_grad():
            outputs = self.model(**inputs)

        # last_hidden_state: [1, num_frames, 768]
        return outputs.last_hidden_state.squeeze(0).numpy()

    # -------------------------------------------------------------------
    # Classification
    # -------------------------------------------------------------------

    def classify(self, audio_path: str) -> List[DisfluencyEvent]:
        """
        Run wav2vec2-base → RF classifier on audio.

        Steps:
            1. Preprocess audio to 16kHz mono WAV (consistent with training)
            2. Extract 768-dim embeddings per frame (20ms per frame)
            3. Predict class per frame
            4. Apply 5-frame majority vote smoothing to reduce noise
            5. Cluster consecutive same-class frames into events
            6. Return DisfluencyEvent list with source=ML

        Args:
            audio_path: Path to audio file (any format pydub supports).

        Returns:
            List of DisfluencyEvent with source=EventSource.ML.
            Returns empty list on any failure (never crashes).
        """
        try:
            # Preprocess non-WAV formats to 16kHz mono WAV for consistent
            # embeddings.  Training used preprocessed WAVs — the m4a→librosa
            # path produces different waveforms than m4a→pydub→WAV→librosa,
            # so we must match the training pipeline.  If the input is already
            # a .wav (e.g. from the orchestrator), load it directly.
            is_wav = audio_path.lower().endswith(".wav")
            if is_wav:
                embeddings = self._extract_embeddings(audio_path)
            else:
                from pipeline.audio_preprocessing import preprocess_audio

                norm_path = preprocess_audio(audio_path)
                try:
                    embeddings = self._extract_embeddings(norm_path)
                finally:
                    try:
                        os.unlink(norm_path)
                    except OSError:
                        pass
            predictions = self.classifier.predict(embeddings)
            probabilities = self.classifier.predict_proba(embeddings)

            # 5-frame majority vote smoothing
            smoothed = self._majority_vote_smooth(predictions, window=5)

            # Cluster consecutive same-class frames into events
            events = self._cluster_to_events(smoothed, probabilities)
            return events

        except Exception as exc:
            logger.warning(f"classify() failed: {exc}")
            return []

    @staticmethod
    def _majority_vote_smooth(
        predictions: np.ndarray, window: int = 5
    ) -> np.ndarray:
        """
        Apply majority vote smoothing with a sliding window.

        Each frame's label is replaced with the most common label in
        the surrounding window. This reduces single-frame noise from
        the per-frame RF predictions.
        """
        half = window // 2
        smoothed = predictions.copy()
        for i in range(len(predictions)):
            start = max(0, i - half)
            end = min(len(predictions), i + half + 1)
            counter = Counter(predictions[start:end])
            smoothed[i] = counter.most_common(1)[0][0]
        return smoothed

    def _cluster_to_events(
        self,
        predictions: np.ndarray,
        probabilities: np.ndarray,
    ) -> List[DisfluencyEvent]:
        """
        Cluster consecutive frames with same predicted class into
        DisfluencyEvent objects.

        Frame index → time: start_ms = frame_i * 20, end_ms = frame_j * 20.
        Confidence = mean predict_proba for the predicted class across the run.
        Fluent frames are skipped (no event generated).
        """
        events: List[DisfluencyEvent] = []
        if len(predictions) == 0:
            return events

        class_names = list(self.classifier.classes_)

        def _get_prob(frame_idx: int, label: str) -> float:
            """Get predict_proba for a specific class at a specific frame."""
            if label in class_names:
                return float(probabilities[frame_idx][class_names.index(label)])
            return 0.5

        def _flush_run(
            label: str, start_f: int, end_f: int, probs: List[float]
        ):
            """Convert a run of same-label frames into a DisfluencyEvent."""
            if label == LABEL_FLUENT or label not in LABEL_TO_EVENT_TYPE:
                return
            avg_conf = float(np.mean(probs)) if probs else 0.5
            events.append(
                DisfluencyEvent(
                    type=LABEL_TO_EVENT_TYPE[label],
                    start_ms=int(start_f * FRAME_MS),
                    end_ms=int(end_f * FRAME_MS),
                    confidence=round(min(avg_conf, 1.0), 3),
                    source=EventSource.ML,
                )
            )

        current_label = predictions[0]
        start_frame = 0
        run_probs: List[float] = [_get_prob(0, current_label)]

        for i in range(1, len(predictions)):
            if predictions[i] != current_label:
                _flush_run(current_label, start_frame, i, run_probs)
                current_label = predictions[i]
                start_frame = i
                run_probs = []
            run_probs.append(_get_prob(i, current_label))

        # Flush final run
        _flush_run(current_label, start_frame, len(predictions), run_probs)

        return events


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

_classifier: Optional[DisfluencyClassifier] = None


def get_classifier() -> DisfluencyClassifier:
    """Get or create the singleton DisfluencyClassifier instance."""
    global _classifier
    if _classifier is None:
        _classifier = DisfluencyClassifier()
    return _classifier


def classify(audio_path: str) -> List[DisfluencyEvent]:
    """
    Module-level convenience — delegates to the singleton classifier.

    This is the function imported by the orchestrator:
        from pipeline.wav2vec_classifier import classify
        events = classify(norm_path)
    """
    return get_classifier().classify(audio_path)
