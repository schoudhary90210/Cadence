# CLAUDE.md — FluencyLens Project Configuration

## Project Overview
FluencyLens is a browser-based speech fluency analytics platform for CheesHacks 2026 (Health & Lifestyle theme). It analyzes speech disfluencies using custom signal processing + ML, NOT LLM/chatbot wrapping.

**This is a practice/progress-tracking tool, NOT a diagnostic medical device.**
Use wording: "clinical-inspired metrics", "prototype fluency analytics", "not medical diagnosis".
NEVER claim "clinical-grade" without validation evidence.

## Repository Structure
```
fluencylens/
├── CLAUDE.md                    # This file
├── README.md                    # Setup + demo instructions
├── DEMO_SCRIPT.md              # 5-minute demo talking points
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt         # Python dependencies
│   ├── config.py                # Settings, feature flags, thresholds
│   ├── models/                  # Pydantic schemas
│   │   ├── __init__.py
│   │   └── schemas.py           # AnalysisResult, Event, Metrics, etc.
│   ├── pipeline/                # Analysis pipeline modules
│   │   ├── __init__.py
│   │   ├── orchestrator.py      # Main pipeline runner (RULES_ONLY / HYBRID_ML)
│   │   ├── audio_preprocessing.py  # Convert to 16kHz mono WAV
│   │   ├── transcription.py     # faster-whisper wrapper
│   │   ├── vad.py               # Voice Activity Detection (RMS energy)
│   │   ├── repetition.py        # Sliding window + Levenshtein detection
│   │   ├── filler.py            # Keyword filler/interjection detection
│   │   ├── speaking_rate.py     # Syllable counting + rate analysis
│   │   ├── scoring.py           # Composite fluency score
│   │   ├── wav2vec_classifier.py   # [Tier 2] Disfluency classifier
│   │   └── wav2vec_phonetic.py     # [Tier 2] CTC phonetic transcription
│   ├── db/
│   │   ├── __init__.py
│   │   ├── database.py          # SQLite + SQLAlchemy setup
│   │   └── crud.py              # Session CRUD operations
│   ├── demo_samples/            # Pre-loaded demo audio files
│   │   ├── fluent_sample.wav
│   │   ├── stuttered_sample.wav
│   │   ├── mixed_sample.wav
│   │   └── cached_results/      # Pre-computed analysis JSON per sample
│   │       ├── fluent_sample.json
│   │       ├── stuttered_sample.json
│   │       └── mixed_sample.json
│   ├── ml_cache/                # Pre-extracted embeddings (from Friday)
│   │   ├── sep28k_embeddings.npy
│   │   └── sep28k_labels.npy
│   └── tests/                   # Optional — verification checks in execution plan replace this
│       └── (created if needed)
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   ├── app/
│   │   ├── layout.tsx           # Root layout + metadata
│   │   ├── page.tsx             # Landing page (problem framing + disclaimer)
│   │   ├── analyze/
│   │   │   └── page.tsx         # Record / upload / select sample → analyze
│   │   ├── results/
│   │   │   └── [id]/
│   │   │       └── page.tsx     # Analysis results view
│   │   └── history/
│   │       └── page.tsx         # Session history with trends
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components (auto-generated)
│   │   ├── recording/
│   │   │   ├── AudioRecorder.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   └── DemoSamplePicker.tsx
│   │   ├── results/
│   │   │   ├── FluencyGauge.tsx      # Animated circular score
│   │   │   ├── SeverityBadge.tsx
│   │   │   ├── EventTimeline.tsx     # wavesurfer.js waveform + markers
│   │   │   ├── DisfluencyBreakdown.tsx  # Bar chart (recharts)
│   │   │   ├── SpeakingRateCard.tsx
│   │   │   ├── TranscriptView.tsx
│   │   │   └── JudgeMode.tsx         # Pipeline transparency panel
│   │   ├── history/
│   │   │   └── SessionList.tsx
│   │   ├── accessibility/
│   │   │   ├── HighContrastToggle.tsx
│   │   │   ├── LargeTextToggle.tsx
│   │   │   └── AccessibilityProvider.tsx
│   │   └── layout/
│   │       ├── Navbar.tsx
│   │       ├── Footer.tsx       # Privacy note here
│   │       └── MedicalDisclaimer.tsx
│   ├── lib/
│   │   ├── api.ts               # Backend API client
│   │   └── types.ts             # TypeScript types matching backend schemas
│   └── hooks/
│       └── useAnalysis.ts
└── scripts/
    └── setup.sh                 # One-command dev setup
```

