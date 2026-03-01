"use client";

import { useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/Confetti";
import { AudioRecorder } from "@/components/recording/AudioRecorder";
import { analyzeAudio } from "@/lib/api";
import type { AnalysisResult, DisfluencyEvent, ReadingPassage, WordTimestamp } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ReadingPracticeProps {
  passage: ReadingPassage;
  onBack: () => void;
  onScore?: (passageId: string, accuracy: number) => void;
}

// ---------------------------------------------------------------------------
// Word comparison types
// ---------------------------------------------------------------------------

type WordStatus = "matched" | "missed" | "disfluent" | "filler-near";

interface WordResult {
  word: string;
  status: WordStatus;
}

// ---------------------------------------------------------------------------
// String similarity (Levenshtein)
// ---------------------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : (maxLen - levenshtein(a, b)) / maxLen;
}

function cleanWord(w: string): string {
  return w.replace(/[^a-zA-Z0-9']/g, "").toLowerCase();
}

// ---------------------------------------------------------------------------
// Greedy sequential word alignment
// ---------------------------------------------------------------------------

function compareWords(
  passageText: string,
  transcriptWords: WordTimestamp[],
  events: DisfluencyEvent[],
): WordResult[] {
  const targetTokens = passageText.split(/\s+/).filter(Boolean);
  const results: WordResult[] = [];
  let tIdx = 0;

  for (const token of targetTokens) {
    const clean = cleanWord(token);
    if (!clean) continue;

    let matched = false;
    // Look ahead up to 6 transcript words for fuzzy match
    for (let k = tIdx; k < Math.min(tIdx + 6, transcriptWords.length); k++) {
      const tw = cleanWord(transcriptWords[k].word);
      if (similarity(clean, tw) >= 0.8) {
        tIdx = k + 1;
        const wordStartMs = transcriptWords[k].start * 1000;
        const wordEndMs = transcriptWords[k].end * 1000;

        // Non-filler disfluency overlapping the word's time range
        const hasDisfluency = events.some(
          (ev) =>
            ev.type !== "filler" &&
            ev.type !== "interjection" &&
            ev.start_ms <= wordEndMs &&
            ev.end_ms >= wordStartMs,
        );

        // Filler/interjection within 1.5 s of word start
        const hasFillerNear = events.some(
          (ev) =>
            (ev.type === "filler" || ev.type === "interjection") &&
            Math.abs(ev.start_ms - wordStartMs) < 1500,
        );

        results.push({
          word: token,
          status: hasDisfluency ? "disfluent" : hasFillerNear ? "filler-near" : "matched",
        });
        matched = true;
        break;
      }
    }

    if (!matched) {
      results.push({ word: token, status: "missed" });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Styling maps
// ---------------------------------------------------------------------------

const WORD_CLASS: Record<WordStatus, string> = {
  matched:       "bg-green-100 text-green-900 ring-1 ring-green-200",
  missed:        "bg-red-100 text-red-900 ring-1 ring-red-200",
  disfluent:     "bg-orange-100 text-orange-900 ring-1 ring-orange-200",
  "filler-near": "bg-yellow-100 text-yellow-900 ring-1 ring-yellow-200",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type PracticeStatus = "idle" | "analyzing" | "done" | "error";

export function ReadingPractice({ passage, onBack, onScore }: ReadingPracticeProps) {
  const [status, setStatus]         = useState<PracticeStatus>("idle");
  const [stage, setStage]           = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [wordResults, setWordResults] = useState<WordResult[] | null>(null);
  const [rawResult, setRawResult]   = useState<AnalysisResult | null>(null);

  async function handleRecordingComplete(blob: Blob) {
    const file = new File(
      [blob],
      `reading-practice-${Date.now()}.webm`,
      { type: blob.type },
    );
    setStatus("analyzing");
    setError(null);
    try {
      const result = await analyzeAudio(file, setStage);
      const words = compareWords(passage.text, result.transcript.words, result.events);
      setWordResults(words);
      setRawResult(result);
      setStatus("done");
      setStage(null);

      // Save score
      const m = words.filter((w) => w.status === "matched").length;
      const t = words.length;
      const acc = t > 0 ? Math.round((m / t) * 100) : 0;
      onScore?.(passage.id, acc);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed. Try again.");
      setStatus("error");
      setStage(null);
    }
  }

  function handleReset() {
    setStatus("idle");
    setStage(null);
    setError(null);
    setWordResults(null);
    setRawResult(null);
  }

  const matched  = wordResults?.filter((w) => w.status === "matched").length ?? 0;
  const total    = wordResults?.length ?? 0;
  const accuracy = total > 0 ? Math.round((matched / total) * 100) : 0;

  const passed = status === "done" && accuracy >= 80;

  return (
    <div className="space-y-6">
      {passed && <Confetti />}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          aria-label="Back to passage list"
        >
          <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          Back
        </Button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{passage.title}</h2>
          <p className="text-sm text-gray-500 capitalize">{passage.difficulty} passage</p>
        </div>
      </div>

      {/* Passage / coloured results */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        {status === "done" && wordResults ? (
          <p className="text-lg leading-relaxed">
            {wordResults.map((wr, i) => (
              <span
                key={i}
                className={`inline-block mr-1 mb-1 px-1.5 py-0.5 rounded font-medium ${WORD_CLASS[wr.status]}`}
                title={wr.status}
              >
                {wr.word}
              </span>
            ))}
          </p>
        ) : (
          <p className="text-lg leading-relaxed text-gray-700">{passage.text}</p>
        )}
      </div>

      {/* Legend */}
      {status === "done" && (
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
            Matched
          </span>
          <span className="flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
            Missed
          </span>
          <span className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />
            Disfluency detected
          </span>
          <span className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-yellow-500" aria-hidden="true" />
            Filler word nearby
          </span>
        </div>
      )}

      {/* Results summary */}
      {status === "done" && rawResult && (
        <div className="grid gap-3 sm:grid-cols-3 text-center">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-3xl font-extrabold text-gray-900">{accuracy}%</p>
            <p className="text-xs text-gray-500 mt-1">Word accuracy</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-3xl font-extrabold text-gray-900">
              {rawResult.metrics.total_disfluencies}
            </p>
            <p className="text-xs text-gray-500 mt-1">Disfluency events</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-3xl font-extrabold text-gray-900">
              {rawResult.metrics.speaking_rate_syl_sec.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Syllables / sec</p>
          </div>
        </div>
      )}

      {/* Recorder */}
      {status === "idle" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500 mb-4 text-center">
            Read the passage above aloud, then click Stop when done.
          </p>
          <AudioRecorder
            onRecordingComplete={(blob) => void handleRecordingComplete(blob)}
            disabled={false}
          />
        </div>
      )}

      {/* Analyzing */}
      {status === "analyzing" && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div
            className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin"
            aria-hidden="true"
          />
          <p role="status" aria-live="polite" className="text-sm text-gray-600">
            {stage ?? "Analyzing…"}
          </p>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p role="alert" className="text-sm text-red-700">{error}</p>
          <Button variant="outline" size="sm" onClick={handleReset} className="mt-3">
            Try again
          </Button>
        </div>
      )}

      {/* Try again after done */}
      {status === "done" && (
        <div className="text-center">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
