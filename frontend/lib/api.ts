/**
 * Cadence API client.
 * All functions are typed, all errors are thrown as Error instances.
 * No business logic here — just typed fetch wrappers.
 */

import type {
  AnalysisResult,
  ConversationPrompt,
  DemoSample,
  HealthResponse,
  ReadingPassage,
  SessionSummary,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    let message = `API ${res.status}: ${res.statusText}`;
    try {
      const body = await res.json();
      message = body.detail ?? body.error ?? message;
    } catch {
      // ignore parse error — use status message
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/** GET /health */
export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}

/**
 * POST /analyze
 * Uploads an audio file and runs the full pipeline.
 * onProgress is called with human-readable stage labels.
 * signal — optional AbortSignal for timeout / cancellation.
 */
export async function analyzeAudio(
  file: File,
  onProgress?: (stage: string) => void,
  signal?: AbortSignal,
): Promise<AnalysisResult> {
  onProgress?.("Uploading audio…");
  const form = new FormData();
  form.append("file", file);  // backend expects field named "file"

  onProgress?.("Running analysis pipeline…");
  const result = await apiFetch<AnalysisResult>("/analyze", {
    method: "POST",
    body: form,
    signal,
  });

  onProgress?.("Complete");
  return result;
}

/** POST /demo-samples/:filename/analyze */
export async function analyzeDemoSample(
  filename: string,
): Promise<AnalysisResult> {
  return apiFetch<AnalysisResult>(`/demo-samples/${filename}/analyze`, {
    method: "POST",
  });
}

/** GET /sessions */
export async function getSessions(): Promise<SessionSummary[]> {
  return apiFetch<SessionSummary[]>("/sessions");
}

/** GET /sessions/:id */
export async function getSession(sessionId: string): Promise<AnalysisResult> {
  return apiFetch<AnalysisResult>(`/sessions/${sessionId}`);
}

/** GET /demo-samples */
export async function getDemoSamples(): Promise<DemoSample[]> {
  return apiFetch<DemoSample[]>("/demo-samples");
}

/**
 * Returns the URL for streaming a session's original audio file.
 * The URL may 404 if the session predates audio retention (added in Phase 4).
 */
export function getSessionAudioUrl(sessionId: string): string {
  return `${BASE_URL}/sessions/${sessionId}/audio`;
}

/** GET /practice/passages */
export async function getPassages(): Promise<ReadingPassage[]> {
  return apiFetch<ReadingPassage[]>("/practice/passages");
}

/** GET /practice/prompts?category= */
export async function getPrompt(category?: string): Promise<ConversationPrompt> {
  const path = category
    ? `/practice/prompts?category=${encodeURIComponent(category)}`
    : "/practice/prompts";
  return apiFetch<ConversationPrompt>(path);
}

/** GET /metrics/latest */
export async function getLatestMetrics(): Promise<{
  id: string;
  created_at: string;
  mode: AnalysisResult["mode"];
  metrics: AnalysisResult["metrics"];
  score: AnalysisResult["score"];
  latency: AnalysisResult["latency"];
}> {
  return apiFetch("/metrics/latest");
}
