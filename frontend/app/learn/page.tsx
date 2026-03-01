"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Shield,
  Wind,
  Repeat,
  Pause,
  ArrowRight,
  Mic,
  RotateCcw,
} from "lucide-react";

import { AudioRecorder } from "@/components/recording/AudioRecorder";
import { getDiagnostic, getCourses, getProgress } from "@/lib/api";
import type { CourseInfo, CourseProgress, DiagnosticReport } from "@/lib/types";

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

const COURSE_ICONS: Record<string, typeof Shield> = {
  BLOCK_COURSE: Shield,
  PROLONGATION_COURSE: Wind,
  REPETITION_COURSE: Repeat,
  FILLER_COURSE: Pause,
};

// ---------------------------------------------------------------------------
// Impediment bar
// ---------------------------------------------------------------------------

const IMPEDIMENT_LABELS: Record<string, string> = {
  blocks: "Blocks",
  prolongations: "Prolongations",
  word_reps: "Word Repetitions",
  sound_reps: "Sound Repetitions",
  fillers: "Filler Words",
};

function ImpedimentBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.min((count / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-medium text-gray-900 tabular-nums">{count}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100">
        <div
          className="h-2 rounded-full bg-gray-900 transition-all duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={count}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={`${label}: ${count}`}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress dots (3 consecutive passes)
// ---------------------------------------------------------------------------

function ProgressDots({ filled }: { filled: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${filled} of 3 consecutive passes`}>
      {[0, 1, 2].map((i) => (
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
// Course card (overview mode)
// ---------------------------------------------------------------------------

function CourseCard({
  course,
  progress,
  recommended,
}: {
  course: CourseInfo;
  progress?: CourseProgress;
  recommended: boolean;
}) {
  const Icon = COURSE_ICONS[course.course_type] ?? GraduationCap;
  const started = !!progress;
  const level = progress?.current_level ?? 0;
  const pct = (level / course.total_levels) * 100;

  return (
    <Link
      href={`/learn/${course.course_type}`}
      className={`block rounded-xl border p-5 transition-all hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${
        started
          ? "border-gray-200 bg-white"
          : recommended
            ? "border-gray-200 bg-white"
            : "border-gray-100 bg-gray-50 opacity-60"
      }`}
      aria-label={`${course.name} — Level ${level} of ${course.total_levels}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-gray-900">{course.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{course.description}</p>
          </div>
        </div>
      </div>

      {started ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Level {level} / {course.total_levels}</span>
            <ProgressDots filled={progress?.consecutive_passes ?? 0} />
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100">
            <div
              className="h-1.5 rounded-full bg-blue-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">{progress?.total_sessions ?? 0} sessions</p>
        </div>
      ) : (
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-gray-500">
            {recommended ? "Recommended" : "Not started"}
          </span>
          <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
            Start <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type PageStatus = "loading" | "diagnostic" | "overview";

export default function LearnPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<PageStatus>("loading");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStage, setAnalyzeStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticReport | null>(null);
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [progressList, setProgressList] = useState<CourseProgress[]>([]);

  // Determine initial view
  useEffect(() => {
    const uid = getUserId();
    setUserId(uid);
    const done = localStorage.getItem("diagnostic_complete") === "true";
    if (done) {
      setStatus("overview");
      loadOverview(uid);
    } else {
      setStatus("diagnostic");
      // Also preload courses for diagnostic results
      getCourses().then(setCourses).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOverview = useCallback(async (uid: string) => {
    try {
      const [coursesRes, progressRes] = await Promise.all([
        getCourses(),
        getProgress(uid),
      ]);
      setCourses(coursesRes);
      setProgressList(progressRes.courses);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load courses.");
    }
  }, []);

  // Recording complete — save blob
  function handleRecording(b: Blob) {
    setBlob(b);
  }

  // Run diagnostic
  async function handleDiagnostic() {
    if (!blob) return;
    setAnalyzing(true);
    setAnalyzeStage("Analyzing your speech...");
    setError(null);
    try {
      const file = new File([blob], `diagnostic-${Date.now()}.webm`, { type: blob.type });
      const { diagnostic: diag } = await getDiagnostic(file, userId);
      setDiagnostic(diag);
      // Preload courses for result cards
      const c = await getCourses();
      setCourses(c);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Diagnostic failed. Try again.");
    } finally {
      setAnalyzing(false);
      setAnalyzeStage(null);
    }
  }

  // Start a course from diagnostic results
  function handleStartCourse(courseType: string) {
    localStorage.setItem("diagnostic_complete", "true");
    router.push(`/learn/${courseType}`);
  }

  // Reset diagnostic
  function handleResetDiagnostic() {
    localStorage.removeItem("diagnostic_complete");
    setDiagnostic(null);
    setBlob(null);
    setStatus("diagnostic");
  }

  // Switch to overview
  function handleNewDiagnostic() {
    localStorage.removeItem("diagnostic_complete");
    setDiagnostic(null);
    setBlob(null);
    setProgressList([]);
    setStatus("diagnostic");
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (status === "loading") {
    return (
      <div className="space-y-4 animate-pulse" role="status" aria-label="Loading">
        <div className="h-8 w-48 rounded bg-gray-100" />
        <div className="h-4 w-72 rounded bg-gray-100" />
        <div className="h-48 rounded-xl bg-gray-100" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Diagnostic view
  // ---------------------------------------------------------------------------

  if (status === "diagnostic" && !diagnostic) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-gray-400" aria-hidden="true" />
            Let&apos;s understand your speech
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Record yourself speaking naturally for 15–30 seconds. We&apos;ll analyze your patterns and build a personalized practice plan.
          </p>
        </div>

        {/* Recorder */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <AudioRecorder
            onRecordingComplete={handleRecording}
            disabled={analyzing}
          />
        </div>

        {/* Ready state */}
        {blob && !analyzing && (
          <button
            onClick={handleDiagnostic}
            className="w-full rounded-lg bg-gray-900 px-6 py-3 text-base font-semibold text-white hover:bg-gray-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            aria-label="Run diagnostic analysis"
          >
            Run Diagnostic
          </button>
        )}

        {/* Analyzing */}
        {analyzing && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div
              className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin"
              aria-hidden="true"
            />
            <p role="status" aria-live="polite" className="text-sm text-gray-600">
              {analyzeStage ?? "Analyzing..."}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Skip link */}
        <p className="text-center text-sm text-gray-400">
          Already know what to practice?{" "}
          <button
            onClick={() => {
              localStorage.setItem("diagnostic_complete", "true");
              setStatus("overview");
              loadOverview(userId);
            }}
            className="text-gray-600 underline hover:text-gray-900"
          >
            Browse all courses
          </button>
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Diagnostic results
  // ---------------------------------------------------------------------------

  if (status === "diagnostic" && diagnostic) {
    const maxCount = Math.max(
      ...Object.values(diagnostic.impediment_profile),
      1,
    );
    const nonZero = Object.entries(diagnostic.impediment_profile).filter(
      ([, v]) => v > 0,
    );
    const recommendedSet = new Set(diagnostic.recommended_courses);

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-gray-400" aria-hidden="true" />
            Your Diagnostic Results
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {diagnostic.report_text}
          </p>
        </div>

        {/* Impediment profile */}
        {nonZero.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Speech Pattern Analysis</h2>
            {nonZero.map(([key, count]) => (
              <ImpedimentBar
                key={key}
                label={IMPEDIMENT_LABELS[key] ?? key}
                count={count}
                max={maxCount}
              />
            ))}
          </div>
        )}

        {/* Recommended courses */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Recommended Courses</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {courses
              .filter((c) => recommendedSet.has(c.course_type))
              .map((course) => {
                const Icon = COURSE_ICONS[course.course_type] ?? GraduationCap;
                return (
                  <button
                    key={course.course_type}
                    onClick={() => handleStartCourse(course.course_type)}
                    className="rounded-xl border border-gray-200 bg-white p-5 text-left hover:shadow-md transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                    aria-label={`Start ${course.name}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      <h3 className="font-semibold text-gray-900">{course.name}</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{course.description}</p>
                    <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      Start Course <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Browse all */}
        <p className="text-center text-sm text-gray-400">
          <button
            onClick={() => {
              localStorage.setItem("diagnostic_complete", "true");
              setStatus("overview");
              loadOverview(userId);
            }}
            className="text-gray-600 underline hover:text-gray-900"
          >
            Browse all courses
          </button>
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Course overview
  // ---------------------------------------------------------------------------

  const progressMap = new Map(progressList.map((p) => [p.courseType, p]));
  const recommendedCourses = new Set(
    progressList.map((p) => p.courseType),
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-gray-400" aria-hidden="true" />
            Learn
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Practice exercises to improve your fluency.
          </p>
        </div>
        <button
          onClick={handleNewDiagnostic}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
          aria-label="Run a new diagnostic"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          New Diagnostic
        </button>
      </div>

      {/* Active courses */}
      {progressList.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Your Courses</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {courses
              .filter((c) => progressMap.has(c.course_type))
              .map((course) => (
                <CourseCard
                  key={course.course_type}
                  course={course}
                  progress={progressMap.get(course.course_type)}
                  recommended={true}
                />
              ))}
          </div>
        </div>
      )}

      {/* All courses */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">All Courses</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <CourseCard
              key={course.course_type}
              course={course}
              progress={progressMap.get(course.course_type)}
              recommended={recommendedCourses.has(course.course_type)}
            />
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
