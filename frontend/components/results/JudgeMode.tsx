"use client";

/**
 * JudgeMode — collapsible transparency panel for hackathon judges.
 *
 * Shows pipeline architecture, per-stage latency, event source breakdown,
 * model status, scoring thresholds, and limitations.
 * Distinct dark style (slate-900) with monospace numbers.
 *
 * Works with both RULES_ONLY (null ML fields) and HYBRID_ML responses.
 */

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";

import type { AnalysisResult, EventSource, EventType } from "@/lib/types";
import { SOURCE_LABELS } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface JudgeModeProps {
  result: AnalysisResult;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOURCE_BADGE_COLORS: Record<EventSource, string> = {
  rules: "bg-sky-900/60 text-sky-300 border-sky-700",
  ml: "bg-purple-900/60 text-purple-300 border-purple-700",
  phonetic: "bg-amber-900/60 text-amber-300 border-amber-700",
  hybrid: "bg-emerald-900/60 text-emerald-300 border-emerald-700",
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  block: "Block",
  repetition: "Repetition",
  prolongation: "Prolongation",
  filler: "Filler",
  interjection: "Interjection",
};

const LATENCY_COLORS: Record<string, string> = {
  preprocessing: "#64748b",
  whisper: "#0ea5e9",
  vad: "#8b5cf6",
  rules: "#f59e0b",
  scoring: "#10b981",
  classifier: "#a855f7",
  phonetic: "#f97316",
};

// Scoring weights + severity bands (mirror backend config.py)
const SCORING_CONFIG = {
  weights: {
    blocks: 15,
    prolongations: 12,
    sound_repetitions: 10,
    word_repetitions: 8,
    fillers: 5,
    pace_variance: 10,
  },
  severity_bands: {
    mild: "80–100",
    moderate: "60–80",
    "moderate-severe": "40–60",
    severe: "0–40",
  },
  vad: {
    "Frame length": "25 ms",
    "Frame hop": "10 ms",
    "Energy threshold": "0.3 × mean RMS",
    "Merge gap": "100 ms",
    "Block threshold": "≥ 750 ms",
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Section header with expand/collapse */
function SectionHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2 text-left text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-300 transition-colors py-1"
      aria-expanded={open}
    >
      {open ? (
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {title}
    </button>
  );
}

/** A single stage box in the pipeline diagram */
function StageBox({
  label,
  ms,
  active = true,
}: {
  label: string;
  ms: number | null;
  active?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-0.5 rounded border px-2.5 py-1.5 text-center min-w-[80px] ${
        active
          ? "border-slate-600 bg-slate-800 text-slate-200"
          : "border-slate-700/50 bg-slate-800/40 text-slate-500"
      }`}
    >
      <span className="text-[10px] leading-tight font-medium whitespace-nowrap">
        {label}
      </span>
      {ms !== null ? (
        <span className="font-mono text-[10px] text-sky-400">
          {ms.toFixed(0)}ms
        </span>
      ) : (
        <span className="text-[10px] text-slate-600 italic">skipped</span>
      )}
    </div>
  );
}

/** Arrow connector between pipeline stages */
function Arrow() {
  return (
    <ArrowRight
      className="h-3 w-3 text-slate-600 shrink-0"
      aria-hidden="true"
    />
  );
}

/** Source badge chip */
function SourceBadge({ source }: { source: EventSource }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${SOURCE_BADGE_COLORS[source]}`}
    >
      {SOURCE_LABELS[source]}
    </span>
  );
}

/** Model status row */
function ModelRow({
  name,
  size,
  active,
  ms,
}: {
  name: string;
  size: string;
  active: boolean;
  ms: number | null;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <div className="flex items-center gap-2">
        {active ? (
          <CheckCircle2
            className="h-3.5 w-3.5 text-emerald-400"
            aria-hidden="true"
          />
        ) : (
          <XCircle
            className="h-3.5 w-3.5 text-slate-600"
            aria-hidden="true"
          />
        )}
        <span className={active ? "text-slate-300" : "text-slate-500"}>
          {name}
        </span>
        <span className="text-slate-600 font-mono text-[10px]">{size}</span>
      </div>
      <span className="font-mono text-slate-400">
        {active && ms !== null ? `${ms.toFixed(0)} ms` : "—"}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Latency bar chart tooltip
// ---------------------------------------------------------------------------

function LatencyTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; ms: number; pct: string } }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-200">{d.name}</p>
      <p className="font-mono text-sky-400">
        {d.ms.toFixed(0)} ms ({d.pct})
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function JudgeMode({ result }: JudgeModeProps) {
  const [open, setOpen] = useState(false);
  const [thresholdsOpen, setThresholdsOpen] = useState(false);

  const { mode, latency, limitations, events } = result;
  const isHybrid = mode === "HYBRID_ML";

  // ── Event source counts ──────────────────────────────────────────────
  const sourceCounts: Record<EventSource, number> = {
    rules: 0,
    ml: 0,
    phonetic: 0,
    hybrid: 0,
  };
  events.forEach((e) => {
    sourceCounts[e.source]++;
  });

  // ── Latency bar data ────────────────────────────────────────────────
  const latencyEntries: { name: string; ms: number; color: string }[] = [
    {
      name: "Preprocessing",
      ms: latency.preprocessing_ms,
      color: LATENCY_COLORS.preprocessing,
    },
    { name: "Whisper STT", ms: latency.whisper_ms, color: LATENCY_COLORS.whisper },
    { name: "VAD", ms: latency.vad_ms, color: LATENCY_COLORS.vad },
    { name: "Rules", ms: latency.rules_ms, color: LATENCY_COLORS.rules },
    { name: "Scoring", ms: latency.scoring_ms, color: LATENCY_COLORS.scoring },
  ];
  if (latency.w2v_classifier_ms !== null) {
    latencyEntries.push({
      name: "Classifier",
      ms: latency.w2v_classifier_ms,
      color: LATENCY_COLORS.classifier,
    });
  }
  if (latency.w2v_phonetic_ms !== null) {
    latencyEntries.push({
      name: "Phonetic",
      ms: latency.w2v_phonetic_ms,
      color: LATENCY_COLORS.phonetic,
    });
  }
  const totalStageMs = latencyEntries.reduce((s, e) => s + e.ms, 0);
  const barData = latencyEntries.map((e) => ({
    ...e,
    pct: totalStageMs > 0 ? `${((e.ms / totalStageMs) * 100).toFixed(0)}%` : "0%",
  }));

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-slate-300 hover:bg-slate-800/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 focus-visible:outline-offset-[-2px]"
        aria-expanded={open}
        aria-label="Toggle Judge Mode panel"
      >
        <span className="flex items-center gap-2">
          {open ? (
            <EyeOff className="h-4 w-4 text-sky-400" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4 text-sky-400" aria-hidden="true" />
          )}
          Judge Mode
        </span>
        <span className="text-xs text-slate-500 font-normal">
          {open ? "Click to collapse" : "Pipeline transparency"}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-700 px-5 py-5 space-y-6">
          {/* ── 1. Mode Badge ───────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span
                className={`inline-flex items-center rounded-md border px-3 py-1 text-sm font-bold tracking-wide ${
                  isHybrid
                    ? "border-emerald-600 bg-emerald-900/50 text-emerald-300"
                    : "border-sky-600 bg-sky-900/50 text-sky-300"
                }`}
              >
                {mode}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isHybrid
                ? "Full pipeline: heuristic rules + wav2vec2-base RF classifier + wav2vec2-960h phonetic CTC. Events from multiple sources are merged with confidence boosting."
                : "Heuristic rules only — no ML model inference. VAD, repetition, filler, and pace analysis via signal processing."}
            </p>
          </div>

          {/* ── 2. Pipeline Architecture ────────────────────────────── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
              Pipeline Architecture
            </p>

            {/* Tier 1 flow */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <StageBox label="Audio" ms={null} active />
              <Arrow />
              <StageBox label="Preprocess" ms={latency.preprocessing_ms} />
              <Arrow />
              <StageBox label="Whisper STT" ms={latency.whisper_ms} />
              <Arrow />
              <StageBox label="VAD" ms={latency.vad_ms} />
              <Arrow />
              <StageBox label="Repetition" ms={latency.rules_ms} />
              <Arrow />
              <StageBox label="Filler" ms={null} active />
              <Arrow />
              <StageBox label="Rate" ms={null} active />
              <Arrow />
              <StageBox label="Score" ms={latency.scoring_ms} />
            </div>

            {/* Tier 2 branch (HYBRID_ML only) */}
            {isHybrid && (
              <div className="mt-3 ml-6 border-l-2 border-dashed border-slate-700 pl-4 space-y-2">
                <p className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider">
                  Tier 2 — ML Branch
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StageBox label="Audio" ms={null} active />
                  <Arrow />
                  <StageBox
                    label="wav2vec2-base"
                    ms={latency.w2v_classifier_ms}
                    active={latency.w2v_classifier_ms !== null}
                  />
                  <Arrow />
                  <StageBox
                    label="RF Classifier"
                    ms={null}
                    active={latency.w2v_classifier_ms !== null}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StageBox label="Audio" ms={null} active />
                  <Arrow />
                  <StageBox
                    label="wav2vec2-960h"
                    ms={latency.w2v_phonetic_ms}
                    active={latency.w2v_phonetic_ms !== null}
                  />
                  <Arrow />
                  <StageBox
                    label="CTC Decode"
                    ms={null}
                    active={latency.w2v_phonetic_ms !== null}
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Arrow />
                  <StageBox label="Ensemble Merge" ms={null} active />
                  <Arrow />
                  <StageBox label="Re-score" ms={null} active />
                </div>
              </div>
            )}
          </div>

          {/* ── 3. Latency Breakdown ────────────────────────────────── */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Latency Breakdown
              </p>
              <p className="font-mono text-sm font-bold text-sky-400">
                {latency.total_ms.toFixed(0)} ms total
              </p>
            </div>

            <div className="h-36" aria-label="Latency breakdown bar chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                    tickFormatter={(v: number) => `${v.toFixed(0)}`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={85}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<LatencyTooltip />}
                    cursor={{ fill: "rgba(148,163,184,0.08)" }}
                  />
                  <Bar dataKey="ms" radius={[0, 4, 4, 0]} barSize={14}>
                    {barData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── 4. Model Status ──────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Model Status
            </p>
            <div className="rounded border border-slate-700 bg-slate-800/50 divide-y divide-slate-700/50 px-3">
              <ModelRow
                name="faster-whisper"
                size="base.en ~140 MB"
                active={true}
                ms={latency.whisper_ms}
              />
              <ModelRow
                name="wav2vec2-base"
                size="~360 MB"
                active={isHybrid && latency.w2v_classifier_ms !== null}
                ms={latency.w2v_classifier_ms}
              />
              <ModelRow
                name="wav2vec2-base-960h"
                size="~360 MB"
                active={isHybrid && latency.w2v_phonetic_ms !== null}
                ms={latency.w2v_phonetic_ms}
              />
            </div>
          </div>

          {/* ── 5. Event Source Breakdown ─────────────────────────────── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Event Source Breakdown
            </p>

            {events.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                No disfluency events detected.
              </p>
            ) : (
              <>
                {/* Source counts summary */}
                <div className="flex flex-wrap gap-3 mb-3">
                  {(Object.keys(sourceCounts) as EventSource[])
                    .filter((src) => sourceCounts[src] > 0)
                    .map((src) => (
                      <div
                        key={src}
                        className="flex items-center gap-1.5"
                      >
                        <SourceBadge source={src} />
                        <span className="font-mono text-xs text-slate-400">
                          ×{sourceCounts[src]}
                        </span>
                      </div>
                    ))}
                </div>

                {/* Per-event detail list */}
                <div className="space-y-1.5">
                  {events.map((ev, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded border border-slate-700/50 bg-slate-800/40 px-3 py-1.5 text-xs"
                    >
                      <SourceBadge source={ev.source} />
                      <span className="text-slate-300 font-medium">
                        {EVENT_TYPE_LABELS[ev.type]}
                        {ev.subtype && (
                          <span className="text-slate-500 ml-1">
                            ({ev.subtype.replace("_", " ")})
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-slate-500 ml-auto">
                        {(ev.start_ms / 1000).toFixed(1)}–
                        {(ev.end_ms / 1000).toFixed(1)}s
                      </span>
                      <span className="font-mono text-sky-400/70 w-10 text-right">
                        {(ev.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── 6. Threshold Configuration ────────────────────────── */}
          <div>
            <SectionHeader
              title="Threshold Configuration"
              open={thresholdsOpen}
              onToggle={() => setThresholdsOpen(!thresholdsOpen)}
            />

            {thresholdsOpen && (
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {/* Scoring weights */}
                <div className="rounded border border-slate-700 bg-slate-800/50 p-3 space-y-1">
                  <p className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider mb-1.5">
                    Scoring Weights
                  </p>
                  {Object.entries(SCORING_CONFIG.weights).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between text-[11px] py-0.5"
                    >
                      <span className="text-slate-400">
                        {k.replace(/_/g, " ")}
                      </span>
                      <span className="font-mono text-slate-300">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Severity bands */}
                <div className="rounded border border-slate-700 bg-slate-800/50 p-3 space-y-1">
                  <p className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider mb-1.5">
                    Severity Bands
                  </p>
                  {Object.entries(SCORING_CONFIG.severity_bands).map(
                    ([k, v]) => (
                      <div
                        key={k}
                        className="flex justify-between text-[11px] py-0.5"
                      >
                        <span className="text-slate-400">{k}</span>
                        <span className="font-mono text-slate-300">{v}</span>
                      </div>
                    )
                  )}
                </div>

                {/* VAD settings */}
                <div className="rounded border border-slate-700 bg-slate-800/50 p-3 space-y-1">
                  <p className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider mb-1.5">
                    VAD Settings
                  </p>
                  {Object.entries(SCORING_CONFIG.vad).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between text-[11px] py-0.5"
                    >
                      <span className="text-slate-400">{k}</span>
                      <span className="font-mono text-slate-300">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 7. Limitations ─────────────────────────────────────── */}
          <div className="rounded border border-amber-800/40 bg-amber-950/30 p-3">
            <p className="text-[10px] font-semibold uppercase text-amber-500 tracking-wider mb-1.5">
              Prototype Limitations
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              {limitations.map((l, i) => (
                <li key={i} className="text-xs text-amber-400/80">
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
