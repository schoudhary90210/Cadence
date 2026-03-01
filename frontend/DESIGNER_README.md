# Cadence — UI Designer Guide

## How to Run the Full Stack

### 1. Start the backend
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

### 2. Start the frontend (separate terminal)
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**. The backend must be running for any page that fetches data.

### Quick tip: Use demo samples for testing
The three bundled demo samples return **pre-computed cached results instantly** (< 10ms) — no model inference delay. Use them for all UI testing:

| File | Score | Severity | Events |
|------|-------|----------|--------|
| `fluent_sample.m4a` | 82.1 | mild | 2 (blocks only) |
| `stuttered_sample.m4a` | 69.0 | moderate | 5 (blocks, reps, filler) |
| `mixed_sample.m4a` | 79.8 | moderate | 5 (blocks) |

Upload any of these via the UI and results come back in under a second.

---

## Your Working Directory

**You work ONLY inside:**
```
frontend/components/designs/
```

This directory is your sandbox. Create any file you want here.

**Workflow for swapping in a redesign:**
1. Create your new component: `frontend/components/designs/FluencyGauge.tsx`
2. Find which page imports the original (see "Page → Component Map" below)
3. Change one line in the page file: swap the import path to point at your `designs/` version
4. Hot-reload shows your version immediately

**Do not touch** (these break the backend connection if modified):
- `backend/` — anything here
- `frontend/lib/api.ts` — typed API client
- `frontend/lib/types.ts` — TypeScript type definitions

---

## Page → Component Map

| Page file | Components it imports |
|-----------|----------------------|
| `app/page.tsx` | `AudioRecorder`, `FileUpload`, `DemoSamplePicker` |
| `app/analyze/page.tsx` | `AudioRecorder`, `FileUpload`, `DemoSamplePicker` |
| `app/results/[id]/page.tsx` | `FluencyGauge`, `SeverityBadge`, `EventTimeline`, `DisfluencyBreakdown`, `SpeakingRateCard`, `TranscriptView` |
| `app/history/page.tsx` | `SessionList` |

---

## Components to Redesign — Ranked by Demo Visual Impact

### Tier 1 — Lead with these in the demo

#### 1. `FluencyGauge` ⭐ (highest impact)
The hero score visualization on the results page. Judges see this first.

```tsx
// frontend/components/results/FluencyGauge.tsx
interface FluencyGaugeProps {
  score: number;           // 0–100 composite fluency score
  severity: Severity;      // "mild" | "moderate" | "moderate-severe" | "severe"
  breakdown: ScoreBreakdown; // per-category penalty points
}

// Types used:
type Severity = "mild" | "moderate" | "moderate-severe" | "severe";

interface ScoreBreakdown {
  blocks: number;         // penalty points subtracted for blocks
  prolongations: number;
  sound_reps: number;
  word_reps: number;
  fillers: number;
  pace: number;
}
```

Ideas: animated arc gauge, radial SVG, large number + severity colour ring.

---

#### 2. `EventTimeline` ⭐
Horizontal waveform-style timeline with coloured event markers. Judges love seeing where disfluencies occur in time.

```tsx
// frontend/components/results/EventTimeline.tsx
interface EventTimelineProps {
  events: DisfluencyEvent[];  // all detected disfluency events
  segments: VADSegment[];     // speech/silence regions
  totalDurationMs: number;    // full audio length in ms
}

interface DisfluencyEvent {
  type: "block" | "repetition" | "prolongation" | "filler" | "interjection";
  subtype: "sound_rep" | "word_rep" | "phrase_rep" | null;
  start_ms: number;
  end_ms: number;
  confidence: number;   // 0–1
  source: "rules" | "ml" | "phonetic" | "hybrid";
  text: string | null;
}

interface VADSegment {
  type: "speech" | "silence";
  start_ms: number;
  end_ms: number;
}
```

Ideas: SVG timeline, speech = grey bar, events = coloured blocks on top, click to see detail.

---

#### 3. Landing page / analyze page
The first impression. Should feel clinical-but-approachable. Not a component — edit `app/page.tsx` or `app/analyze/page.tsx` directly.

---

#### 4. `DisfluencyBreakdown` ⭐
Bar chart or card grid showing penalty points by category from `ScoreBreakdown`.

```tsx
// frontend/components/results/DisfluencyBreakdown.tsx
interface DisfluencyBreakdownProps {
  events: DisfluencyEvent[];    // full event list for counts
  breakdown: ScoreBreakdown;    // penalty points per category
  totalSyllables: number;       // for per-100-syl display
}
```

Ideas: horizontal bar chart, colour-coded by event type (red=blocks, purple=reps, grey=fillers).

---

#### 5. `SpeakingRateCard`
Metric card displaying rate and pace info.