**Note:** The `useAudioRecorder` logic lives inside `components/recording/AudioRecorder.tsx` as a local hook (not a separate file) because it's only used by that one component. If the designer needs to refactor it out, they can — but keeping it co-located is simpler for hackathon speed.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, wavesurfer.js, recharts, framer-motion
- **Backend**: FastAPI, Python 3.11+, faster-whisper, librosa, scipy, numpy, scikit-learn, nltk, SQLAlchemy + SQLite, pydub
- **ML (Tier 2)**: facebook/wav2vec2-base (disfluency classifier), facebook/wav2vec2-base-960h (phonetic CTC)

## Architecture: Two-Tier Pipeline

### RULES_ONLY Mode (Tier 1 — must always work)
1. Audio preprocessing → 16kHz mono WAV
2. faster-whisper → transcript + word timestamps
3. VAD → speech/silence segments (RMS energy, 25ms frames, 10ms hop)
4. Block proxy → silence > 500ms within utterance
5. Repetition detection → sliding window Levenshtein on transcript
6. Filler detection → keyword matching from transcript
7. Speaking rate → syllables/sec via CMUDict + timestamps
8. Pace variability → std(rolling 3s windows)
9. Composite score → weighted formula → 0-100 + severity band

### HYBRID_ML Mode (Tier 2 — optional enhancement)
All of Tier 1, PLUS:
10. wav2vec2-base → 768-dim embeddings → sklearn RF classifier → frame-level disfluency events
11. wav2vec2-base-960h → CTC character-level transcript → sub-word repetition/prolongation detection
12. Ensemble: merge rule-based + ML + phonetic signals with confidence weighting
13. Each event tagged: source = "rules" | "ml" | "phonetic" | "hybrid"

### Fallback Rules
- If wav2vec2-base fails to load → skip ML classifier, use RULES_ONLY
- If wav2vec2-base-960h fails to load → skip phonetic layer, use rules + classifier only
- If faster-whisper fails → return error with helpful message
- App NEVER crashes. Graceful degradation at every tier.

## API Endpoints
```
GET  /health                    → { status, mode, uptime }
POST /analyze                   → accepts audio file, returns AnalysisResult JSON
GET  /sessions                  → list all past sessions
GET  /sessions/{id}             → single session detail
GET  /demo-samples              → list bundled samples + metadata
GET  /metrics/latest            → latency/mode/pipeline summary for Judge Mode
```

## Analysis Output Schema
Every /analyze response returns:
```json
{
  "id": "uuid",
  "mode": "RULES_ONLY" | "HYBRID_ML",
  "transcript": { "text": "...", "words": [{ "word", "start", "end" }] },
  "phonetic_transcript": null | { "text": "...", "characters": [{ "char", "start", "end" }] },
  "segments": [{ "type": "speech"|"silence", "start_ms", "end_ms" }],
  "events": [{
    "type": "block"|"repetition"|"prolongation"|"filler"|"interjection",
    "subtype": "sound_rep"|"word_rep"|"phrase_rep"|null,
    "start_ms", "end_ms",
    "confidence": 0.0-1.0,
    "source": "rules"|"ml"|"phonetic"|"hybrid",
    "text": "optional matched text"
  }],
  "metrics": {
    "speaking_rate_syl_sec", "articulation_rate",
    "pace_variability", "total_disfluencies",
    "disfluencies_per_100_syllables", "total_syllables",
    "speech_duration_sec", "total_duration_sec"
  },
  "score": {
    "value": 0-100,
    "severity": "mild"|"moderate"|"moderate-severe"|"severe",
    "breakdown": { "blocks", "prolongations", "sound_reps", "word_reps", "fillers", "pace" }
  },
  "latency": {
    "preprocessing_ms", "whisper_ms", "vad_ms", "rules_ms",
    "scoring_ms", "total_ms",
    "w2v_classifier_ms": null | number,
    "w2v_phonetic_ms": null | number
  },
  "limitations": ["prototype heuristic thresholds", "noise-sensitive", "English only"],
  "created_at": "ISO timestamp"
}
```

