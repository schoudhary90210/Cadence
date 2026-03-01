"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { analyzeAudio, analyzeDemoSample } from "@/lib/api";
import { DISCLAIMER } from "@/lib/types";
import type { DemoSample } from "@/lib/types";

const DEMO_SAMPLES: DemoSample[] = [
  {
    filename: "fluent_sample.wav",
    label: "fluent",
    description: "Smooth reading — no disfluencies. Expected score 90+.",
    duration: 30,
    cached: true,
  },
  {
    filename: "stuttered_sample.wav",
    label: "stuttered",
    description: "Intentional blocks, repetitions, prolongations. Expected score 40–60.",
    duration: 30,
    cached: true,
  },
  {
    filename: "mixed_sample.wav",
    label: "mixed",
    description: "Mostly fluent with a few fillers and repetitions. Expected score 70–80.",
    duration: 30,
    cached: true,
  },
];

const LABEL_BG: Record<string, string> = {
  fluent:    "border-green-200 bg-green-50 hover:bg-green-100",
  stuttered: "border-red-200 bg-red-50 hover:bg-red-100",
  mixed:     "border-orange-200 bg-orange-50 hover:bg-orange-100",
};

export default function LandingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setStage(sample.cached ? `Loading cached demo: ${sample.filename}…` : `Analyzing ${sample.filename}…`);
    try {
      const result = await analyzeDemoSample(sample.filename);
      router.push(`/results/${result.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Demo analysis failed.");
      setStage(null);
    }
  }

  const inProgress = stage !== null;

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center space-y-4 pt-4" aria-labelledby="hero-heading">
        <h1 id="hero-heading" className="text-4xl font-bold tracking-tight text-slate-900">
          Prototype Speech Fluency Analytics
        </h1>
        <p className="mx-auto max-w-xl text-lg text-slate-500">
          Upload a recording for AI-powered detection of repetitions, prolongations,
          blocks, and fillers — with a composite fluency score.
        </p>
        <p className="text-sm text-amber-700 bg-amber-50 inline-block px-3 py-1 rounded-full border border-amber-200">
          Clinical-inspired metrics · Not a diagnostic tool
        </p>
      </section>

      {/* Upload */}
      <section className="card" aria-labelledby="upload-heading">
        <h2 id="upload-heading" className="text-lg font-semibold text-slate-800 mb-4">
          Upload Audio
        </h2>

        <div
          role="button"
          tabIndex={inProgress ? -1 : 0}
          aria-label="Drop audio file here or press Enter to browse files"
          aria-disabled={inProgress}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !inProgress) {
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => !inProgress && fileInputRef.current?.click()}
          className={`
            flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 cursor-pointer transition-colors
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600
            ${isDragging ? "border-sky-400 bg-sky-50" : "border-slate-200 hover:border-sky-300 hover:bg-slate-50"}
            ${inProgress ? "opacity-60 cursor-not-allowed" : ""}
          `}
        >
          <span className="text-4xl" aria-hidden="true">🎙</span>
          {inProgress ? (
            <p className="text-sm text-sky-600 font-medium animate-pulse" aria-live="polite" aria-atomic="true">
              {stage}
            </p>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-700">
                Drag &amp; drop a WAV file here, or click to browse
              </p>
              <p className="text-xs text-slate-400">16kHz mono WAV recommended · Max 50 MB</p>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.wav"
          aria-label="Select audio file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </section>

      {/* Demo samples */}
      <section aria-labelledby="demo-heading">
        <h2 id="demo-heading" className="text-lg font-semibold text-slate-800 mb-4">
          Try a Demo Sample
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Cached results return instantly — no pipeline delay.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {DEMO_SAMPLES.map((sample) => (
            <button
              key={sample.filename}
              onClick={() => handleDemo(sample)}
              disabled={inProgress}
              aria-label={`Analyze ${sample.label} sample: ${sample.description}`}
              className={`
                rounded-xl border p-5 text-left transition-all hover:shadow-md
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600
                disabled:opacity-50 disabled:cursor-not-allowed
                ${LABEL_BG[sample.label]}
              `}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {sample.label}
                {sample.cached && (
                  <span className="ml-2 text-green-600" aria-label="cached">⚡</span>
                )}
              </span>
              <p className="mt-1 text-sm text-slate-700">{sample.description}</p>
              <p className="mt-2 text-xs text-slate-400">{sample.duration}s</p>
            </button>
          ))}
        </div>
      </section>

      <div className="text-center">
        <Link href="/history" className="text-sm text-sky-600 hover:underline focus-ring rounded">
          View past sessions →
        </Link>
      </div>
    </div>
  );
}
