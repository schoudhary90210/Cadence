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

  if (selected) {
    return (
      <ReadingPractice passage={selected} onBack={() => setSelected(null)} />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="serif italic text-[36px] text-gray-900 flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-gray-400" aria-hidden="true" />
          Reading Practice
        </h1>
        <p className="mt-2 text-[15px] text-gray-500">
          Choose a passage, read it aloud, and see instant word-level feedback.
        </p>
      </div>

      {loading && (
        <div className="space-y-3" role="status" aria-label="Loading passages">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 skeleton" />
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-[14px] text-red-600">{error}</p>
      )}

      {!loading && !error && (
        <div className="space-y-3" role="list" aria-label="Available reading passages">
          {passages.map((p) => (
            <button
              key={p.id}
              role="listitem"
              onClick={() => setSelected(p)}
              className="
                w-full text-left glass px-5 py-4
                hover:shadow-md transition-all
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600
              "
              aria-label={`Start reading: ${p.title} — ${p.difficulty} difficulty`}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="font-semibold text-[17px] text-gray-900">{p.title}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[13px] font-medium capitalize ${DIFFICULTY_CLASS[p.difficulty]}`}
                >
                  {p.difficulty}
                </span>
              </div>
              <p className="text-[15px] text-gray-500 line-clamp-2">{p.text}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
