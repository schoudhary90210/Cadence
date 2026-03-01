"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, ArrowLeft, Zap, Flame, Skull, Trophy, Clock, ClipboardCheck } from "lucide-react";

import { ReadingPractice } from "@/components/practice/ReadingPractice";
import { getPassages } from "@/lib/api";
import type { PassageDifficulty, ReadingPassage } from "@/lib/types";

// ---------------------------------------------------------------------------
// Difficulty tiers config (excludes progress_test — shown separately)
// ---------------------------------------------------------------------------

const TIERS: {
  key: PassageDifficulty;
  label: string;
  description: string;
  icon: typeof BookOpen;
  color: string;
  border: string;
  bg: string;
}[] = [
  {
    key: "easy",
    label: "Easy",
    description: "Short everyday sentences. Great for warming up.",
    icon: BookOpen,
    color: "text-green-600",
    border: "border-green-200",
    bg: "bg-green-50",
  },
  {
    key: "medium",
    label: "Medium",
    description: "Moderate length with some descriptive vocabulary.",
    icon: Zap,
    color: "text-yellow-600",
    border: "border-yellow-200",
    bg: "bg-yellow-50",
  },
  {
    key: "hard",
    label: "Hard",
    description: "Longer passages with complex words and abstract topics.",
    icon: Flame,
    color: "text-orange-600",
    border: "border-orange-200",
    bg: "bg-orange-50",
  },
  {
    key: "ultra_hard",
    label: "Ultra Hard",
    description: "Specialized vocabulary, long sentences, expert-level content.",
    icon: Skull,
    color: "text-red-600",
    border: "border-red-200",
    bg: "bg-red-50",
  },
];

// ---------------------------------------------------------------------------
// Difficulty badge styling
// ---------------------------------------------------------------------------

const DIFFICULTY_CLASS: Record<PassageDifficulty, string> = {
  easy: "bg-green-100 text-green-800 border border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  hard: "bg-orange-100 text-orange-800 border border-orange-200",
  ultra_hard: "bg-red-100 text-red-800 border border-red-200",
  progress_test: "bg-blue-100 text-blue-800 border border-blue-200",
};

const DIFFICULTY_LABEL: Record<PassageDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  ultra_hard: "Ultra Hard",
  progress_test: "Progress Test",
};

// ---------------------------------------------------------------------------
// Score storage helpers
// ---------------------------------------------------------------------------

interface PassageScore {
  last: number;
  best: number;
}

type ScoreMap = Record<string, PassageScore>;

const STORAGE_KEY = "cadence_reading_scores";
const PROGRESS_HISTORY_KEY = "cadence_progress_test_history";

interface ProgressHistoryEntry {
  timestamp: string;
  score: number;
}

function loadScores(): ScoreMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ScoreMap) : {};
  } catch {
    return {};
  }
}

