/**
 * TypeScript types — mirrors backend/models/schemas.py exactly.
 * No `any` types. Keep in sync when updating Pydantic models.
 *
 * Key conventions (match backend):
 * - All event times in MILLISECONDS (start_ms, end_ms)
 * - phonetic_transcript is null in RULES_ONLY mode
 * - w2v_classifier_ms / w2v_phonetic_ms are null in RULES_ONLY mode
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type AnalysisMode = "RULES_ONLY" | "HYBRID_ML";

export type EventType =
  | "block"
  | "repetition"
  | "prolongation"
  | "filler"
  | "interjection";

export type EventSubtype = "sound_rep" | "word_rep" | "phrase_rep";

export type EventSource = "rules" | "ml" | "phonetic" | "hybrid" | "cloud_stt";

export type SegmentType = "speech" | "silence";

export type Severity = "mild" | "moderate" | "moderate-severe" | "severe";

// ---------------------------------------------------------------------------
// Sub-types
// ---------------------------------------------------------------------------

export interface WordTimestamp {
  word: string;
  start: number;  // seconds (whisper output)
  end: number;
}

export interface Transcript {
  text: string;
  words: WordTimestamp[];
}

export interface CharTimestamp {
  char: string;
  start: number;
  end: number;
}

export interface PhoneticTranscript {
  text: string;
  characters: CharTimestamp[];
}

export interface VADSegment {
  type: SegmentType;
  start_ms: number;
  end_ms: number;
}

export interface DisfluencyEvent {
  type: EventType;
  subtype: EventSubtype | null;
  start_ms: number;
  end_ms: number;
  confidence: number;   // 0–1
  source: EventSource;
  text: string | null;
}

export interface ScoreBreakdown {
  blocks: number;
  prolongations: number;
  sound_reps: number;
  word_reps: number;
  fillers: number;
  pace: number;
}

export interface FluencyScore {
  value: number;        // 0–100
  severity: Severity;
  breakdown: ScoreBreakdown;
}

export interface AnalysisMetrics {
  speaking_rate_syl_sec: number;
  articulation_rate: number;
  pace_variability: number;
  total_disfluencies: number;
  disfluencies_per_100_syllables: number;
  total_syllables: number;
  speech_duration_sec: number;
  total_duration_sec: number;
}

export interface PipelineLatency {
  preprocessing_ms: number;
  whisper_ms: number;
  vad_ms: number;
  rules_ms: number;
  scoring_ms: number;
  total_ms: number;
  w2v_classifier_ms: number | null;
  w2v_phonetic_ms: number | null;
  cloud_stt_ms: number | null;
}

// ---------------------------------------------------------------------------
// Top-level API response
// ---------------------------------------------------------------------------

export interface AnalysisResult {
  id: string;
  mode: AnalysisMode;
  transcript: Transcript;
  phonetic_transcript: PhoneticTranscript | null;
  cloud_stt_transcript: Transcript | null;
  segments: VADSegment[];
  events: DisfluencyEvent[];
  metrics: AnalysisMetrics;
  score: FluencyScore;
  latency: PipelineLatency;
  limitations: string[];
  gcs_uri: string | null;
  created_at: string;    // ISO8601
}

export interface SessionSummary {
  id: string;
  created_at: string;
  audio_filename: string;
  mode: AnalysisMode;
  score_value: number;
  severity: Severity;
  total_disfluencies: number;
  total_duration_sec: number;
}

// ---------------------------------------------------------------------------
// Misc API
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: string;
  mode: AnalysisMode;
  uptime: number;
}

export interface DemoSample {
  filename: string;
  label: "fluent" | "stuttered" | "mixed";
  description: string;
  duration: number;
  cached: boolean;
}

export interface ApiError {
  error: string;
  detail?: string;
}

// ---------------------------------------------------------------------------
// Practice mode
// ---------------------------------------------------------------------------

export type PassageDifficulty = "easy" | "medium" | "hard";
export type PromptCategory = "casual" | "interview" | "storytelling";

export interface ReadingPassage {
  id: string;
  title: string;
  text: string;
  difficulty: PassageDifficulty;
}

export interface ConversationPrompt {
  id: string;
  prompt: string;
  category: PromptCategory;
}

// ---------------------------------------------------------------------------
// UI-only helpers
// ---------------------------------------------------------------------------

export const SEVERITY_LABELS: Record<Severity, string> = {
  mild: "Mild",
  moderate: "Moderate",
  "moderate-severe": "Moderate–Severe",
  severe: "Severe",
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  mild: "text-green-700 bg-green-50 border-green-200",
  moderate: "text-yellow-700 bg-yellow-50 border-yellow-200",
  "moderate-severe": "text-orange-700 bg-orange-50 border-orange-200",
  severe: "text-red-700 bg-red-50 border-red-200",
};

export const EVENT_COLORS: Record<EventType, string> = {
  block: "bg-red-100 text-red-800 border-red-200",
  repetition: "bg-purple-100 text-purple-800 border-purple-200",
  prolongation: "bg-orange-100 text-orange-800 border-orange-200",
  filler: "bg-gray-100 text-gray-700 border-gray-200",
  interjection: "bg-blue-100 text-blue-800 border-blue-200",
};

export const SOURCE_LABELS: Record<EventSource, string> = {
  rules: "Rule-based",
  ml: "ML classifier",
  phonetic: "Phonetic CTC",
  hybrid: "Hybrid",
  cloud_stt: "Cloud STT",
};

export const DISCLAIMER =
  "Cadence is a prototype fluency analytics tool — not a medical diagnostic device. " +
  "Results are clinical-inspired estimates using heuristic thresholds. " +
  "Consult a speech-language pathologist for clinical assessment.";
