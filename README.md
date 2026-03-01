# Cadence

**Speech fluency analytics platform** — record or upload audio, get instant disfluency detection, fluency scoring, and personalized practice recommendations. Built for CheesHacks 2026.

---

## What It Does

Cadence analyzes speech in real time to detect stuttering patterns including **blocks**, **repetitions**, **prolongations**, and **filler words**. It provides:

- **Fluency Score** (0–100) with severity classification (Mild / Moderate / Moderate-Severe / Severe)
- **Disfluency event timeline** overlaid on the audio waveform
- **Word-level transcript** with highlighted problem areas
- **Speaking rate metrics** (syllables/sec, articulation rate, pace variability)
- **Personalized practice courses** that adapt to your speech patterns
- **Reading exercises** across 4 difficulty tiers + a fixed progress test
- **Session history** with score tracking over time

### Two-Tier Analysis Pipeline

| Tier | Mode | What It Does |
|------|------|-------------|
| **Tier 1** | `RULES_ONLY` | VAD silence detection, Levenshtein-based repetition matching, filler word detection, speaking rate analysis |
| **Tier 2** | `HYBRID_ML` | Everything in Tier 1 + Wav2Vec2 neural classifier + CTC phonetic transcription for sound-level repetition detection |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.11, FastAPI, SQLAlchemy + SQLite |
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| **ML / DSP** | PyTorch, Wav2Vec2, faster-whisper, librosa, scikit-learn |
| **Cloud (optional)** | Google Cloud Speech-to-Text, Cloud Storage, Firestore |
| **UI** | Framer Motion, Recharts, WaveSurfer.js, Radix UI primitives |

---

## Quick Start (Local Setup)

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** (tested on v24)
- **npm** (comes with Node.js)
- ~2 GB disk space (ML models download on first run)

### 1. Clone the Repository

```bash
git clone https://github.com/schoudhary90210/Cadence.git
cd Cadence
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate    # macOS / Linux
# venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Start the backend server
uvicorn main:app --host 0.0.0.0 --port 8000
```

The backend will:
- Create a SQLite database (`fluencylens.db`) automatically
- Download NLTK data and Whisper/Wav2Vec2 models on first startup (~1-2 min)
- Serve the API at `http://localhost:8000`

**Verify:** Open `http://localhost:8000/health` — you should see:
```json
{"status": "ok", "mode": "HYBRID_ML", "uptime": 5.2}
```

### 3. Frontend Setup

Open a **new terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Build the app
npx next build

# Start the frontend server
npx next start -p 3000
```

**Verify:** Open `http://localhost:3000` in your browser.

### 4. You're Done

Both servers should be running:
- **Backend API:** `http://localhost:8000`
- **Frontend App:** `http://localhost:3000`

---

## Environment Variables (Optional)

All environment variables have sensible defaults. You only need to set these if you want to customize behavior:

| Variable | Default | Description |
|----------|---------|-------------|
| `ANALYSIS_MODE` | `HYBRID_ML` | `RULES_ONLY` for faster analysis without ML models |
| `WHISPER_MODEL` | `base.en` | Whisper model size (`tiny.en`, `base.en`, `small.en`) |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
| `LOG_LEVEL` | `INFO` | Logging verbosity |
| `CLOUD_STT_ENABLED` | `true` | Enable Google Cloud Speech-to-Text (requires credentials) |
| `GCS_ENABLED` | `true` | Enable Google Cloud Storage (requires credentials) |
| `FIRESTORE_ENABLED` | `true` | Enable Firestore (requires credentials) |

> **Note:** Google Cloud features degrade gracefully — if credentials aren't set up, the app works fine without them using local-only processing.

---

## Project Structure

