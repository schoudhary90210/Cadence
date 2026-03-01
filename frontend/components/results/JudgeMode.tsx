"use client";

/**
 * JudgeMode — collapsible panel showing pipeline transparency.
 * Intended for hackathon judges and technical reviewers.
 */

import type { AnalysisMode, DisfluencyEvent, EventSource, PipelineLatency } from "@/lib/types";
import { SOURCE_LABELS } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props interface (exported for Figma handoff)
// ---------------------------------------------------------------------------

export interface JudgeModeProps {
  mode: AnalysisMode;
  latency: PipelineLatency;
  limitations: string[];
  events: DisfluencyEvent[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function LatencyRow({ label, ms }: { label: string; ms: number | null }) {
  if (ms === null) return null;
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono text-slate-700">{ms.toFixed(0)} ms</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JudgeMode({ mode, latency, limitations, events }: JudgeModeProps) {
  // Count events by detection source
  const sourceCounts: Record<EventSource, number> = {
    rules: 0, ml: 0, phonetic: 0, hybrid: 0,
  };
  events.forEach((e) => { sourceCounts[e.source]++; });

  return (
    <details className="group rounded-xl border border-slate-200 bg-slate-50">
      <summary
        className="flex cursor-pointer select-none items-center justify-between rounded-xl px-5 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600 focus-visible:outline-offset-2"
        aria-label="Toggle Judge Mode — Pipeline Transparency panel"
      >
        <span>⚙ Judge Mode — Pipeline Transparency</span>
        <span className="text-slate-400 text-xs font-normal group-open:hidden">Click to expand</span>
        <span className="text-slate-400 text-xs font-normal hidden group-open:inline">Click to collapse</span>
      </summary>

      <div className="px-5 pb-5 pt-2 grid gap-4 sm:grid-cols-2">

        {/* Analysis mode */}
        <div className="rounded-lg bg-white border border-slate-200 p-3 space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mode</p>
          <p className="font-mono text-sm text-slate-800">{mode}</p>
          <p className="text-xs text-slate-400">
            {mode === "RULES_ONLY"
              ? "Heuristic rules only — no ML inference"
              : "Hybrid: rules + wav2vec2 classifier + phonetic CTC"}
          </p>
        </div>

        {/* Detection sources */}
        <div className="rounded-lg bg-white border border-slate-200 p-3 space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Event Sources</p>
          {(Object.keys(sourceCounts) as EventSource[]).map((src) => (
            <div key={src} className="flex justify-between text-xs py-0.5">
              <span className="text-slate-500">{SOURCE_LABELS[src]}</span>
              <span className="font-mono text-slate-700">{sourceCounts[src]}</span>
            </div>
          ))}
        </div>

        {/* Pipeline latency */}
        <div className="rounded-lg bg-white border border-slate-200 p-3 space-y-0.5 sm:col-span-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Pipeline Latency</p>
          <LatencyRow label="Preprocessing (pydub → 16kHz WAV)" ms={latency.preprocessing_ms} />
          <LatencyRow label="Whisper ASR (faster-whisper)" ms={latency.whisper_ms} />
          <LatencyRow label="VAD (RMS energy)" ms={latency.vad_ms} />
          <LatencyRow label="Rules (reps + fillers + scoring)" ms={latency.rules_ms} />
          <LatencyRow label="Scoring" ms={latency.scoring_ms} />
          <LatencyRow label="wav2vec2 classifier" ms={latency.w2v_classifier_ms} />
          <LatencyRow label="wav2vec2 phonetic CTC" ms={latency.w2v_phonetic_ms} />
          <div className="flex justify-between text-xs py-0.5 border-t border-slate-100 mt-1 pt-1">
            <span className="font-semibold text-slate-600">Total</span>
            <span className="font-mono font-semibold text-slate-800">{latency.total_ms.toFixed(0)} ms</span>
          </div>
        </div>

        {/* Limitations */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 sm:col-span-2">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Prototype Limitations</p>
          <ul className="list-disc list-inside space-y-0.5">
            {limitations.map((l, i) => (
              <li key={i} className="text-xs text-amber-800">{l}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
