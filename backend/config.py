"""
FluencyLens — all tunable constants and feature flags.
Import from this module; never hardcode magic numbers in pipeline code.
"""

import os

# ---------------------------------------------------------------------------
# Pipeline mode
# ---------------------------------------------------------------------------
ANALYSIS_MODE = os.getenv("ANALYSIS_MODE", "RULES_ONLY")  # "RULES_ONLY" | "HYBRID_ML"

# ---------------------------------------------------------------------------
# Audio
# ---------------------------------------------------------------------------
SAMPLE_RATE = 16000
MAX_AUDIO_DURATION_SEC = 300        # 5-minute hard cap
MAX_UPLOAD_SIZE_MB = 50

# ---------------------------------------------------------------------------
# VAD (Voice Activity Detection)
# All durations in milliseconds to match segment schema
# ---------------------------------------------------------------------------
VAD_FRAME_MS = 25                   # RMS frame length
VAD_HOP_MS = 10                     # frame hop
VAD_ENERGY_THRESHOLD_MULTIPLIER = 0.3  # fraction of mean RMS to call silence
SILENCE_MERGE_GAP_MS = 100          # merge silence regions closer than this
BLOCK_SILENCE_THRESHOLD_MS = 500    # silence >= this inside utterance = block event

# ---------------------------------------------------------------------------
# Repetition detection
# ---------------------------------------------------------------------------
LEVENSHTEIN_THRESHOLD = 0.85        # similarity ratio to flag as repetition
REPETITION_WINDOW_SIZES = [1, 2, 3] # word n-gram windows to check

# ---------------------------------------------------------------------------
# Filler / interjection detection
# ---------------------------------------------------------------------------
FILLER_WORDS = [
    "um", "uh", "erm", "like", "you know",
    "i mean", "ah", "hmm", "so", "right",
]

# ---------------------------------------------------------------------------
# Speaking rate
# ---------------------------------------------------------------------------
NORMAL_RATE_MIN = 3.5   # syllables/sec
NORMAL_RATE_MAX = 5.5
PACE_WINDOW_SEC = 3.0   # rolling window for pace variability

# ---------------------------------------------------------------------------
# Composite fluency score weights (penalty points per event)
# ---------------------------------------------------------------------------
SCORE_WEIGHTS = {
    "blocks": 15,
    "prolongations": 12,
    "sound_repetitions": 10,
    "word_repetitions": 8,
    "fillers": 5,
    "pace_variance": 10,
}

# ---------------------------------------------------------------------------
# Severity bands (score → label)
# ---------------------------------------------------------------------------
SEVERITY_BANDS = {
    "mild":             (80, 100),
    "moderate":         (60, 80),
    "moderate-severe":  (40, 60),
    "severe":           (0,  40),
}

# ---------------------------------------------------------------------------
# ML model paths (Tier 2 — only used in HYBRID_ML mode)
# ---------------------------------------------------------------------------
WAV2VEC_MODEL_ID = "facebook/wav2vec2-base"
WAV2VEC_ASR_MODEL_ID = "facebook/wav2vec2-base-960h"
WAV2VEC_CLASSIFIER_PATH = os.getenv(
    "WAV2VEC_CLASSIFIER_PATH", "ml_cache/classifier.pkl"
)
WAV2VEC_EMBEDDINGS_PATH = os.getenv(
    "WAV2VEC_EMBEDDINGS_PATH", "ml_cache/sep28k_embeddings.npy"
)

# ---------------------------------------------------------------------------
# Whisper
# ---------------------------------------------------------------------------
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base.en")

# ---------------------------------------------------------------------------
# Demo samples
# ---------------------------------------------------------------------------
DEMO_SAMPLES_DIR = "demo_samples"
DEMO_CACHED_RESULTS_DIR = "demo_samples/cached_results"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# ---------------------------------------------------------------------------
# Prototype disclaimer (injected into every AnalysisResult)
# ---------------------------------------------------------------------------
LIMITATIONS = [
    "Prototype heuristic thresholds — not clinically validated",
    "Noise-sensitive: best results with clean, close-mic audio",
    "English only",
    "Not a medical diagnostic tool",
]
