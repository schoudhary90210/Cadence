"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, Mic2, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionList } from "@/components/history/SessionList";
import { getSessions } from "@/lib/api";
import type { SessionSummary } from "@/lib/types";

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function HistorySkeleton() {
  return (
    <div className="space-y-4 animate-pulse" role="status" aria-label="Loading session history">
      <div className="h-52 rounded-xl bg-slate-100" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score trend chart (only shown when 2+ sessions exist)
// ---------------------------------------------------------------------------

interface ChartPoint {
  label: string;
  score: number;
}

function ScoreChart({ sessions }: { sessions: SessionSummary[] }) {
  // Chart runs oldest → newest (left to right)
  const data: ChartPoint[] = [...sessions].reverse().map((s) => ({
    label: new Date(s.created_at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    score: Math.round(s.score_value),
  }));

  const latest = data[data.length - 1]?.score ?? "—";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-sky-600" aria-hidden="true" />
          Fluency score over time
        </CardTitle>
        <p className="text-xs text-slate-500">
          0–100 scale · higher is better · dashed lines show severity thresholds
        </p>
      </CardHeader>
      <CardContent>
        {/* role="img" with a text summary for screen readers */}
        <div
          className="h-52"
          role="img"
          aria-label={`Line chart showing fluency scores over ${data.length} sessions. Most recent score: ${latest} out of 100.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 48, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

              {/* Severity threshold reference lines */}
              <ReferenceLine
                y={80}
                stroke="#22c55e"
                strokeDasharray="4 4"
                label={{ value: "Mild", position: "right", fontSize: 10, fill: "#22c55e" }}
              />
              <ReferenceLine
                y={60}
                stroke="#eab308"
                strokeDasharray="4 4"
                label={{ value: "Moderate", position: "right", fontSize: 10, fill: "#ca8a04" }}
              />
              <ReferenceLine
                y={40}
                stroke="#f97316"
                strokeDasharray="4 4"
                label={{ value: "Mod–Sev", position: "right", fontSize: 10, fill: "#ea580c" }}
              />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />

              {/* Custom tooltip */}
              <Tooltip
                cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const score = payload[0]?.value as number;
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-sm">
                      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                      <p className="font-bold text-sky-600">{score} / 100</p>
                    </div>
                  );
                }}
              />

              <Line
                type="monotone"
                dataKey="score"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={{ fill: "#0ea5e9", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#0284c7", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load sessions."),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <History className="h-6 w-6 text-sky-600" aria-hidden="true" />
            Session History
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {!loading && sessions.length > 0
              ? `${sessions.length} session${sessions.length !== 1 ? "s" : ""} recorded`
              : "Your past analyses appear here."}
          </p>
        </div>
        <Link
          href="/analyze"
          className="btn-primary"
          aria-label="Go to analyze page to start a new recording"
        >
          <Mic2 className="h-4 w-4" aria-hidden="true" />
          New Analysis
        </Link>
      </div>

      {/* Loading */}
      {loading && <HistorySkeleton />}

      {/* Error */}
      {!loading && error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-20 gap-5 text-center">
          <span className="text-5xl" role="img" aria-label="Microphone">🎙️</span>
          <div className="space-y-1">
            <p className="font-semibold text-slate-700">No analyses yet</p>
            <p className="text-sm text-slate-500">
              Record or upload speech to start tracking your fluency over time.
            </p>
          </div>
          <Link
            href="/analyze"
            className="btn-primary"
            aria-label="Analyze your first recording"
          >
            Analyze your first recording
          </Link>
        </div>
      )}

      {/* Sessions: chart + list */}
      {!loading && !error && sessions.length > 0 && (
        <>
          {/* Score trend — only meaningful with 2+ data points */}
          {sessions.length >= 2 && <ScoreChart sessions={sessions} />}

          <SessionList sessions={sessions} />
        </>
      )}

    </div>
  );
}
