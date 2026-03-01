"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ChevronUp,
  Trophy,
  BarChart3,
} from "lucide-react";

import { AudioRecorder } from "@/components/recording/AudioRecorder";
import { getExercise, submitLearnSession, getCourseProgress } from "@/lib/api";
import type { CourseExercise, SessionResult } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("cadence_user_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("cadence_user_id", id);
  }
  return id;
}

// ---------------------------------------------------------------------------
// Progress dots
// ---------------------------------------------------------------------------

function ProgressDots({ filled, total = 3 }: { filled: number; total?: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${filled} of ${total} consecutive passes`}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full border-2 transition-colors ${
            i < filled
              ? "bg-green-500 border-green-500"
              : "bg-white border-gray-300"
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type PageStatus = "loading" | "ready" | "recording" | "submitting" | "result" | "error";

export default function CoursePracticePage() {
  const params = useParams();
  const router = useRouter();
  const courseType = params.courseType as string;

  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<PageStatus>("loading");
  const [exercise, setExercise] = useState<CourseExercise | null>(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load progress + exercise
  const loadExercise = useCallback(async (uid: string, level: number) => {
    try {
      const ex = await getExercise(courseType, level);
      setExercise(ex);
      setCurrentLevel(level);
      setStatus("ready");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load exercise.");
      setStatus("error");
    }
  }, [courseType]);

  useEffect(() => {
    const uid = getUserId();
    setUserId(uid);

    // Get current level from progress
    getCourseProgress(uid, courseType)
      .then((prog) => {
        const level = prog.started ? prog.current_level : 1;
        loadExercise(uid, Math.max(level, 1));
      })
      .catch(() => {
        // Not started yet — start at level 1
        loadExercise(uid, 1);
      });
  }, [courseType, loadExercise]);

  // Recording complete
  function handleRecording(b: Blob) {
    setBlob(b);
  }

  // Submit recording
  async function handleSubmit() {
    if (!blob || !exercise) return;
    setStatus("submitting");
    setError(null);
    try {
      const file = new File(
        [blob],
        `learn-${courseType}-L${currentLevel}-${Date.now()}.webm`,
        { type: blob.type },
      );
      const res = await submitLearnSession(file, courseType, userId, currentLevel);
      setResult(res);
      setCurrentLevel(res.current_level);
      setStatus("result");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Submission failed.");
      setStatus("error");
    }
  }

  // Try again — fetch a new exercise at current level
  function handleTryAgain() {
    setBlob(null);
    setResult(null);
    setStatus("loading");
    loadExercise(userId, currentLevel);
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (status === "loading") {
    return (
      <div className="space-y-4 animate-pulse" role="status" aria-label="Loading exercise">
        <div className="h-6 w-40 rounded bg-gray-100" />
        <div className="h-4 w-64 rounded bg-gray-100" />
        <div className="h-32 rounded-xl bg-gray-100" />
        <div className="h-48 rounded-xl bg-gray-100" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------------------

  if (status === "error") {
    return (
      <div className="space-y-6">
        <Link
          href="/learn"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Learn
        </Link>
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
        <button
          onClick={handleTryAgain}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Try again
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Result view
  // ---------------------------------------------------------------------------

  if (status === "result" && result) {
    return (
      <div className="space-y-6">
        {/* Back link */}
        <Link
          href="/learn"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Learn
        </Link>

        {/* Course + Level */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">
            {exercise?.course_name}
          </h1>
          <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-600">
            Level {exercise?.level}
          </span>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-6xl font-extrabold tabular-nums text-gray-900">
            {result.score.toFixed(0)}
          </p>

          {/* Pass / Fail indicator */}
          {result.passed ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              <span className="text-lg font-semibold">Passed!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-500">
              <XCircle className="h-6 w-6" aria-hidden="true" />
              <span className="text-lg font-semibold">Try again</span>
            </div>
          )}

          {/* Progress dots */}
          <ProgressDots filled={result.consecutive_passes} />
        </div>

        {/* Advancement banners */}
        {result.next_action === "ADVANCE" && (
          <div
            className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-center"
            role="status"
          >
            <div className="flex items-center justify-center gap-2 text-green-700">
              <ChevronUp className="h-5 w-5" aria-hidden="true" />
              <span className="font-semibold text-lg">
                Level Up! &rarr; Level {result.current_level}
              </span>
            </div>
          </div>
        )}

        {result.next_action === "COMPLETE" && (
          <div
            className="rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-center"
            role="status"
          >
            <div className="flex items-center justify-center gap-2 text-yellow-700">
              <Trophy className="h-5 w-5" aria-hidden="true" />
              <span className="font-semibold text-lg">Course Complete!</span>
            </div>
          </div>
        )}

        {result.next_action === "RETRY" && result.passed && (
          <p className="text-center text-sm text-blue-600 font-medium">
            Good! {result.consecutive_passes}/3 consecutive passes
          </p>
        )}

        {result.next_action === "RETRY" && !result.passed && (
          <p className="text-center text-sm text-gray-500">
            Score 80+ to pass. Keep practicing!
          </p>
        )}

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-2 text-center">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-2xl font-extrabold text-gray-900 tabular-nums">
              {result.total_disfluencies}
            </p>
            <p className="text-xs text-gray-500 mt-1">Disfluencies</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-2xl font-extrabold text-gray-900 tabular-nums">
              {result.events.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Events detected</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={handleTryAgain}
            className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            Try Again
          </button>
          <Link
            href={`/learn/${courseType}/progress`}
            className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            View Progress
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Exercise view (ready / submitting)
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/learn"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Learn
      </Link>

      {/* Course name + level badge */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">
          {exercise?.course_name}
        </h1>
        <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-600">
          Level {currentLevel}
        </span>
      </div>

      {/* Instruction */}
      <p className="text-sm text-gray-500">{exercise?.instruction}</p>

      {/* Exercise text */}
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-xl sm:text-2xl font-medium text-gray-900 leading-relaxed">
          {exercise?.exercise_text}
        </p>
        {exercise?.level_type === "speak" && (
          <p className="mt-3 text-xs text-gray-400">
            Speak naturally — there&apos;s no single right answer.
          </p>
        )}
      </div>

      {/* Audio recorder */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <AudioRecorder
          onRecordingComplete={handleRecording}
          disabled={status === "submitting"}
        />
      </div>

      {/* Submit button */}
      {blob && status === "ready" && (
        <button
          onClick={handleSubmit}
          className="w-full rounded-lg bg-gray-900 px-6 py-3 text-base font-semibold text-white hover:bg-gray-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
          aria-label="Submit recording for analysis"
        >
          Submit Recording
        </button>
      )}

      {/* Submitting */}
      {status === "submitting" && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div
            className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin"
            aria-hidden="true"
          />
          <p role="status" aria-live="polite" className="text-sm text-gray-600">
            Analyzing your recording...
          </p>
        </div>
      )}
    </div>
  );
}