```
Cadence/
├── backend/
│   ├── main.py                  # FastAPI application + all routes
│   ├── config.py                # All tunable constants and thresholds
│   ├── requirements.txt         # Python dependencies
│   ├── pipeline/                # Analysis pipeline modules
│   │   ├── orchestrator.py      # Main pipeline coordinator
│   │   ├── audio_preprocessing.py
│   │   ├── transcription.py     # Whisper speech-to-text
│   │   ├── vad.py               # Voice Activity Detection
│   │   ├── repetition.py        # Levenshtein-based repetition detection
│   │   ├── filler.py            # Filler word detection
│   │   ├── prolongation.py      # Sound prolongation detection
│   │   ├── speaking_rate.py     # Syllable rate + pace variability
│   │   ├── scoring.py           # Composite fluency scoring
│   │   ├── wav2vec_classifier.py  # ML disfluency classifier (Tier 2)
│   │   ├── wav2vec_phonetic.py    # CTC phonetic transcription (Tier 2)
│   │   └── cloud_stt.py          # Google Cloud STT integration
│   ├── models/
│   │   └── schemas.py           # Pydantic data models (source of truth)
│   ├── db/
│   │   ├── database.py          # SQLAlchemy + SQLite setup
│   │   └── crud.py              # Database operations
│   ├── learn/
│   │   ├── courses.py           # 4 adaptive practice courses
│   │   └── progress.py          # User progress tracking
│   └── demo_samples/            # Pre-cached demo audio files
│       └── cached_results/      # Instant-return cached analysis JSONs
├── frontend/
│   ├── app/                     # Next.js App Router pages
│   │   ├── page.tsx             # Landing page
│   │   ├── analyze/page.tsx     # Record / Upload / Demo analysis
│   │   ├── results/[id]/        # Analysis results view
│   │   ├── learn/               # Adaptive learning courses
│   │   ├── practice/read/       # Reading practice (4 tiers + progress test)
│   │   ├── practice/speak/      # Conversation practice
│   │   └── history/page.tsx     # Session history + charts
│   ├── components/              # React components
│   │   ├── recording/           # AudioRecorder, FileUpload, DemoSamplePicker
│   │   ├── results/             # FluencyGauge, EventTimeline, TranscriptView
│   │   ├── practice/            # ReadingPractice component
│   │   ├── history/             # SessionList component
│   │   └── accessibility/       # AccessibilityProvider (high contrast, etc.)
│   └── lib/
│       ├── api.ts               # Typed API client
│       └── types.ts             # TypeScript types (mirrors backend schemas)
```

---

## Features In Detail

### Analysis Pipeline

1. **Audio Preprocessing** — Converts any audio format to 16kHz mono WAV
2. **Whisper Transcription** — Word-level timestamps via faster-whisper
3. **Voice Activity Detection** — Energy-based VAD with block detection (silences > 600ms mid-utterance)
4. **Repetition Detection** — Sliding window n-gram matching with Levenshtein similarity (threshold 0.85)
5. **Filler Detection** — Dictionary-based matching for "um", "uh", "like", "you know", etc.
6. **Speaking Rate** — Syllable counting via CMUDict, rolling window pace variability
7. **ML Classification** (Tier 2) — Random Forest on Wav2Vec2 embeddings, trained on SEP-28k dataset
8. **Phonetic Analysis** (Tier 2) — CTC character-level transcription for sound repetition detection
9. **Scoring** — Weighted penalty system: blocks (15pts), prolongations (12pts), sound reps (10pts), word reps (8pts), fillers (5pts)

### Practice System

- **4 Difficulty Tiers:** Easy, Medium, Hard, Ultra Hard — 8 exercises each (32 total)
- **Fixed Progress Test:** Single passage with 8 progressively harder sentences — tracked over time in History
- **Word-by-word feedback:** Green (matched), Red (missed), Orange (disfluency), Yellow (filler nearby)
- **Score tracking:** Previous attempt and all-time best per exercise, persisted in localStorage

### Learn System

- **Diagnostic Test:** Records speech, identifies primary impediment type
- **4 Adaptive Courses:** Blocks, Repetitions, Prolongations, Fillers — 5 levels each
- **Progression:** Score 80+ to pass, 3 consecutive passes to advance a level
- **Confetti celebration** on passing a level

### Accessibility

