"use client";

import { useState } from "react";
import { RefreshCw, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AudioRecorder } from "@/components/recording/AudioRecorder";
import { analyzeAudio } from "@/lib/api";
import type { AnalysisResult, ConversationPrompt } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ConversationPracticeProps {
  prompt: ConversationPrompt;
  onNewQuestion: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type PracticeStatus = "idle" | "analyzing" | "done" | "error";

export function ConversationPractice({ prompt, onNewQuestion }: ConversationPracticeProps) {
  const [status, setStatus] = useState<PracticeStatus>("idle");
  const [stage, setStage]   = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function handleRecordingComplete(blob: Blob) {
    const file = new File(
      [blob],
      `conversation-practice-${Date.now()}.webm`,
      { type: blob.type },
    );
    setStatus("analyzing");
    setError(null);
    try {
      const r = await analyzeAudio(file, setStage);
      setResult(r);
      setStatus("done");
      setStage(null);
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
    setResult(null);
  }

  const fillerEvents = result?.events.filter(
    (ev) => ev.type === "filler" || ev.type === "interjection",
  ) ?? [];
  const fillerWords = fillerEvents.map((ev) => ev.text).filter(Boolean) as string[];

  const categoryLabel =
    prompt.category === "storytelling"
      ? "Storytelling"
      : prompt.category.charAt(0).toUpperCase() + prompt.category.slice(1);

  return (
    <div className="space-y-6">
      {/* Prompt card */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 border-l-4 border-l-blue-600 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2">
          {categoryLabel}
        </p>
        <p className="text-xl font-medium text-gray-900">{prompt.prompt}</p>
      </div>

      {/* New question (idle only) */}
      {status === "idle" && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewQuestion}
            aria-label="Get a different question"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Different question
          </Button>
        </div>
      )}

      {/* Recorder */}
      {status === "idle" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500 mb-4 text-center">
            Answer the question above. Speak naturally — at least 20 seconds for best results.
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

      {/* Results */}
      {status === "done" && result && (
        <div className="space-y-4">
          {/* Score grid */}
          <div className="grid gap-3 sm:grid-cols-4 text-center">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-3xl font-extrabold text-gray-900">
                {result.score.value.toFixed(0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Fluency score</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-3xl font-extrabold text-gray-900">{fillerEvents.length}</p>
              <p className="text-xs text-gray-500 mt-1">Filler words</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-3xl font-extrabold text-gray-900">
                {result.metrics.speaking_rate_syl_sec.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Syllables / sec</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-3xl font-extrabold text-gray-900">
                {result.metrics.pace_variability.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Pace variability</p>
            </div>
          </div>

          {/* Filler detail */}
          {fillerWords.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-yellow-800 mb-2">
                Filler words detected
              </p>
              <div className="flex flex-wrap gap-2">
                {fillerWords.map((word, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-yellow-200 px-2.5 py-0.5 text-xs font-medium text-yellow-900"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Transcript */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Your response
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {result.transcript.text}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
            <Button
              onClick={onNewQuestion}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              New question
            </Button>
          </div>
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
    </div>
  );
}
