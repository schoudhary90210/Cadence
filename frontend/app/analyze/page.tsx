"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const STAGES = [
  { id: "preprocess", label: "Preprocessing audio (16kHz mono)" },
  { id: "transcribe", label: "Transcribing speech (faster-whisper)" },
  { id: "vad",        label: "Detecting speech/silence regions (VAD)" },
  { id: "rules",      label: "Detecting repetitions, fillers, blocks" },
  { id: "scoring",    label: "Computing fluency score" },
  { id: "done",       label: "Generating report" },
];

// Extracted so useSearchParams can be wrapped in Suspense (Next.js 14 requirement)
function AnalyzeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    if (sessionId) {
      router.replace(`/results/${sessionId}`);
      return;
    }
    const interval = setInterval(() => {
      setCurrentStage((s) => {
        if (s >= STAGES.length - 1) { clearInterval(interval); return s; }
        return s + 1;
      });
    }, 900);
    return () => clearInterval(interval);
  }, [sessionId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-10">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-800">Analyzing Your Speech</h1>
        <p className="text-slate-500 text-sm">
          Running RULES_ONLY pipeline · ~10–30s depending on length
        </p>
      </div>

      <div className="w-full max-w-md space-y-2" role="status" aria-label="Analysis progress">
        {STAGES.map((stage, idx) => {
          const isDone    = idx < currentStage;
          const isActive  = idx === currentStage;
          const isPending = idx > currentStage;
          return (
            <div
              key={stage.id}
              aria-current={isActive ? "step" : undefined}
              className={`
                flex items-center gap-3 rounded-lg px-4 py-3 transition-all
                ${isDone    ? "bg-green-50 text-green-700" : ""}
                ${isActive  ? "bg-sky-50 text-sky-700 shadow-sm" : ""}
                ${isPending ? "bg-slate-50 text-slate-400" : ""}
              `}
            >
              <span className="w-5 text-center" aria-hidden="true">
                {isDone ? "✓" : isActive ? "▶" : "○"}
              </span>
              <span className="text-sm font-medium flex-1">{stage.label}</span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 rounded-full border-2 border-sky-500 border-t-transparent animate-spin"
                />
              )}
            </div>
          );
        })}
      </div>

      <Link href="/" className="text-sm text-slate-400 hover:text-slate-600 focus-ring rounded">
        ← Cancel and go back
      </Link>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20" aria-label="Loading" role="status">
          <div className="h-8 w-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <AnalyzeContent />
    </Suspense>
  );
}
