"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSessions } from "@/lib/api";
import type { SessionSummary } from "@/lib/types";
import { SEVERITY_LABELS, SEVERITY_COLORS } from "@/lib/types";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load sessions.")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20" role="status" aria-label="Loading sessions">
        <div className="h-8 w-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Analysis History</h1>
        <Link href="/" className="btn-primary">+ New Analysis</Link>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {!error && sessions.length === 0 && (
        <div className="card text-center py-16 space-y-4">
          <p className="text-4xl" aria-hidden="true">🎙</p>
          <p className="font-medium text-slate-600">No analyses yet.</p>
          <Link href="/" className="btn-primary">Analyze your first recording</Link>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm" aria-label="Analysis sessions">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-5 py-3">Date</th>
                <th scope="col" className="px-5 py-3">Mode</th>
                <th scope="col" className="px-5 py-3 text-right">Duration</th>
                <th scope="col" className="px-5 py-3 text-right">Score</th>
                <th scope="col" className="px-5 py-3 text-right">Events</th>
                <th scope="col" className="px-5 py-3">Severity</th>
                <th scope="col" className="px-5 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-600">
                    {new Date(s.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                      {s.mode}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-500">
                    {Math.round(s.total_duration_sec)}s
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-sky-600">
                    {s.score_value.toFixed(0)}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-500">
                    {s.total_disfluencies}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`badge ${SEVERITY_COLORS[s.severity]}`}>
                      {SEVERITY_LABELS[s.severity]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/results/${s.id}`}
                      className="text-sky-600 hover:underline font-medium focus-ring rounded"
                      aria-label={`View results from ${new Date(s.created_at).toLocaleString()}`}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
