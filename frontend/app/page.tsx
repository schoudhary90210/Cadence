"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mic, BookOpen, MessageSquare, Upload, Zap, AlertTriangle, Shield } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { analyzeAudio, analyzeDemoSample } from "@/lib/api";
import type { DemoSample } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEMO_SAMPLES: DemoSample[] = [
  {
    filename: "fluent_sample.m4a",
    label: "fluent",
    description: "Smooth reading — no disfluencies. Expected score 80+.",
    duration: 30,
    cached: true,
  },
  {
    filename: "stuttered_sample.m4a",
    label: "stuttered",
    description: "Intentional blocks, repetitions, prolongations. Expected score ~60–70.",
    duration: 30,
    cached: true,
  },
  {
    filename: "mixed_sample.m4a",
    label: "mixed",
    description: "Mostly fluent with a few fillers and repetitions. Expected score ~75–80.",
    duration: 30,
    cached: true,
  },
];

const FEATURES = [
  {
    icon: Mic,
    title: "Record & Analyze",
    description:
      "Record your voice or upload an audio file. Cadence detects blocks, repetitions, prolongations, and filler words in seconds.",
    href: "/analyze",
    cta: "Start analyzing",
    color: "text-sky-600",
    badge: "Live",
    badgeVariant: "default" as const,
  },
  {
    icon: BookOpen,
    title: "Reading Practice",
    description:
      "Read a target passage aloud. Cadence highlights matched words in green and disfluencies in red — instant feedback on every sentence.",
    href: "/practice/read",
    cta: "Try reading practice",
    color: "text-violet-600",
    badge: "Live",
    badgeVariant: "default" as const,
  },
  {
    icon: MessageSquare,
    title: "Conversation Practice",
    description:
      "Answer a random prompt (casual, interview, storytelling). Results focus on filler count, speaking rate, and pace consistency.",
    href: "/practice/speak",
    cta: "Try conversation practice",
    color: "text-emerald-600",
    badge: "Live",
    badgeVariant: "default" as const,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LandingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inProgress = stage !== null;

  async function handleFile(file: File) {
    setError(null);
    try {
      const result = await analyzeAudio(file, setStage);
      router.push(`/results/${result.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed. Try again.");
      setStage(null);
    }
  }

  async function handleDemo(sample: DemoSample) {
    setError(null);
    setStage(sample.cached ? `Loading cached result for ${sample.label}…` : `Analyzing ${sample.filename}…`);
    try {
      const result = await analyzeDemoSample(sample.filename);
      router.push(`/results/${result.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Demo analysis failed.");
      setStage(null);
    }
  }

  return (
    <div className="space-y-16">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="pt-6 text-center space-y-6"
        aria-labelledby="hero-heading"
      >
        <h1
          id="hero-heading"
          className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl"
        >
          Cadence
          <span className="block text-2xl font-semibold text-slate-500 mt-2 tracking-normal">
            Speech Fluency Analytics
          </span>
        </h1>

        {/* Impact statement */}
        <p className="mx-auto max-w-2xl text-lg text-slate-600 leading-relaxed">
          <strong className="text-slate-800">70 million people worldwide stutter.</strong>{" "}
          Therapy costs $150/session. We built free, browser-based fluency analytics
          so anyone can measure, track, and improve their speech — no waiting room required.
        </p>

        {/* Medical disclaimer badge — prominent */}
        <div
          role="note"
          aria-label="Important: prototype tool, not medical diagnosis"
          className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          This is a prototype practice tool, not medical diagnosis.
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={inProgress}
            aria-label="Upload an audio file to analyze"
            className="bg-sky-600 hover:bg-sky-700 focus-visible:ring-sky-500"
          >
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            Upload Audio
          </Button>
          <Button
            variant="outline"
            size="lg"
            asChild
          >
            <Link href="/analyze" aria-label="Go to the full analyze page">
              <Mic className="mr-2 h-4 w-4" aria-hidden="true" />
              Record Live
            </Link>
          </Button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.m4a,.wav,.mp3,.webm"
          aria-label="Select audio file for analysis"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        {/* Progress / error feedback */}
        {inProgress && (
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-sm text-sky-600 font-medium animate-pulse"
          >
            {stage}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </motion.section>

      <Separator />

      {/* ── Feature cards ─────────────────────────────────────────────────── */}
      <section aria-labelledby="features-heading">
        <h2
          id="features-heading"
          className="text-center text-2xl font-bold text-slate-800 mb-8"
        >
          What you can do with Cadence
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`h-6 w-6 ${f.color}`} aria-hidden="true" />
                      <Badge variant={f.badgeVariant}>{f.badge}</Badge>
                    </div>
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {f.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto pt-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className={`px-0 font-medium ${f.color} hover:bg-transparent`}
                    >
                      <Link href={f.href} aria-label={f.cta}>
                        {f.cta} →
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* ── Demo samples ──────────────────────────────────────────────────── */}
      <section aria-labelledby="demo-heading">
        <div className="text-center mb-6">
          <h2 id="demo-heading" className="text-2xl font-bold text-slate-800">
            Try a Demo Sample
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Pre-computed results return instantly — no pipeline delay.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {DEMO_SAMPLES.map((sample) => {
            const colorMap: Record<string, string> = {
              fluent:    "border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300",
              stuttered: "border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300",
              mixed:     "border-orange-200 bg-orange-50 hover:bg-orange-100 hover:border-orange-300",
            };
            return (
              <button
                key={sample.filename}
                onClick={() => handleDemo(sample)}
                disabled={inProgress}
                aria-label={`Analyze ${sample.label} sample: ${sample.description}`}
                className={`
                  rounded-xl border p-5 text-left transition-all
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${colorMap[sample.label] ?? "border-slate-200 bg-slate-50 hover:bg-slate-100"}
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-600">
                    {sample.label}
                  </span>
                  {sample.cached && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                      aria-label="Instant cached result"
                    >
                      <Zap className="h-3 w-3" aria-hidden="true" />
                      Instant
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-700 leading-snug">{sample.description}</p>
                <p className="mt-2 text-xs text-slate-400">{sample.duration}s</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Privacy + past sessions ───────────────────────────────────────── */}
      <section className="space-y-4" aria-label="Privacy information and session history">
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="flex items-start gap-3 pt-5">
            <Shield
              className="mt-0.5 h-5 w-5 shrink-0 text-slate-400"
              aria-hidden="true"
            />
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong className="text-slate-700">Privacy:</strong>{" "}
              Audio is processed on-server and deleted after analysis.
              No recordings are stored without your consent.
              Analysis results are saved locally to your session history only.
            </p>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link
            href="/history"
            className="text-sm text-sky-600 hover:underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"
          >
            View past sessions →
          </Link>
        </div>
      </section>

    </div>
  );
}
