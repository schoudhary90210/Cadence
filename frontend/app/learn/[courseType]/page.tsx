"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ChevronUp,
  Trophy,
  BarChart3,
  RotateCcw,
} from "lucide-react";

import { AudioRecorder } from "@/components/recording/AudioRecorder";
import { Confetti } from "@/components/Confetti";
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

type PageStatus = "loading" | "ready" | "submitting" | "result" | "error";

export default function CoursePracticePage() {
  const params = useParams();
  const courseType = params.courseType as string;

  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<PageStatus>("loading");
  const [exercise, setExercise] = useState<CourseExercise | null>(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [courseName, setCourseName] = useState("");
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const loadExercise = useCallback(async (uid: string, level: number) => {
    try {
      const ex = await getExercise(courseType, level);
      setExercise(ex);
      setCurrentLevel(level);
      setCourseName(ex.course_name);
      setBlob(null);
      setResult(null);
      setStatus("ready");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load exercise.");
      setStatus("error");
    }
  }, [courseType]);

  useEffect(() => {
    const uid = getUserId();
    setUserId(uid);

    getCourseProgress(uid, courseType)
      .then((prog) => {
        const level = prog.started ? prog.current_level : 1;
        loadExercise(uid, Math.max(level, 1));
      })
      .catch(() => {
        loadExercise(uid, 1);
      });
  }, [courseType, loadExercise]);

  function handleRecording(b: Blob) {
    setBlob(b);
  }

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

      if (res.next_action === "ADVANCE") {
        advanceTimerRef.current = setTimeout(() => {
          loadExercise(userId, res.current_level);
        }, 2500);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Submission failed.");
      setStatus("error");
    }
  }

  function handleTryAgain() {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setStatus("loading");
    loadExercise(userId, currentLevel);
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (status === "loading") {
    return (
      <div className="space-y-4" role="status" aria-label="Loading exercise">
        <div className="h-6 w-40 skeleton" />
        <div className="h-4 w-64 skeleton" />
        <div className="h-32 skeleton" />
        <div className="h-48 skeleton" />
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
          className="inline-flex items-center gap-1 text-[14px] text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Learn
        </Link>
        <div role="alert" className="glass px-5 py-3 text-[14px] text-red-600" style={{ borderColor: "rgba(239, 68, 68, 0.2)" }}>
          {error}
        </div>
        <button
          onClick={handleTryAgain}
          className="rounded-full border border-gray-200 px-5 py-2.5 text-[14px] font-medium text-gray-700 hover:bg-gray-50"
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
    const isComplete = result.next_action === "COMPLETE";
    const isAdvance = result.next_action === "ADVANCE";

    return (
      <div className="space-y-6">
        {/* Confetti on pass */}
        {result.passed && <Confetti />}

        <Link
          href="/learn"
          className="inline-flex items-center gap-1 text-[14px] text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Learn
        </Link>

        <div className="flex items-center gap-3">
          <h1 className="serif italic text-[28px] text-gray-900">
            {courseName}
          </h1>
          <span className="glass px-3 py-1 text-[13px] font-medium text-gray-600">
            Level {exercise?.level}
          </span>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="serif italic text-[72px] leading-none tabular-nums text-gray-900">
            {result.score.toFixed(0)}
          </p>

          {result.passed ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              <span className="text-[17px] font-semibold">Passed!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-500">
              <XCircle className="h-6 w-6" aria-hidden="true" />
              <span className="text-[17px] font-semibold">Try again</span>
            </div>
          )}

          <ProgressDots filled={result.consecutive_passes} />
        </div>

        {/* ADVANCE banner */}
        {isAdvance && (
          <div className="glass px-5 py-4 text-center" role="status" style={{ borderColor: "rgba(34, 197, 94, 0.2)" }}>
            <div className="flex items-center justify-center gap-2 text-green-700">
              <ChevronUp className="h-5 w-5" aria-hidden="true" />
              <span className="font-semibold text-[17px]">
                Level Up! {"\u2192"} Level {result.current_level}
              </span>
            </div>
            <p className="text-[14px] text-green-600 mt-1">Loading next level...</p>
          </div>
        )}

        {/* COMPLETE banner */}
        {isComplete && (
          <div className="glass px-5 py-4 text-center" role="status" style={{ borderColor: "rgba(234, 179, 8, 0.2)" }}>
            <div className="flex items-center justify-center gap-2 text-yellow-700">
              <Trophy className="h-5 w-5" aria-hidden="true" />
              <span className="font-semibold text-[17px]">Course Complete!</span>
            </div>
            <p className="text-[14px] text-yellow-600 mt-1">
              You&apos;ve mastered all 5 levels. Amazing work!
            </p>
          </div>
        )}

        {/* RETRY passed */}
        {result.next_action === "RETRY" && result.passed && (
          <p className="text-center text-[14px] text-blue-600 font-medium">
            Good! {result.consecutive_passes}/3 consecutive passes
          </p>
        )}

        {/* RETRY failed */}
        {result.next_action === "RETRY" && !result.passed && (
          <p className="text-center text-[14px] text-gray-500">
            Score 80+ to pass. Keep practicing!
          </p>
        )}

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-2 text-center">
          <div className="glass p-4">
            <p className="serif italic text-[28px] text-gray-900 tabular-nums">
              {result.total_disfluencies}
            </p>
            <p className="text-[13px] text-gray-500 mt-1">Disfluencies</p>
          </div>
          <div className="glass p-4">
            <p className="serif italic text-[28px] text-gray-900 tabular-nums">
              {result.events.length}
            </p>
            <p className="text-[13px] text-gray-500 mt-1">Events detected</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center pt-2">
          {!isComplete && !isAdvance && (
            <button
              onClick={handleTryAgain}
              className="rounded-full border border-gray-200 px-5 py-2.5 text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try Again
            </button>
          )}
          {isAdvance && (
            <button
              onClick={handleTryAgain}
              className="rounded-full bg-green-600 px-5 py-2.5 text-[15px] font-medium text-white hover:bg-green-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 flex items-center gap-2"
            >
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
              Go to Level {result.current_level}
            </button>
          )}
          {isComplete && (
            <Link
              href="/learn"
              className="rounded-full bg-gray-900 px-5 py-2.5 text-[15px] font-medium text-white hover:bg-gray-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              Back to Learn
            </Link>
          )}
          <Link
            href={`/learn/${courseType}/progress`}
            className="rounded-full border border-gray-200 px-5 py-2.5 text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 flex items-center gap-2"
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
      <Link
        href="/learn"
        className="inline-flex items-center gap-1 text-[14px] text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Learn
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="serif italic text-[28px] text-gray-900">
          {courseName}
        </h1>
        <span className="glass px-3 py-1 text-[13px] font-medium text-gray-600">
          Level {currentLevel}
        </span>
      </div>

      <p className="text-[15px] text-gray-500">{exercise?.instruction}</p>

      <div className="glass p-8 text-center">
        <p className="text-[22px] sm:text-[26px] font-medium text-gray-900 leading-relaxed">
          {exercise?.exercise_text}
        </p>
        {exercise?.level_type === "speak" && (
          <p className="mt-3 text-[13px] text-gray-400">
            Speak naturally — there&apos;s no single right answer.
          </p>
        )}
      </div>

      <div className="glass p-6">
        <AudioRecorder
          onRecordingComplete={handleRecording}
          disabled={status === "submitting"}
        />
      </div>

      {blob && status === "ready" && (
        <button
          onClick={handleSubmit}
          className="w-full rounded-full bg-gray-900 px-6 py-3.5 text-[16px] font-semibold text-white hover:bg-gray-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
          aria-label="Submit recording for analysis"
        >
          Submit Recording
        </button>
      )}

      {status === "submitting" && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div
            className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin"
            aria-hidden="true"
          />
          <p role="status" aria-live="polite" className="text-[14px] text-gray-600">
            Analyzing your recording...
          </p>
        </div>
      )}
    </div>
  );
}
