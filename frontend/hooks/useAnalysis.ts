"use client";

/**
 * useAnalysis — manages the full analysis lifecycle.
 * States: idle → uploading → analyzing → done | error
 * All API calls delegated to lib/api.ts — no fetch logic here.
 */

import { useState } from "react";
import { analyzeAudio, analyzeDemoSample as apiAnalyzeDemoSample } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types (exported for use in pages and tests)
// ---------------------------------------------------------------------------

export type AnalysisStatus = "idle" | "uploading" | "analyzing" | "done" | "error";

export interface UseAnalysisReturn {
  status: AnalysisStatus;
  stage: string | null;       // Human-readable progress label
  error: string | null;       // User-facing error message
  resultId: string | null;    // Set on success — use to redirect to /results/[id]
  analyzeFile: (file: File) => Promise<void>;
  analyzeDemoSample: (filename: string) => Promise<void>;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAnalysis(): UseAnalysisReturn {
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);

  function reset() {
    setStatus("idle");
    setStage(null);
    setError(null);
    setResultId(null);
  }

  async function analyzeFile(file: File): Promise<void> {
    setError(null);
    setResultId(null);
    setStatus("uploading");
    setStage("Uploading audio…");

    // 60-second hard timeout — FastAPI pipeline can be slow on long recordings
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 60_000);

    try {
      const result = await analyzeAudio(
        file,
        (s) => {
          setStage(s);
          // Transition state once upload is done and pipeline begins
          if (s !== "Uploading audio…") setStatus("analyzing");
        },
        controller.signal,
      );
      clearTimeout(timeoutId);
      setResultId(result.id);
      setStatus("done");
      setStage(null);
    } catch (e: unknown) {
      clearTimeout(timeoutId);
      if (e instanceof Error && e.name === "AbortError") {
        setError(
          "Analysis timed out after 60 s. The server may be busy — try a shorter recording or check your connection.",
        );
      } else {
        setError(
          e instanceof Error ? e.message : "Analysis failed. Please try again.",
        );
      }
      setStatus("error");
      setStage(null);
    }
  }

  async function analyzeDemoSample(filename: string): Promise<void> {
    setError(null);
    setResultId(null);
    setStatus("analyzing");
    setStage("Loading demo sample…");

    try {
      const result = await apiAnalyzeDemoSample(filename);
      setResultId(result.id);
      setStatus("done");
      setStage(null);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Demo analysis failed. Please try again.",
      );
      setStatus("error");
      setStage(null);
    }
  }

  return { status, stage, error, resultId, analyzeFile, analyzeDemoSample, reset };
}
