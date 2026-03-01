"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";

import { ReadingPractice } from "@/components/practice/ReadingPractice";
import { getPassages } from "@/lib/api";
import type { PassageDifficulty, ReadingPassage } from "@/lib/types";

// ---------------------------------------------------------------------------
// Difficulty badge styling
// ---------------------------------------------------------------------------

const DIFFICULTY_CLASS: Record<PassageDifficulty, string> = {
  easy:   "bg-green-100 text-green-800 border border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  hard:   "bg-red-100 text-red-800 border border-red-200",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReadingPracticePage() {
  const [passages, setPassages] = useState<ReadingPassage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadingPassage | null>(null);

  useEffect(() => {
    getPassages()
      .then(setPassages)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load passages"),
      )
      .finally(() => setLoading(false));
  }, []);

  // ── Sub-page: selected passage ──────────────────────────────────────────
  if (selected) {
    return (
      <ReadingPractice passage={selected} onBack={() => setSelected(null)} />
    );
  }

  // ── Passage list ────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-violet-600" aria-hidden="true" />
          Reading Practice
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Choose a passage, read it aloud, and see instant word-level feedback.
        </p>
      </div>

      {loading && (
        <div className="space-y-3 animate-pulse" role="status" aria-label="Loading passages">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">{error}</p>
      )}

      {!loading && !error && (
        <div className="space-y-3" role="list" aria-label="Available reading passages">
          {passages.map((p) => (
            <button
              key={p.id}
              role="listitem"
              onClick={() => setSelected(p)}
              className="
                w-full text-left rounded-xl border border-slate-200 bg-white px-5 py-4
                hover:border-violet-300 hover:bg-violet-50 transition-all
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600
              "
              aria-label={`Start reading: ${p.title} — ${p.difficulty} difficulty`}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="font-semibold text-slate-900">{p.title}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${DIFFICULTY_CLASS[p.difficulty]}`}
                >
                  {p.difficulty}
                </span>
              </div>
              <p className="text-sm text-slate-500 line-clamp-2">{p.text}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
