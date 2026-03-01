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
      className="space-y-6 animate-pulse"
      role="status"
      aria-label="Loading results"
    >
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="h-32 rounded-xl bg-slate-100" />
      <div className="h-24 rounded-xl bg-slate-100" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ResultsPage() {
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

  // ── Error state ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4" role="alert">
        <AlertTriangle className="h-10 w-10 text-red-400" aria-hidden="true" />
        <p className="text-red-600 font-medium">{error}</p>
        <div className="flex gap-3">
          <Link href="/" className="btn-secondary">← Back to home</Link>
          <Link href="/analyze" className="btn-primary">Try again</Link>
        </div>
      </div>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────
  if (!result) {
    return <LoadingSkeleton />;
  }

  // ── Data ───────────────────────────────────────────────────────────────
  const { metrics, score, events, segments, transcript, latency, limitations, mode } = result;
  const totalDurationMs = metrics.total_duration_sec * 1000;
  const audioUrl = getSessionAudioUrl(id);

  const sessionDate = new Date(result.created_at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-16">

      {/* Medical disclaimer banner */}
      <div
        role="note"
        aria-label="Medical disclaimer"
        className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{DISCLAIMER}</span>
      </div>

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Fluency Report
          </h1>
          {/* Screen-reader summary */}
          <p className="sr-only">
            Score {score.value.toFixed(0)} out of 100.
            Severity: {SEVERITY_LABELS[score.severity]}.
            {metrics.total_disfluencies} total disfluency events detected.
          </p>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {sessionDate}
            <span aria-hidden="true">·</span>
            {Math.round(metrics.total_duration_sec)}s
            <span aria-hidden="true">·</span>
            <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{mode}</span>
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link
            href="/analyze"
            aria-label="Back to analysis — analyze another recording"
            className="btn-secondary"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Back to Analysis
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
        <Card className="flex flex-col items-center justify-center py-6">
          <FluencyGauge score={score.value} severity={score.severity} />
        </Card>

        {/* Severity + disfluency stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Severity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SeverityBadge severity={score.severity} size="lg" />
            <div className="text-sm text-slate-600 space-y-1">
              <p>
                <span className="font-semibold text-slate-800">{metrics.total_disfluencies}</span>
                {" "}total events
              </p>
              <p>
                <span className="font-semibold text-slate-800">
                  {metrics.disfluencies_per_100_syllables.toFixed(1)}
                </span>
                {" "}per 100 syllables
              </p>
              <p>
                <span className="font-semibold text-slate-800">{metrics.total_syllables}</span>
                {" "}total syllables
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Speaking rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              Speaking Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SpeakingRateCard metrics={metrics} />
          </CardContent>
        </Card>
      </motion.div>

      <Separator />

      {/* ── Event Timeline ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event Timeline</CardTitle>
            <p className="text-sm text-slate-500">
              Coloured regions show where disfluency events occur in time.
              {audioUrl && " Click a region to jump to that moment."}
            </p>
          </CardHeader>
          <CardContent>
            <EventTimeline
              events={events}
              audioUrl={audioUrl}
              duration={totalDurationMs}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Disfluency Breakdown ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Disfluency Breakdown</CardTitle>
            <p className="text-sm text-slate-500">Event counts by type</p>
          </CardHeader>
          <CardContent>
            <DisfluencyBreakdown events={events} />
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Transcript ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transcript</CardTitle>
            <p className="text-sm text-slate-500">
              Highlighted words overlap with detected disfluency events.
            </p>
          </CardHeader>
          <CardContent>
            <TranscriptView transcript={transcript} events={events} />
          </CardContent>
        </Card>
      </motion.div>

      <Separator />

      {/* ── Judge Mode ─────────────────────────────────────────────────── */}
      <JudgeMode
        mode={mode}
        latency={latency}
        limitations={limitations}
        events={events}
      />

    </div>
  );
}