**IMPORTANT for Pydantic schemas:**
- `phonetic_transcript` is `Optional[PhoneticTranscript] = None` — only populated in HYBRID_ML mode
- `w2v_classifier_ms` and `w2v_phonetic_ms` are `Optional[float] = None` — null in RULES_ONLY mode
- All other fields are always present regardless of mode
- Frontend TypeScript types must match: use `PhoneticTranscript | null` not required fields

## Coding Standards
- **Python**: Type hints everywhere. Pydantic models for all data. Docstrings on public functions. f-strings not .format().
- **TypeScript**: Strict mode. No `any` types. Interface for every API response.
- **DSP thresholds**: Every magic number gets a named constant in config.py with a comment explaining the value.
- **No fake functionality**: If something is mocked, label it explicitly in code AND UI.
- **Error handling**: Every external call (whisper, wav2vec2, file I/O) wrapped in try/except with user-friendly error messages.
- **Comments**: Comment all DSP logic explaining WHY, not just WHAT.

## Accessibility Requirements (Non-Negotiable)
- ARIA labels on all interactive elements
- Full keyboard navigation (tab order, Enter/Space activation)
- High contrast mode toggle (stored in localStorage)
- Large text mode toggle
- `prefers-reduced-motion` support (disable framer-motion animations)
- Screen-reader friendly results summary (sr-only text)
- Focus indicators visible on all interactive elements
- Color is never the only way to convey information (use icons/text too)

## UI Architecture for Figma Handoff
The frontend is structured for clean Figma → code workflow:
- All components in `frontend/components/` are self-contained with props interfaces
- shadcn/ui provides the base design system — Figma designer should match its patterns
- Tailwind classes are the styling layer — designer can specify exact classes
- Component props are typed in TypeScript — designer sees what data each component receives
- No business logic in components — all API calls in `lib/api.ts` and hooks

### For the UI designer (friend):
1. Pull the repo
2. The backend works independently — run `cd backend && uvicorn main:app --reload`
3. Frontend has placeholder UI that works — improve with Figma designs
4. Use Claude Code with Figma MCP to convert designs to components
5. Component files are clearly named and isolated — replace one at a time
6. Types are in `frontend/lib/types.ts` — match the data shapes
7. Test with demo samples — they return cached results instantly

## Demo Mode
3 pre-loaded samples with cached analysis JSON:
1. `fluent_sample.wav` — clean reading, score ~90+
2. `stuttered_sample.wav` — intentional blocks/repetitions, score ~40-60
3. `mixed_sample.wav` — some disfluencies, score ~70-80

When demo samples are selected, cached JSON is returned immediately (no processing delay).
Live recording/upload triggers actual pipeline analysis.

## Environment Variables
```
ANALYSIS_MODE=RULES_ONLY        # or HYBRID_ML
WHISPER_MODEL=base.en           # faster-whisper model size
WAV2VEC_CLASSIFIER_PATH=ml_cache/classifier.pkl
WAV2VEC_EMBEDDINGS_PATH=ml_cache/sep28k_embeddings.npy
DATABASE_URL=sqlite:///./fluencylens.db
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=INFO
```

## Commands
```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m nltk.downloader cmudict
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev    # starts on port 3000

# Verify backend
curl http://localhost:8000/health
curl http://localhost:8000/demo-samples
```

