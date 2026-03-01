<div align="center">

# ~ *Cadence* ~

### Speech Fluency Analytics Platform

[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-Visit_App-blue?style=for-the-badge&logo=vercel)](https://frontend-three-rho-71.vercel.app)
[![API Status](https://img.shields.io/badge/API-Online-brightgreen?style=for-the-badge&logo=googlecloud)](https://cadence-api-qrotwdz63a-uc.a.run.app/health)
[![Built For](https://img.shields.io/badge/CheeseHacks-2026-orange?style=for-the-badge)](https://cheeshacks.com)

**Record or upload audio. Get instant disfluency detection, fluency scoring, and personalized practice recommendations.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-Wav2Vec2-EE4C2C?style=flat-square&logo=pytorch&logoColor=white)](https://pytorch.org)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![GCP](https://img.shields.io/badge/Google_Cloud-Run-4285F4?style=flat-square&logo=googlecloud&logoColor=white)](https://cloud.google.com)

---

*Built by* **Siddhant Choudhary** | **Christian Cortez** | **Anish Mantri** | **Benjamin Lelivelt**

</div>

---

## Screenshots

| Home | Analyze | Learn |
|:----:|:-------:|:-----:|
| ![Home](docs/screenshots/home.png) | ![Analyze](docs/screenshots/analyze.png) | ![Learn](docs/screenshots/learn.png) |

| Practice | History |
|:--------:|:-------:|
| ![Practice](docs/screenshots/practice.png) | ![History](docs/screenshots/history.png) |

---

## What It Does

Cadence analyzes speech in real time to detect stuttering patterns including **blocks**, **repetitions**, **prolongations**, and **filler words**. It provides:

- **Fluency Score** (0-100) with severity classification (Mild / Moderate / Moderate-Severe / Severe)
- **Disfluency event timeline** overlaid on the audio waveform
- **Word-level transcript** with highlighted problem areas
- **Speaking rate metrics** (syllables/sec, articulation rate, pace variability)
- **Personalized practice courses** that adapt to your speech patterns
- **Reading exercises** across 4 difficulty tiers + a fixed progress test
- **Session history** with score tracking over time

### Two-Tier Analysis Pipeline

| Tier | Mode | What It Does |
|:----:|:----:|:-------------|
| **1** | `RULES_ONLY` | VAD silence detection, Levenshtein-based repetition matching, filler word detection, speaking rate analysis |
| **2** | `HYBRID_ML` | Everything in Tier 1 + Wav2Vec2 neural classifier + CTC phonetic transcription for sound-level repetition detection |

---

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Backend** | Python 3.11, FastAPI, SQLAlchemy + SQLite |
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| **ML / DSP** | PyTorch, Wav2Vec2, faster-whisper, librosa, scikit-learn |
| **Cloud** | Google Cloud Speech-to-Text, Cloud Storage, Firestore, Cloud Run |
| **UI** | Framer Motion, Recharts, WaveSurfer.js, Radix UI primitives |

---

## Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** (tested on v24)
- **npm** (comes with Node.js)
- **ffmpeg** (required for audio processing)
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt install ffmpeg`
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH
- ~2 GB disk space (ML models download on first run)

### 1. Clone

```bash
git clone https://github.com/schoudhary90210/Cadence.git
cd Cadence
```

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate    # macOS / Linux
# venv\Scripts\activate     # Windows
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

> The backend auto-downloads NLTK data and Whisper/Wav2Vec2 models on first startup (~1-2 min).

**Verify:** `http://localhost:8000/health`
```json
{"status": "ok", "mode": "HYBRID_ML", "uptime": 5.2}
```

### 3. Frontend

Open a **new terminal**:

```bash
cd frontend
npm install
npx next build
npx next start -p 3000
```

**Verify:** Open `http://localhost:3000` in your browser.

### 4. Done

| Service | URL |
|:--------|:----|
| Backend API | `http://localhost:8000` |
| Frontend App | `http://localhost:3000` |

---

## Features

### Analysis Pipeline

1. **Audio Preprocessing** — Converts any audio format to 16kHz mono WAV
2. **Whisper Transcription** — Word-level timestamps via faster-whisper
3. **Voice Activity Detection** — Energy-based VAD with block detection (silences > 600ms mid-utterance)
4. **Repetition Detection** — Sliding window n-gram matching with Levenshtein similarity (threshold 0.85)
5. **Filler Detection** — Dictionary-based matching for "um", "uh", "like", "you know", etc.
6. **Speaking Rate** — Syllable counting via CMUDict, rolling window pace variability
7. **ML Classification** *(Tier 2)* — Random Forest on Wav2Vec2 embeddings, trained on SEP-28k dataset
8. **Phonetic Analysis** *(Tier 2)* — CTC character-level transcription for sound repetition detection
9. **Scoring** — Weighted penalty system: blocks (15pts), prolongations (12pts), sound reps (10pts), word reps (8pts), fillers (5pts)

### Practice System

- **4 Difficulty Tiers:** Easy, Medium, Hard, Ultra Hard — 8 exercises each (32 total)
- **Fixed Progress Test:** Single passage with 8 progressively harder sentences — tracked over time
- **Word-by-word feedback:** Green (matched), Red (missed), Orange (disfluency), Yellow (filler nearby)
- **Score tracking:** Previous attempt and all-time best per exercise

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
|:------:|:---------|:------------|
| `GET` | `/health` | Server status, analysis mode, uptime |
| `POST` | `/analyze` | Upload audio file for analysis |
| `GET` | `/sessions` | List all past sessions (newest first) |
| `GET` | `/sessions/{id}` | Full analysis result for a session |
| `GET` | `/sessions/date/{date}` | Sessions for a specific date |
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

Three pre-cached audio samples for instant demo (no processing delay):

| Sample | Score | Severity | Events |
|:-------|:-----:|:--------:|:------:|
| `fluent_sample.m4a` | ~97 | Mild | 0 |
| `stuttered_sample.m4a` | ~59 | Moderate-Severe | 5 |
| `mixed_sample.m4a` | ~80 | Moderate | 1 |

---

## Scoring System

| Component | Penalty |
|:----------|:-------:|
| Blocks | 15 pts |
| Prolongations | 12 pts |
| Sound Repetitions | 10 pts |
| Word Repetitions | 8 pts |
| Fillers | 5 pts |
| Pace Variance | 10 pts |

**Score = 100 - total penalties** (clamped to 0-100)

| Score | Severity |
|:-----:|:---------|
| 80-100 | Mild |
| 60-79 | Moderate |
| 40-59 | Moderate-Severe |
| 0-39 | Severe |

---

## Project Structure

```
Cadence/
├── backend/
│   ├── main.py                     # FastAPI application + all routes
│   ├── config.py                   # Tunable constants and thresholds
│   ├── requirements.txt            # Python dependencies
│   ├── pipeline/                   # Analysis pipeline modules
│   │   ├── orchestrator.py         # Main pipeline coordinator
│   │   ├── audio_preprocessing.py  # Format conversion
│   │   ├── transcription.py        # Whisper speech-to-text
│   │   ├── vad.py                  # Voice Activity Detection
│   │   ├── repetition.py           # Levenshtein repetition detection
│   │   ├── filler.py               # Filler word detection
│   │   ├── prolongation.py         # Sound prolongation detection
│   │   ├── speaking_rate.py        # Syllable rate + pace variability
│   │   ├── scoring.py              # Composite fluency scoring
│   │   ├── wav2vec_classifier.py   # ML disfluency classifier (Tier 2)
│   │   ├── wav2vec_phonetic.py     # CTC phonetic transcription (Tier 2)
│   │   └── cloud_stt.py            # Google Cloud STT integration
│   ├── models/
│   │   └── schemas.py              # Pydantic data models
│   ├── db/
│   │   ├── database.py             # SQLAlchemy + SQLite setup
│   │   └── crud.py                 # Database operations
│   ├── learn/
│   │   ├── courses.py              # 4 adaptive practice courses
│   │   └── progress.py             # User progress tracking
│   └── demo_samples/               # Pre-cached demo audio files
├── frontend/
│   ├── app/                        # Next.js App Router pages
│   ├── components/                 # React components
│   └── lib/                        # API client + TypeScript types
└── scripts/                        # Deployment scripts
```

---

## Troubleshooting

| Issue | Solution |
|:------|:---------|
| `ModuleNotFoundError` on backend start | Activate the venv: `source venv/bin/activate` |
| "Analysis failed" when recording/uploading | **Install ffmpeg** — `brew install ffmpeg` (macOS) or `sudo apt install ffmpeg` (Linux) |
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

[FastAPI](https://fastapi.tiangolo.com/) | [Next.js 14](https://nextjs.org/) | [Wav2Vec2](https://huggingface.co/facebook/wav2vec2-base) | [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | [librosa](https://librosa.org/) | [Tailwind CSS](https://tailwindcss.com/) | [Framer Motion](https://www.framer.com/motion/) | [Recharts](https://recharts.org/) | [WaveSurfer.js](https://wavesurfer.xyz/)

---

<div align="center">

*Made with dedication for CheeseHacks 2026 — Health & Lifestyle*

**Siddhant Choudhary** | **Christian Cortez** | **Anish Mantri** | **Benjamin Lelivelt**

</div>
