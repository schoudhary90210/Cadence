"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, BarChart3, Clock, Mic2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { FluencyGauge }       from "@/components/results/FluencyGauge";
import { SeverityBadge }      from "@/components/results/SeverityBadge";
import { EventTimeline }      from "@/components/results/EventTimeline";
import { DisfluencyBreakdown } from "@/components/results/DisfluencyBreakdown";
import { SpeakingRateCard }   from "@/components/results/SpeakingRateCard";
import { TranscriptView }     from "@/components/results/TranscriptView";
import { JudgeMode }          from "@/components/results/JudgeMode";

import { getSession, getSessionAudioUrl } from "@/lib/api";
import { DISCLAIMER, SEVERITY_LABELS } from "@/lib/types";
import type { AnalysisResult } from "@/lib/types";

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-label="Loading results"
    >
      <div className="h-8 w-48 skeleton" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 skeleton" />
        ))}
      </div>
      <div className="h-32 skeleton" />
      <div className="h-24 skeleton" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ResultsClient() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    getSession(id)
      .then(setResult)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load session."),
      );
  }, [id]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4" role="alert">
        <AlertTriangle className="h-10 w-10 text-red-400" aria-hidden="true" />
        <p className="text-[15px] text-red-600 font-medium">{error}</p>
        <div className="flex gap-3">
          <Link href="/" className="btn-secondary">\u2190 Back to home</Link>
          <Link href="/analyze" className="btn-primary">Try again</Link>
        </div>
      </div>
    );
  }

  if (!result) {
    return <LoadingSkeleton />;
  }

  const { metrics, score, events, segments, transcript, latency, limitations, mode } = result;
  const totalDurationMs = metrics.total_duration_sec * 1000;
  const audioUrl = getSessionAudioUrl(id);

  const sessionDate = new Date(result.created_at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-8 pb-16">

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <h1 className="serif italic text-[36px] text-gray-900">
            Fluency Report
          </h1>
          <p className="sr-only">
            Score {score.value.toFixed(0)} out of 100.
            Severity: {SEVERITY_LABELS[score.severity]}.
            {metrics.total_disfluencies} total disfluency events detected.
          </p>
          <p className="text-[15px] text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {sessionDate}
            <span aria-hidden="true">\u00B7</span>
            {Math.round(metrics.total_duration_sec)}s
            <span aria-hidden="true">\u00B7</span>
            <span className="font-mono text-[12px] bg-gray-100 px-1.5 py-0.5 rounded">{mode}</span>
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link
            href="/analyze"
            aria-label="Back to analysis"
            className="btn-secondary"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Back
          </Link>
          <Link href="/analyze" className="btn-primary" aria-label="Analyze a new recording">
            <Mic2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Analyze Another
          </Link>
        </div>
      </motion.div>

      {/* ── Score + Severity + Rate ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid gap-4 sm:grid-cols-3"
      >
        {/* Fluency gauge */}
        <div className="glass flex flex-col items-center justify-center py-6">
          <FluencyGauge score={score.value} severity={score.severity} />
        </div>

        {/* Severity + disfluency stats */}
        <div className="glass p-5">
          <p className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Severity
          </p>
          <div className="space-y-3">
            <SeverityBadge severity={score.severity} size="lg" />
            <div className="text-[15px] text-gray-600 space-y-1">
              <p>
                <span className="font-semibold text-gray-800">{metrics.total_disfluencies}</span>
                {" "}total events
              </p>
              <p>
                <span className="font-semibold text-gray-800">
                  {metrics.disfluencies_per_100_syllables.toFixed(1)}
                </span>
                {" "}per 100 syllables
              </p>
              <p>
                <span className="font-semibold text-gray-800">{metrics.total_syllables}</span>
                {" "}total syllables
              </p>
            </div>
          </div>
        </div>

        {/* Speaking rate */}
        <div className="glass p-5">
          <p className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-3">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            Speaking Rate
          </p>
          <SpeakingRateCard metrics={metrics} />
        </div>
      </motion.div>

      <Separator className="bg-gray-100" />

      {/* ── Event Timeline ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="glass p-5">
          <h2 className="text-[17px] font-semibold text-gray-900 mb-1">Event Timeline</h2>
          <p className="text-[14px] text-gray-500 mb-4">
            Coloured regions show where disfluency events occur in time.
            {audioUrl && " Click a region to jump to that moment."}
          </p>
          <EventTimeline
            events={events}
            audioUrl={audioUrl}
            duration={totalDurationMs}
          />
        </div>
      </motion.div>

      {/* ── Disfluency Breakdown ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <div className="glass p-5">
          <h2 className="text-[17px] font-semibold text-gray-900 mb-1">Disfluency Breakdown</h2>
          <p className="text-[14px] text-gray-500 mb-4">Event counts by type</p>
          <DisfluencyBreakdown events={events} />
        </div>
      </motion.div>

      {/* ── Transcript ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="glass p-5">
          <h2 className="text-[17px] font-semibold text-gray-900 mb-1">Transcript</h2>
          <p className="text-[14px] text-gray-500 mb-4">
            Highlighted words overlap with detected disfluency events.
          </p>
          <TranscriptView transcript={transcript} events={events} />
        </div>
      </motion.div>

      <Separator className="bg-gray-100" />

      {/* ── Judge Mode ─────────────────────────────────────────────────── */}
      <JudgeMode result={result} />

    </div>
  );
}