## Important Thresholds (config.py)
All tunable. These are starting defaults:
```python
# VAD
VAD_FRAME_MS = 25
VAD_HOP_MS = 10
VAD_ENERGY_THRESHOLD_MULTIPLIER = 0.3
SILENCE_MERGE_GAP_MS = 100
BLOCK_SILENCE_THRESHOLD_MS = 500

# Repetition
LEVENSHTEIN_THRESHOLD = 0.85
REPETITION_WINDOW_SIZES = [1, 2, 3]  # words

# Fillers
FILLER_WORDS = ["um", "uh", "erm", "like", "you know", "i mean", "ah", "hmm"]

# Speaking rate
NORMAL_RATE_MIN = 3.5  # syl/sec
NORMAL_RATE_MAX = 5.5
PACE_WINDOW_SEC = 3.0

# Scoring weights
SCORE_WEIGHTS = {
    "blocks": 15,
    "prolongations": 12,
    "sound_repetitions": 10,
    "word_repetitions": 8,
    "fillers": 5,
    "pace_variance": 10,
}

# Severity bands
SEVERITY_BANDS = {
    "mild": (80, 100),
    "moderate": (60, 80),
    "moderate-severe": (40, 60),
    "severe": (0, 40),
}
```

## Practice Mode Components (Phase 4D)

### Reading Practice
- Route: /practice/read
- Backend endpoint: GET /practice/passages → returns { id, title, text, difficulty: "easy"|"medium"|"hard" }
- Frontend: shows target paragraph, user records themselves reading it, POST /analyze, then word-by-word diff between target text and transcript. Highlight: green=matched, red=missed/stuttered, yellow=filler inserted.
- Component: frontend/components/practice/ReadingPractice.tsx
- Uses same /analyze pipeline — no backend changes to core pipeline needed.

### Conversation Practice
- Route: /practice/speak
- Backend endpoint: GET /practice/prompts → returns { id, prompt, category: "casual"|"interview"|"storytelling" }
- Frontend: shows random question (e.g. "How was your day?", "Describe your favorite hobby", "Tell me about a challenge you overcame"), user records response, POST /analyze, results emphasize filler count, speaking rate, and pace variability over score.
- Component: frontend/components/practice/ConversationPractice.tsx
- Uses same /analyze pipeline — no backend changes to core pipeline needed.

### Practice Passages (hardcoded list, no external API needed)
```python
READING_PASSAGES = [
    {"id": "easy_1", "title": "The Fox", "difficulty": "easy", "text": "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet and is commonly used for typing practice."},
    {"id": "easy_2", "title": "Weather", "difficulty": "easy", "text": "Today is a beautiful sunny day. The sky is clear and blue with a few white clouds floating by."},
    {"id": "med_1", "title": "Technology", "difficulty": "medium", "text": "Artificial intelligence has transformed how we interact with technology. From voice assistants to recommendation systems, machine learning algorithms process vast amounts of data to provide personalized experiences for millions of users worldwide."},
    {"id": "hard_1", "title": "Neuroscience", "difficulty": "hard", "text": "Neuroplasticity demonstrates the brain's remarkable capacity for reorganization throughout an individual's lifespan. Synaptic connections strengthen through repeated activation, while underutilized pathways gradually diminish, illustrating the principle that neurons which fire together wire together."},
]

CONVERSATION_PROMPTS = [
    {"id": "casual_1", "prompt": "How was your day today?", "category": "casual"},
    {"id": "casual_2", "prompt": "What did you have for breakfast this morning?", "category": "casual"},
    {"id": "casual_3", "prompt": "Describe your favorite hobby.", "category": "casual"},
    {"id": "interview_1", "prompt": "Tell me about yourself and what you do.", "category": "interview"},
    {"id": "interview_2", "prompt": "What is your greatest strength?", "category": "interview"},
    {"id": "story_1", "prompt": "Tell me about a memorable trip you took.", "category": "storytelling"},
    {"id": "story_2", "prompt": "Describe a challenge you overcame recently.", "category": "storytelling"},
]
```

## Google Cloud Integration (Phase 5.5)

### Cloud Run Deployment (backend)
- Containerize FastAPI backend with Dockerfile
- Deploy to Cloud Run (auto-scaling, HTTPS, no server management)
- Judges access from any browser — no "works on my machine"
- Set CORS_ORIGINS to include the Firebase frontend URL

### Firebase Hosting (frontend)
- Deploy Next.js static export to Firebase Hosting
- next.config.js: output: 'export' for static generation
- Free CDN, instant deployment, custom domain optional

### Cloud Speech-to-Text (optional, Phase 8.5)
- Add as second transcription source alongside faster-whisper
- Show both in Judge Mode: local vs cloud comparison
- Endpoint: POST /analyze accepts optional query param ?cloud_stt=true
- Display in Judge Mode with latency comparison