function saveScore(passageId: string, accuracy: number): ScoreMap {
  const scores = loadScores();
  const prev = scores[passageId];
  scores[passageId] = {
    last: accuracy,
    best: prev ? Math.max(prev.best, accuracy) : accuracy,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  return scores;
}

function saveProgressTestHistory(accuracy: number) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(PROGRESS_HISTORY_KEY);
    const history: ProgressHistoryEntry[] = raw ? JSON.parse(raw) : [];
    history.push({ timestamp: new Date().toISOString(), score: accuracy });
    localStorage.setItem(PROGRESS_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

function getTierStats(scores: ScoreMap, passages: ReadingPassage[], difficulty: PassageDifficulty) {
  const ids = passages.filter((p) => p.difficulty === difficulty).map((p) => p.id);
  const entries = ids.map((id) => scores[id]).filter(Boolean);
  if (entries.length === 0) return { lastBest: null, allTimeBest: null };
  const lastBest = Math.max(...entries.map((e) => e.last));
  const allTimeBest = Math.max(...entries.map((e) => e.best));
  return { lastBest, allTimeBest };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReadingPracticePage() {
  const [passages, setPassages] = useState<ReadingPassage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<PassageDifficulty | null>(null);
  const [selectedPassage, setSelectedPassage] = useState<ReadingPassage | null>(null);
  const [scores, setScores] = useState<ScoreMap>({});

  useEffect(() => {
    setScores(loadScores());
    getPassages()
      .then(setPassages)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load passages"),
      )
      .finally(() => setLoading(false));
  }, []);

  const handleScore = useCallback((passageId: string, accuracy: number) => {
    const updated = saveScore(passageId, accuracy);
    setScores({ ...updated });

    // Also save to progress test history timeline if it's a progress test passage
    if (passageId.startsWith("progress_")) {
      saveProgressTestHistory(accuracy);
    }
  }, []);

  // Active practice session
  if (selectedPassage) {
    return (
      <ReadingPractice
        passage={selectedPassage}
        onBack={() => setSelectedPassage(null)}
        onScore={handleScore}
      />
    );
  }

  // Exercises for selected difficulty (skip for progress_test — goes straight to practice)
  if (selectedDifficulty && selectedDifficulty !== "progress_test") {
    const filtered = passages.filter((p) => p.difficulty === selectedDifficulty);
    const tier = TIERS.find((t) => t.key === selectedDifficulty)!;
    const tierLabel = tier.label;
    const tierDescription = tier.description;
    const TierIcon = tier.icon;
    const tierColor = tier.color;

    return (
      <div className="space-y-8">
        <div>
          <button
            onClick={() => setSelectedDifficulty(null)}
            className="inline-flex items-center gap-1 text-[14px] text-gray-500 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to difficulties
          </button>
          <h1 className="serif italic text-[36px] text-gray-900 flex items-center gap-3">
            <TierIcon className={`h-7 w-7 ${tierColor}`} aria-hidden="true" />
            {tierLabel} Exercises
          </h1>
          <p className="mt-2 text-[15px] text-gray-500">
            {tierDescription}
          </p>
        </div>

        <div className="space-y-3" role="list" aria-label={`${tierLabel} reading exercises`}>
          {filtered.map((p, i) => {
            const ps = scores[p.id];
            return (
              <button
                key={p.id}
                role="listitem"
                onClick={() => setSelectedPassage(p)}
                className="
                  w-full text-left glass px-5 py-4
                  hover:shadow-md transition-all
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600
                "
                aria-label={`Exercise ${i + 1}: ${p.title}`}
              >
                <div className="flex items-center gap-3 mb-1">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-[13px] font-bold text-gray-600">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-[17px] text-gray-900">{p.title}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${DIFFICULTY_CLASS[p.difficulty]}`}
                  >
                    {DIFFICULTY_LABEL[p.difficulty]}
                  </span>
                  {ps && (
                    <div className="ml-auto flex items-center gap-3 text-[12px]">
                      <span className="flex items-center gap-1 text-gray-500">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {ps.last}%
                      </span>
                      <span className="flex items-center gap-1 text-yellow-600 font-semibold">
                        <Trophy className="h-3 w-3" aria-hidden="true" />
                        {ps.best}%
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[15px] text-gray-500 line-clamp-2 ml-10">{p.text}</p>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center py-10 text-[14px] text-gray-400">
              No exercises available for this difficulty.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Difficulty selection screen
  const progressPassage = passages.find((p) => p.difficulty === "progress_test") ?? null;
  const progressStats = getTierStats(scores, passages, "progress_test");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="serif italic text-[36px] text-gray-900 flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-gray-400" aria-hidden="true" />
          Reading Practice
        </h1>
        <p className="mt-2 text-[15px] text-gray-500">
          Choose a difficulty level, then pick an exercise to read aloud.
        </p>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2" role="status" aria-label="Loading">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-36 skeleton" />
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-[14px] text-red-600">{error}</p>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              const count = passages.filter((p) => p.difficulty === tier.key).length;
              const { lastBest, allTimeBest } = getTierStats(scores, passages, tier.key);
              return (
                <button
                  key={tier.key}
                  onClick={() => setSelectedDifficulty(tier.key)}
                  className={`
                    glass p-6 text-left transition-all hover:shadow-md
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600
                    border ${tier.border}
                  `}
                  aria-label={`${tier.label} difficulty — ${count} exercises`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-11 h-11 rounded-full ${tier.bg} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${tier.color}`} aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-[17px] text-gray-900">{tier.label}</h2>
                      <p className="text-[13px] text-gray-400">{count} exercises</p>
                    </div>
                  </div>
                  <p className="text-[15px] text-gray-500 leading-relaxed">{tier.description}</p>

                  {lastBest !== null && allTimeBest !== null && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-[13px]">
                      <span className="flex items-center gap-1.5 text-gray-500">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        Previous: <span className="font-semibold text-gray-700">{lastBest}%</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-yellow-600">
                        <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                        Best: <span className="font-semibold">{allTimeBest}%</span>
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Fixed Progress Test — centered at bottom */}
          {progressPassage && (
            <div className="flex justify-center">
              <button
                onClick={() => setSelectedPassage(progressPassage)}
                className="
                  glass p-6 text-left transition-all hover:shadow-md
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600
                  border border-blue-200 w-full sm:w-[calc(50%-0.5rem)]
                "
                aria-label="Fixed Progress Test — 8 sentences"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center">
                    <ClipboardCheck className="h-5 w-5 text-blue-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[17px] text-gray-900">Fixed Progress Test</h2>
                    <p className="text-[13px] text-gray-400">8 sentences</p>
                  </div>
                </div>
                <p className="text-[15px] text-gray-500 leading-relaxed">
                  8 sentences, each one harder than the last. Track your improvement over time.
                </p>

                {progressStats.lastBest !== null && progressStats.allTimeBest !== null && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-[13px]">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      Previous: <span className="font-semibold text-gray-700">{progressStats.lastBest}%</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-yellow-600">
                      <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                      Best: <span className="font-semibold">{progressStats.allTimeBest}%</span>
                    </span>
                  </div>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
