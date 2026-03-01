"""
Cadence — all tunable constants and feature flags.
Import from this module; never hardcode magic numbers in pipeline code.
"""

import os

# ---------------------------------------------------------------------------
# Pipeline mode
# ---------------------------------------------------------------------------
ANALYSIS_MODE = os.getenv("ANALYSIS_MODE", "HYBRID_ML")  # "RULES_ONLY" | "HYBRID_ML"

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
BLOCK_SILENCE_THRESHOLD_MS = 750    # silence >= this inside utterance = block event.
                                    # Natural prosody pauses (sentence breaks, commas,
                                    # breath groups) typically run 400–600 ms and are NOT
                                    # blocks. Clinical literature puts real stuttering
                                    # blocks at 750 ms+, so we sit at that boundary.

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
# Audio file storage
# ---------------------------------------------------------------------------
AUDIO_UPLOADS_DIR = os.getenv("AUDIO_UPLOADS_DIR", "audio_uploads")

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# ---------------------------------------------------------------------------
# Practice mode — reading passages and conversation prompts
# ---------------------------------------------------------------------------

READING_PASSAGES = [
    {
        "id": "easy_1",
        "title": "The Fox",
        "difficulty": "easy",
        "text": (
            "The quick brown fox jumps over the lazy dog. "
            "This sentence contains every letter of the alphabet "
            "and is commonly used for typing practice."
        ),
    },
    {
        "id": "easy_2",
        "title": "Weather",
        "difficulty": "easy",
        "text": (
            "Today is a beautiful sunny day. "
            "The sky is clear and blue with a few white clouds floating by."
        ),
    },
    {
        "id": "med_1",
        "title": "Technology",
        "difficulty": "medium",
        "text": (
            "Artificial intelligence has transformed how we interact with technology. "
            "From voice assistants to recommendation systems, machine learning algorithms "
            "process vast amounts of data to provide personalized experiences "
            "for millions of users worldwide."
        ),
    },
    {
        "id": "hard_1",
        "title": "Neuroscience",
        "difficulty": "hard",
        "text": (
            "Neuroplasticity demonstrates the brain's remarkable capacity for reorganization "
            "throughout an individual's lifespan. Synaptic connections strengthen through "
            "repeated activation, while underutilized pathways gradually diminish, "
            "illustrating the principle that neurons which fire together wire together."
        ),
    },
]

CONVERSATION_PROMPTS = [
    {"id": "casual_1",    "prompt": "How was your day today?",                          "category": "casual"},
    {"id": "casual_2",    "prompt": "What did you have for breakfast this morning?",    "category": "casual"},
    {"id": "casual_3",    "prompt": "Describe your favorite hobby.",                    "category": "casual"},
    {"id": "interview_1", "prompt": "Tell me about yourself and what you do.",          "category": "interview"},
    {"id": "interview_2", "prompt": "What is your greatest strength?",                  "category": "interview"},
    {"id": "story_1",     "prompt": "Tell me about a memorable trip you took.",         "category": "storytelling"},
    {"id": "story_2",     "prompt": "Describe a challenge you overcame recently.",      "category": "storytelling"},
]

# ---------------------------------------------------------------------------
# Prototype disclaimer (injected into every AnalysisResult)
# ---------------------------------------------------------------------------
LIMITATIONS = [
    "Prototype heuristic thresholds — not clinically validated",
    "Noise-sensitive: best results with clean, close-mic audio",
    "English only",
    "Not a medical diagnostic tool",
]