### GCP Environment Variables (add to .env.example)
```
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
CLOUD_RUN_URL=https://fluencylens-xxxx-uc.a.run.app
FIREBASE_PROJECT_ID=fluencylens-2026
```

## What NOT to Do
- Do NOT use an LLM/chatbot for analysis — this is a custom DSP + ML project
- Do NOT skip error handling — the demo must never crash
- Do NOT hardcode file paths — use config.py / env vars
- Do NOT put business logic in React components — use hooks and lib/api.ts
- Do NOT use localStorage in ways that break SSR — use client components
- Do NOT make the UI depend on HYBRID_ML — RULES_ONLY must render everything
- Do NOT claim medical diagnosis anywhere in UI or code

## Build Phase → File Mapping
This maps each execution phase to the exact files that get created. If you're working on Phase N, create ONLY these files:

### Phase 1: Scaffold
- `CLAUDE.md`, `.env.example`, `scripts/setup.sh`
- `backend/main.py` (stubs only), `backend/config.py`, `backend/requirements.txt`
- `backend/models/__init__.py`, `backend/models/schemas.py`
- `backend/pipeline/__init__.py` (empty)
- `backend/db/__init__.py`, `backend/db/database.py`, `backend/db/crud.py`
- `frontend/` (full Next.js init): `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.js`
- `frontend/app/layout.tsx`, `frontend/app/page.tsx` (placeholder)
- `frontend/app/analyze/page.tsx`, `frontend/app/results/[id]/page.tsx`, `frontend/app/history/page.tsx` (placeholders)
- `frontend/lib/types.ts`, `frontend/lib/api.ts`

### Phase 2: Pipeline Modules
- `backend/pipeline/audio_preprocessing.py`
- `backend/pipeline/transcription.py`
- `backend/pipeline/vad.py`
- `backend/pipeline/repetition.py`
- `backend/pipeline/filler.py`
- `backend/pipeline/speaking_rate.py`
- `backend/pipeline/scoring.py`

### Phase 3: Orchestrator + API
- `backend/pipeline/orchestrator.py`
- Update `backend/main.py` (implement all endpoints)
- Update `backend/db/crud.py` (implement CRUD)
- `backend/demo_samples/*.wav` (copied from prep)
- `backend/demo_samples/cached_results/*.json` (generated by pipeline)

### Phase 4: Frontend
- `frontend/components/layout/Navbar.tsx`
- `frontend/components/layout/Footer.tsx` (with privacy note)
- `frontend/components/layout/MedicalDisclaimer.tsx`
- `frontend/components/recording/AudioRecorder.tsx` (contains local useAudioRecorder logic)
- `frontend/components/recording/FileUpload.tsx`
- `frontend/components/recording/DemoSamplePicker.tsx`
- `frontend/hooks/useAnalysis.ts`
- `frontend/components/results/FluencyGauge.tsx`
- `frontend/components/results/SeverityBadge.tsx`
- `frontend/components/results/EventTimeline.tsx`
- `frontend/components/results/DisfluencyBreakdown.tsx`
- `frontend/components/results/SpeakingRateCard.tsx`
- `frontend/components/results/TranscriptView.tsx`
- Update all page.tsx files with real implementations

### Phase 5: Polish
- `frontend/components/accessibility/HighContrastToggle.tsx`
- `frontend/components/accessibility/LargeTextToggle.tsx`
- `frontend/components/accessibility/AccessibilityProvider.tsx`
- `frontend/components/history/SessionList.tsx`
- Update `frontend/app/layout.tsx` (wrap with AccessibilityProvider)

### Phase 7: ML (Tier 2)
- `backend/pipeline/wav2vec_classifier.py`
- `backend/pipeline/wav2vec_phonetic.py`
- `backend/ml_cache/classifier.pkl` (generated by training)
- Update `backend/pipeline/orchestrator.py` (add HYBRID_ML path)

### Phase 8: Judge Mode
- `frontend/components/results/JudgeMode.tsx`

### Phase 9: Ship
- `README.md`
- `DEMO_SCRIPT.md`
