"use client";

import Link from "next/link";
import { Clock, FileAudio } from "lucide-react";

import { SeverityBadge } from "@/components/results/SeverityBadge";
import type { Severity, SessionSummary } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props interface (exported for Figma handoff)
// ---------------------------------------------------------------------------

export interface SessionListProps {
  sessions: SessionSummary[];
}

// ---------------------------------------------------------------------------
// Mini coloured score chip — no animation so many can render cheaply
// ---------------------------------------------------------------------------

const MINI_SCORE_CLASS: Record<Severity, string> = {
  mild:              "bg-green-50  text-green-700  ring-green-200",
  moderate:          "bg-yellow-50 text-yellow-700 ring-yellow-200",
  "moderate-severe": "bg-orange-50 text-orange-700 ring-orange-200",
  severe:            "bg-red-50    text-red-700    ring-red-200",
};

function MiniScore({ score, severity }: { score: number; severity: Severity }) {
  return (
    <div
      aria-hidden="true"
      className={`
        flex h-14 w-14 shrink-0 items-center justify-center
        rounded-xl ring-1 text-lg font-extrabold tabular-nums
        ${MINI_SCORE_CLASS[severity]}
      `}
    >
      {Math.round(score)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session card
// ---------------------------------------------------------------------------

export function SessionList({ sessions }: SessionListProps) {
  return (
    <div className="space-y-3" role="list" aria-label="Past analysis sessions">
      {sessions.map((s) => {
        const date    = new Date(s.created_at);
        const dateStr = date.toLocaleDateString(undefined, { dateStyle: "medium" });
        const timeStr = date.toLocaleTimeString(undefined, { timeStyle: "short" });

        return (
          <Link
            key={s.id}
            href={`/results/${s.id}`}
            role="listitem"
            aria-label={
              `Session ${dateStr} at ${timeStr}: ` +
              `fluency score ${Math.round(s.score_value)} out of 100, ` +
              `${s.severity} severity, ` +
              `${s.total_disfluencies} disfluency events. ` +
              `Click to view full report.`
            }
            className="
              flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4
              hover:border-sky-300 hover:bg-sky-50 transition-all
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600
            "
          >
            {/* Coloured score chip */}
            <MiniScore score={s.score_value} severity={s.severity} />

            {/* Session metadata */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <SeverityBadge severity={s.severity} size="sm" />
                <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                  {s.mode}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {dateStr} · {timeStr}
                </span>
                <span>{Math.round(s.total_duration_sec)} s duration</span>
                <span>{s.total_disfluencies} events</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400 truncate">
                <FileAudio className="inline h-3 w-3 mr-0.5" aria-hidden="true" />
                {s.audio_filename}
              </p>
            </div>

            {/* Chevron */}
            <span className="text-slate-300 text-xl leading-none select-none" aria-hidden="true">›</span>
          </Link>
        );
      })}
    </div>
  );
}