```tsx
// frontend/components/results/SpeakingRateCard.tsx
interface SpeakingRateCardProps {
  metrics: AnalysisMetrics;
}

interface AnalysisMetrics {
  speaking_rate_syl_sec: number;    // syllables/sec (includes pauses)
  articulation_rate: number;        // syllables/sec (excludes pauses)
  pace_variability: number;         // std dev of rolling rate windows
  total_disfluencies: number;
  disfluencies_per_100_syllables: number;
  total_syllables: number;
  speech_duration_sec: number;
  total_duration_sec: number;
}
```

Normal range: 3.5–5.5 syl/sec. Use a colour indicator (green/yellow/red) to show if rate is in range.

---

### Tier 2 — Polish these after Tier 1

#### 6. `TranscriptView`
Word-by-word transcript with disfluency events highlighted inline.

```tsx
// frontend/components/results/TranscriptView.tsx
interface TranscriptViewProps {
  transcript: Transcript;
  events: DisfluencyEvent[];
}

interface Transcript {
  text: string;
  words: WordTimestamp[];
}

interface WordTimestamp {
  word: string;
  start: number;  // seconds
  end: number;    // seconds
}
```

Ideas: highlight words that overlap with event spans using EVENT_COLORS from `lib/types.ts`.

---

#### 7. `SeverityBadge`
Pill badge used inline and in lists.

```tsx
// frontend/components/results/SeverityBadge.tsx
interface SeverityBadgeProps {
  severity: Severity;  // "mild" | "moderate" | "moderate-severe" | "severe"
  size?: "sm" | "md" | "lg";
}
```

Color reference from `lib/types.ts`:
```ts
const SEVERITY_COLORS = {
  mild:              "text-green-700 bg-green-50 border-green-200",
  moderate:          "text-yellow-700 bg-yellow-50 border-yellow-200",
  "moderate-severe": "text-orange-700 bg-orange-50 border-orange-200",
  severe:            "text-red-700 bg-red-50 border-red-200",
};
```

---

#### 8. `AudioRecorder`
In-browser microphone recorder. Functional logic lives inside the component — only redesign the visual wrapper (button, timer display, waveform visualizer).

```tsx
// frontend/components/recording/AudioRecorder.tsx
interface AudioRecorderProps {
  onRecordingComplete: (file: File) => void;
  isAnalyzing: boolean;   // true while POST /analyze is in-flight
}
```

---

#### 9. `FileUpload`
Drag-and-drop / click upload zone.

```tsx
// frontend/components/recording/FileUpload.tsx
interface FileUploadProps {
  onFileSelected: (file: File) => void;
  isAnalyzing: boolean;
  accept?: string;  // default: ".m4a,.mp3,.wav,.webm"
}
```

---

#### 10. `DemoSamplePicker`
Card grid of the three demo samples with labels and instant-load badge.

```tsx
// frontend/components/recording/DemoSamplePicker.tsx
interface DemoSamplePickerProps {
  samples: DemoSample[];
  onSelect: (filename: string) => void;
  isAnalyzing: boolean;
}

interface DemoSample {
  filename: string;
  label: "fluent" | "stuttered" | "mixed";
  description: string;
  duration: number;    // seconds
  cached: boolean;     // show "Instant" badge when true
}
```

---

#### 11. `SessionList`
Table/card list for the history page.

```tsx
// frontend/components/history/SessionList.tsx
interface SessionListProps {
  sessions: SessionSummary[];
  onSelect: (id: string) => void;
}

interface SessionSummary {
  id: string;
  created_at: string;         // ISO8601
  audio_filename: string;
  mode: "RULES_ONLY" | "HYBRID_ML";
  score_value: number;
  severity: Severity;
  total_disfluencies: number;
  total_duration_sec: number;
}
```

---

## Colour Reference (from lib/types.ts)

```ts
// Event type colours
const EVENT_COLORS = {
  block:        "bg-red-100 text-red-800 border-red-200",
  repetition:   "bg-purple-100 text-purple-800 border-purple-200",
  prolongation: "bg-orange-100 text-orange-800 border-orange-200",
  filler:       "bg-gray-100 text-gray-700 border-gray-200",
  interjection: "bg-blue-100 text-blue-800 border-blue-200",
};
```

---

## Medical Disclaimer (required on every page)

The app must show this on all results and recording pages:

> "Cadence is a prototype fluency analytics tool — not a medical diagnostic device. Results are clinical-inspired estimates using heuristic thresholds. Consult a speech-language pathologist for clinical assessment."

The `MedicalDisclaimer` component in `components/layout/MedicalDisclaimer.tsx` handles this. You can restyle it but the text must remain unchanged.

---

## API Endpoints Reference (read-only)

| Method | Path | Returns |
|--------|------|---------|
| GET | `/health` | `{ status, mode, uptime }` |
| POST | `/analyze` | `AnalysisResult` (field: `file`) |
| GET | `/demo-samples` | `DemoSample[]` |
| POST | `/demo-samples/:filename/analyze` | `AnalysisResult` |
| GET | `/sessions` | `SessionSummary[]` |
| GET | `/sessions/:id` | `AnalysisResult` |

All responses are JSON. All event times are in **milliseconds**.
