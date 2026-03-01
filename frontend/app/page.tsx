"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mic, BookOpen, Clock, PlayCircle, GraduationCap, AlertTriangle } from "lucide-react";
import { motion, useInView } from "framer-motion";

import { WaveformBg } from "@/components/WaveformBg";
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
    description: "Intentional blocks, repetitions, prolongations. Expected score ~60\u201370.",
    duration: 30,
    cached: true,
  },
  {
    filename: "mixed_sample.m4a",
    label: "mixed",
    description: "Mostly fluent with a few fillers and repetitions. Expected score ~75\u201380.",
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
  { target: 80, suffix: "M+", label: "Speech impediments worldwide" },
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
// Stat item
// ---------------------------------------------------------------------------

function StatItem({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const { count, ref } = useCountUp(target);
  return (
    <div className="text-center">
      <span
        ref={ref}
        className="serif italic text-5xl font-normal text-gray-900 tabular-nums"
      >
        {count}{suffix}
      </span>
      <p className="text-[14px] text-gray-500 mt-2">{label}</p>
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
    setStage(sample.cached ? `Loading cached result for ${sample.label}\u2026` : `Analyzing ${sample.filename}\u2026`);
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
    <div className="space-y-28">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative pt-16 pb-4 text-center"
        aria-labelledby="hero-heading"
      >
        <WaveformBg />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative glass px-8 py-6 sm:px-12 sm:py-7 space-y-4"
        >
          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-[12px] font-semibold tracking-[0.25em] text-gray-400 uppercase"
            style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
          >
            SPEECH FLUENCY ANALYTICS
          </motion.p>

          {/* Title */}
          <h1
            id="hero-heading"
            className="serif italic text-[88px] sm:text-[108px] leading-[0.95] tracking-[0.04em] text-gray-900"
          >
            {titleChars.map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.04 }}
                className="inline-block"
              >
                {char}
              </motion.span>
            ))}
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="text-[17px] text-gray-500 max-w-lg mx-auto leading-relaxed"
          >
            Browser-first speech practice with instant fluency scoring and progress history.
          </motion.p>

          {/* Phonetic */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="text-[13px] text-gray-400"
            style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
          >
            /kuh-MYOO-ni-KAY-shuhn/
          </motion.p>

          {/* Disclaimer */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50/60 px-5 py-2.5"
          >
            <span className="text-[15px]" aria-hidden="true">{"\u26A0\uFE0F"}</span>
            <span className="text-[13px] text-gray-500 font-medium">
              Prototype tool {"\u2014"} not for medical diagnosis
            </span>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-8 py-3.5 text-[16px] font-semibold text-white shadow-sm hover:bg-[#1d4ed8] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              Start Analysis
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Core Features Header + Cards ───────────────────────────────── */}
      <section aria-labelledby="features-heading">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <h2
            id="features-heading"
            className="serif italic text-[32px] text-gray-900"
          >
            Core Features
          </h2>
          <p className="mt-2 text-[15px] text-gray-400">
            Everything you need for speech fluency practice.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.href}
                className="h-full"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Link
                  href={f.href}
                  className="glass block p-6 h-full hover:shadow-md transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  <div className="w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-[17px] text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-[15px] text-gray-500 leading-relaxed">{f.description}</p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section aria-label="Key statistics">
        <div className="glass px-8 py-10">
          <div className="grid sm:grid-cols-3 gap-8 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {STATS.map((stat) => (
              <StatItem key={stat.label} target={stat.target} suffix={stat.suffix} label={stat.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo samples ──────────────────────────────────────────────────── */}
      <section aria-labelledby="demo-heading" className="space-y-6">
        <div className="text-center">
          <h2 id="demo-heading" className="serif italic text-[32px] text-gray-900">
            Try a Demo
          </h2>
          <p className="mt-2 text-[15px] text-gray-500">
            Pre-computed results &mdash; instant, no pipeline delay.
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
                glass p-6 text-left transition-all
                hover:shadow-md
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              <div className="flex items-center gap-2 mb-2">
                <PlayCircle className="h-4 w-4 text-gray-400" aria-hidden="true" />
                <span className="text-[13px] font-bold uppercase tracking-widest text-gray-500">
                  {sample.label}
                </span>
              </div>
              <p className="text-[15px] text-gray-700 leading-snug">{sample.description}</p>
              <p className="mt-2 text-[13px] text-gray-400">{sample.duration}s</p>
            </button>
          ))}
        </div>

        {/* Progress / error feedback */}
        {inProgress && (
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-[14px] text-blue-600 font-medium animate-pulse text-center"
          >
            {stage}
          </p>
        )}
        {error && (
          <p role="alert" className="text-[14px] text-red-600 text-center">
            {error}
          </p>
        )}
      </section>

    </div>
  );
}
