"use client";

/**
 * DemoSamplePicker — fetches GET /demo-samples and renders clickable cards.
 * Pre-computed cached samples return results in < 10ms with no pipeline delay.
 */

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { getDemoSamples } from "@/lib/api";
import type { DemoSample } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props interface (exported for Figma handoff)
// ---------------------------------------------------------------------------

export interface DemoSamplePickerProps {
  /** Called with the selected sample's filename (e.g. "fluent_sample.m4a") */
  onSampleSelected: (filename: string) => void;
  /** Disable cards — e.g. while analysis is in-flight */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Styling per sample label
// ---------------------------------------------------------------------------

const SAMPLE_STYLES: Record<string, string> = {
  fluent:
    "border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300",
  stuttered:
    "border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300",
  mixed:
    "border-orange-200 bg-orange-50 hover:bg-orange-100 hover:border-orange-300",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DemoSamplePicker({ onSampleSelected, disabled = false }: DemoSamplePickerProps) {
  const [samples, setSamples] = useState<DemoSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    getDemoSamples()
      .then(setSamples)
      .catch((e: unknown) => {
        setFetchError(
          e instanceof Error
            ? e.message
            : "Could not load demo samples. Is the backend running on port 8000?",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-12"
        role="status"
        aria-label="Loading demo samples"
      >
        <span
          className="h-6 w-6 rounded-full border-2 border-sky-500 border-t-transparent animate-spin"
          aria-hidden="true"
        />
        <span className="ml-3 text-sm text-slate-500">Loading samples…</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <p role="alert" className="text-sm text-red-600 text-center py-8">
        {fetchError}
      </p>
    );
  }

  return (
    <div
      className="grid gap-4 sm:grid-cols-3"
      role="group"
      aria-label="Demo sample options — click to analyze instantly"
    >
      {samples.map((sample) => (
        <button
          key={sample.filename}
          onClick={() => onSampleSelected(sample.filename)}
          disabled={disabled}
          aria-label={`Analyze ${sample.label} demo sample: ${sample.description}. ${sample.duration} seconds.`}
          className={`
            rounded-xl border p-5 text-left transition-all
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600
            disabled:opacity-50 disabled:cursor-not-allowed
            ${SAMPLE_STYLES[sample.label] ?? "border-slate-200 bg-slate-50 hover:bg-slate-100"}
          `}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-600">
              {sample.label}
            </span>
            {sample.cached && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                aria-label="Returns instantly from cache"
              >
                <Zap className="h-3 w-3" aria-hidden="true" />
                Instant
              </span>
            )}
          </div>
          <p className="text-sm text-slate-700 leading-snug">{sample.description}</p>
          <p className="mt-2 text-xs text-slate-400">{sample.duration}s sample</p>
        </button>
      ))}
    </div>
  );
}
