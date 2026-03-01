/**
 * Phase 4: useAnalysis hook.
 * Wraps analyzeAudio / analyzeDemoSample with loading, error, and progress state.
 * Stub — implement in Phase 4.
 */

"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/types";

export interface UseAnalysisReturn {
  analyze: (file: File) => Promise<AnalysisResult | null>;
  analyzeDemo: (filename: string) => Promise<AnalysisResult | null>;
  loading: boolean;
  stage: string | null;
  error: string | null;
  reset: () => void;
}

export function useAnalysis(): UseAnalysisReturn {
  const [loading, setLoading] = useState(false);
  const [stage, setStage]     = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  function reset() {
    setLoading(false);
    setStage(null);
    setError(null);
  }

  async function analyze(file: File): Promise<AnalysisResult | null> {
    // TODO Phase 4: implement using lib/api.ts analyzeAudio
    throw new Error("useAnalysis.analyze not yet implemented");
  }

  async function analyzeDemo(filename: string): Promise<AnalysisResult | null> {
    // TODO Phase 4: implement using lib/api.ts analyzeDemoSample
    throw new Error("useAnalysis.analyzeDemo not yet implemented");
  }

  return { analyze, analyzeDemo, loading, stage, error, reset };
}
