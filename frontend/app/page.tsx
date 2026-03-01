"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mic, BookOpen, Clock, PlayCircle, GraduationCap } from "lucide-react";
import { motion, useInView } from "framer-motion";

import { analyzeDemoSample } from "@/lib/api";
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
    title: "Real-time Analysis",
    description: "Record or upload audio. Detect blocks, repetitions, and fillers in seconds.",
    href: "/analyze",
  },
  {
    icon: GraduationCap,
    title: "Learn & Progress",
    description: "Personalized courses targeting your speech patterns. Level up with practice.",
    href: "/learn",
  },
  {
    icon: BookOpen,
    title: "Practice Modes",
    description: "Reading and conversation practice with instant word-level feedback.",
    href: "/practice/read",
  },
  {
    icon: Clock,
    title: "Session History",
    description: "Track your fluency score over time and review past sessions.",
    href: "/history",
  },
];

const STATS = [
  { target: 70, suffix: "M+", label: "People who stutter worldwide" },
  { target: 6, suffix: "", label: "Pipeline stages" },
  { target: 100, suffix: "", label: "Fluency score scale" },
];

// ---------------------------------------------------------------------------
// Count-up hook
// ---------------------------------------------------------------------------

function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let rafId: number;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [inView, target, duration]);

  return { count, ref };
}

// ---------------------------------------------------------------------------
// Stat item (hook must be at component level, not in a map callback)
// ---------------------------------------------------------------------------

function StatItem({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const { count, ref } = useCountUp(target);
  return (
    <div>
      <span
        ref={ref}
        className="text-5xl font-extrabold text-gray-900 tabular-nums"
      >
        {count}{suffix}
      </span>
      <p className="text-sm text-gray-500 mt-2">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LandingPage() {
  const router = useRouter();
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inProgress = stage !== null;

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

  const titleChars = "Cadence".split("");

  return (
    <div className="space-y-24">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="pt-12 text-center space-y-8"
        aria-labelledby="hero-heading"
      >
        <h1 id="hero-heading" className="text-6xl sm:text-7xl font-extrabold tracking-tight text-gray-900">
          {titleChars.map((char, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.03 }}
              className="inline-block"
            >
              {char}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="text-xl text-gray-500 max-w-lg mx-auto"
        >
          Speech fluency analytics for everyone.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            Start Analysis
          </Link>
        </motion.div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="features-heading">
        <h2 id="features-heading" className="sr-only">Features</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.href}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Link
                  href={f.href}
                  className="block rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  <Icon className="h-6 w-6 text-gray-400 mb-4" aria-hidden="true" />
                  <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section aria-label="Key statistics" className="grid gap-8 sm:grid-cols-3 text-center">
        {STATS.map((stat) => (
          <StatItem key={stat.label} target={stat.target} suffix={stat.suffix} label={stat.label} />
        ))}
      </section>

      {/* ── Demo samples ──────────────────────────────────────────────────── */}
      <section aria-labelledby="demo-heading" className="space-y-6">
        <div className="text-center">
          <h2 id="demo-heading" className="text-2xl font-bold text-gray-900">
            Try a Demo
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Pre-computed results — instant, no pipeline delay.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {DEMO_SAMPLES.map((sample) => (
            <button
              key={sample.filename}
              onClick={() => handleDemo(sample)}
              disabled={inProgress}
              aria-label={`Analyze ${sample.label} sample: ${sample.description}`}
              className="
                rounded-xl border border-gray-200 bg-white p-5 text-left transition-all
                hover:shadow-md hover:border-gray-300
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              <div className="flex items-center gap-2 mb-2">
                <PlayCircle className="h-4 w-4 text-gray-400" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  {sample.label}
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-snug">{sample.description}</p>
              <p className="mt-2 text-xs text-gray-400">{sample.duration}s</p>
            </button>
          ))}
        </div>

        {/* Progress / error feedback */}
        {inProgress && (
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-sm text-blue-600 font-medium animate-pulse text-center"
          >
            {stage}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600 text-center">
            {error}
          </p>
        )}
      </section>

    </div>
  );
}