- **High Contrast Mode** — Black background, white text
- **Large Text** — 20% zoom
- **Reduce Motion** — Disables all animations and transitions
- **Text Spacing** — Normal or Relaxed (wider letter/word spacing)
- **Keyboard navigation** — Full support with visible focus indicators
- **Screen reader labels** — ARIA attributes on all interactive elements

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server status, analysis mode, uptime |
| `POST` | `/analyze` | Upload audio file for analysis (form field: `file`) |
| `GET` | `/sessions` | List all past sessions (newest first) |
| `GET` | `/sessions/{id}` | Full analysis result for a session |
| `GET` | `/sessions/date/{date}` | Sessions for a specific date (YYYY-MM-DD) |
| `GET` | `/sessions/week/{date}` | Sessions for the week starting at date |
| `GET` | `/sessions/stats` | Aggregate statistics across all sessions |
| `GET` | `/demo-samples` | List available demo audio files |
| `GET` | `/passages` | Reading practice passages |
| `GET` | `/prompts` | Conversation practice prompts |
| `GET` | `/learn/courses` | Available practice courses |
| `GET` | `/learn/exercise/{course}/{level}` | Get exercise for a course level |
| `POST` | `/learn/submit` | Submit a learn session recording |
| `GET` | `/learn/progress/{user_id}/{course}` | User progress for a course |
| `POST` | `/learn/diagnostic` | Run diagnostic test |
| `DELETE` | `/learn/progress/{user_id}` | Reset all progress for a user |

---

## Demo Samples

Three pre-cached audio samples are included for instant demo:

| Sample | Expected Score | Severity | Events |
|--------|---------------|----------|--------|
| `fluent_sample.m4a` | ~97 | Mild | 0 disfluencies |
| `stuttered_sample.m4a` | ~59 | Moderate-Severe | 5 events (blocks, repetitions, fillers) |
| `mixed_sample.m4a` | ~80 | Moderate | 1 event (block) |

These return cached results instantly — no processing delay during demos.

---

## Scoring System

| Component | Penalty (per event) |
|-----------|-------------------|
| Blocks | 15 points |
| Prolongations | 12 points |
| Sound Repetitions | 10 points |
| Word Repetitions | 8 points |
| Fillers | 5 points |
| Pace Variance | 10 points |

**Score = 100 - total penalties** (clamped to 0–100)

| Score Range | Severity |
|-------------|----------|
| 80–100 | Mild |
| 60–79 | Moderate |
| 40–59 | Moderate-Severe |
| 0–39 | Severe |

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| `ModuleNotFoundError` on backend start | Make sure you activated the venv: `source venv/bin/activate` |
| Models downloading slowly | First request downloads ~500MB of models. Subsequent requests are instant. |
| Port already in use | Kill existing processes: `lsof -ti:8000 \| xargs kill -9` |
| Frontend build fails | Delete `.next` and `node_modules`, then `npm install && npx next build` |
| CORS errors in browser | Ensure backend is running on port 8000 and frontend on port 3000 |
| Google Cloud errors | These are optional — the app works without GCP credentials |

---

## Important Notes

- Cadence is a **prototype fluency analytics tool** — not a medical diagnostic device
- Results are clinical-inspired estimates using heuristic thresholds
- Best results with clean, close-microphone audio
- English language only
- Consult a speech-language pathologist for clinical assessment

---

## Built With

- [FastAPI](https://fastapi.tiangolo.com/) — High-performance Python web framework
- [Next.js 14](https://nextjs.org/) — React framework with App Router
- [Wav2Vec2](https://huggingface.co/facebook/wav2vec2-base) — Self-supervised speech representations
- [faster-whisper](https://github.com/SYSTRAN/faster-whisper) — CTranslate2 Whisper implementation
- [librosa](https://librosa.org/) — Audio analysis library
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS
- [Framer Motion](https://www.framer.com/motion/) — Animation library
- [Recharts](https://recharts.org/) — React charting library
- [WaveSurfer.js](https://wavesurfer.xyz/) — Audio waveform visualization
