"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/api";
import type { AnalysisResult, EventType } from "@/lib/types";
import {
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  EVENT_COLORS,
  SOURCE_LABELS,
  DISCLAIMER,
} from "@/lib/types";

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSession(id)
      .then(setResult)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load session.")
      );
  }, [id]);

  if (error) {
    return (
      <div className="text-center py-20 space-y-4" role="alert">
        <p className="text-red-600">{error}</p>
        <Link href="/" className="btn-secondary">← Back to home</Link>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex justify-center py-20" aria-label="Loading results" role="status">
        <div className="h-8 w-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const { metrics, score, events, segments, transcript, latency, limitations, mode } = result;
  const totalMs = result.metrics.total_duration_sec * 1000;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fluency Report</h1>
          {/* sr-only summary for screen readers */}
          <p className="sr-only">
            Score {score.value.toFixed(0)} out of 100. Severity: {SEVERITY_LABELS[score.severity]}.
            {metrics.total_disfluencies} total disfluency events detected.
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {new Date(result.created_at).toLocaleString()} ·{" "}
            {Math.round(metrics.total_duration_sec)}s ·{" "}
            <span className="font-mono text-xs bg-slate-100 px-1 rounded">{mode}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/history" className="btn-secondary">History</Link>
          <Link href="/" className="btn-primary">+ New Analysis</Link>
        </div>
      </div>

      {/* Score + Severity + Rate */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
            Fluency Score
          </p>
          <p className="text-5xl font-bold text-sky-600" aria-label={`Fluency score: ${score.value.toFixed(0)} out of 100`}>
            {score.value.toFixed(0)}
          </p>
          <p className="text-xs text-slate-400 mt-1">out of 100</p>
        </div>

        <div className="card text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
            Severity
          </p>
          <span
            role="status"
            aria-label={`Severity: ${SEVERITY_LABELS[score.severity]}`}
            className={`badge text-sm px-3 py-1 font-semibold ${SEVERITY_COLORS[score.severity]}`}
          >
            {SEVERITY_LABELS[score.severity]}
          </span>
          <p className="text-xs text-slate-400 mt-2">
            {metrics.disfluencies_per_100_syllables.toFixed(1)} disfluencies per 100 syllables
          </p>
        </div>

        <div className="card text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
            Speaking Rate
          </p>
          <p className="text-3xl font-bold text-slate-700">
            {metrics.speaking_rate_syl_sec.toFixed(1)}
          </p>
          <p className="text-xs text-slate-400 mt-1">syllables / second</p>
          <p className="text-xs text-slate-400">(normal: 3.5–5.5)</p>
        </div>
      </div>

      {/* Event counts */}
      <div className="card" aria-labelledby="breakdown-heading">
        <h2 id="breakdown-heading" className="text-sm font-semibold text-slate-700 mb-4">
          Disfluency Breakdown
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(
            [
              ["block",       "Blocks"],
              ["repetition",  "Repetitions"],
              ["prolongation","Prolongations"],
              ["filler",      "Fillers"],
              ["interjection","Interjections"],
            ] as [EventType, string][]
          ).map(([type, label]) => {
            const count = events.filter((e) => e.type === type).length;
            return (
              <div key={type} className="rounded-lg bg-slate-50 px-3 py-3 text-center">
                <span className={`badge ${EVENT_COLORS[type]} mb-1`}>{label}</span>
                <p className="text-2xl font-bold text-slate-800">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transcript */}
      <div className="card" aria-labelledby="transcript-heading">
        <h2 id="transcript-heading" className="text-sm font-semibold text-slate-700 mb-4">
          Transcript
        </h2>
        <p className="text-sm leading-relaxed text-slate-700">{transcript.text}</p>
      </div>

      {/* Event timeline */}
      <div className="card" aria-labelledby="timeline-heading">
        <h2 id="timeline-heading" className="text-sm font-semibold text-slate-700 mb-4">
          Event Timeline
        </h2>
        <div
          role="img"
          aria-label={`Timeline showing ${events.length} disfluency events over ${Math.round(metrics.total_duration_sec)} seconds`}
          className="relative h-10 rounded bg-slate-100 overflow-hidden"
        >
          {events.map((ev, i) => {
            const left  = totalMs > 0 ? (ev.start_ms / totalMs) * 100 : 0;
            const width = totalMs > 0 ? Math.max(((ev.end_ms - ev.start_ms) / totalMs) * 100, 0.5) : 0;
            const colorMap: Record<EventType, string> = {
              block:        "bg-red-400",
              repetition:   "bg-purple-400",
              prolongation: "bg-orange-400",
              filler:       "bg-gray-400",
              interjection: "bg-blue-400",
            };
            return (
              <div
                key={i}
                title={`${ev.type} @ ${(ev.start_ms / 1000).toFixed(1)}s (${SOURCE_LABELS[ev.source]})`}
                className={`absolute top-1 h-8 rounded ${colorMap[ev.type]} opacity-80`}
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1" aria-hidden="true">
          <span>0s</span>
          <span>{Math.round(metrics.total_duration_sec)}s</span>
        </div>
        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-2">
          {(["block","repetition","prolongation","filler","interjection"] as EventType[]).map((t) => (
            <span key={t} className={`badge ${EVENT_COLORS[t]}`}>{t}</span>
          ))}
        </div>
      </div>

      {/* Judge Mode — pipeline transparency */}
      <details className="card">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700 select-none">
          Judge Mode — Pipeline Transparency
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded bg-slate-50 p-3 space-y-1">
            <p className="font-semibold text-slate-600">Mode</p>
            <p className="font-mono">{mode}</p>
          </div>
          <div className="rounded bg-slate-50 p-3 space-y-1">
            <p className="font-semibold text-slate-600">Pipeline Latency</p>
            <p>Preprocessing: {latency.preprocessing_ms.toFixed(0)} ms</p>
            <p>Whisper ASR: {latency.whisper_ms.toFixed(0)} ms</p>
            <p>VAD: {latency.vad_ms.toFixed(0)} ms</p>
            <p>Rules: {latency.rules_ms.toFixed(0)} ms</p>
            <p>Scoring: {latency.scoring_ms.toFixed(0)} ms</p>
            <p className="font-semibold">Total: {latency.total_ms.toFixed(0)} ms</p>
            {latency.w2v_classifier_ms != null && (
              <p>wav2vec2 classifier: {latency.w2v_classifier_ms.toFixed(0)} ms</p>
            )}
            {latency.w2v_phonetic_ms != null && (
              <p>wav2vec2 phonetic: {latency.w2v_phonetic_ms.toFixed(0)} ms</p>
            )}
          </div>
          <div className="rounded bg-slate-50 p-3 col-span-2 space-y-1">
            <p className="font-semibold text-slate-600">Prototype Limitations</p>
            <ul className="list-disc list-inside space-y-0.5">
              {limitations.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
        </div>
      </details>

      {/* Disclaimer */}
      <div
        role="note"
        className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800"
      >
        {DISCLAIMER}
      </div>
    </div>
  );
}
