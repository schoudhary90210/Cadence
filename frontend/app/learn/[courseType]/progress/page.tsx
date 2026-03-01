"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, Target, Flame } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import { getCourseProgress } from "@/lib/api";
import type { LearnSession } from "@/lib/types";

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
// Level timeline
// ---------------------------------------------------------------------------

function LevelTimeline({ currentLevel, totalLevels = 5 }: { currentLevel: number; totalLevels?: number }) {
  return (
    <div className="flex items-center justify-center gap-0" aria-label={`Level ${currentLevel} of ${totalLevels}`}>
      {Array.from({ length: totalLevels }).map((_, i) => {
        const level = i + 1;
        const isCompleted = level < currentLevel;
        const isCurrent = level === currentLevel;
        const isFuture = level > currentLevel;

        return (
          <div key={level} className="flex items-center">
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold border-2 transition-all
                ${isCompleted ? "bg-green-500 border-green-500 text-white" : ""}
                ${isCurrent ? "bg-[#2563EB] border-[#2563EB] text-white animate-pulse" : ""}
                ${isFuture ? "bg-white border-gray-300 text-gray-400" : ""}
              `}
              aria-label={`Level ${level}${isCompleted ? " completed" : isCurrent ? " current" : ""}`}
            >
              {level}
            </div>
            {i < totalLevels - 1 && (
              <div
                className={`w-8 sm:w-12 h-0.5 ${
                  level < currentLevel ? "bg-green-500" : "bg-gray-200"
                }`}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score chart
// ---------------------------------------------------------------------------

interface ChartPoint {
  label: string;
  score: number;
  passed: boolean;
}

function ScoreChart({ sessions }: { sessions: LearnSession[] }) {
  const data: ChartPoint[] = [...sessions].reverse().map((s, i) => ({
    label: `#${i + 1}`,
    score: Math.round(s.score),
    passed: s.passed,
  }));

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-[14px] text-gray-400">
        No sessions yet
      </div>
    );
  }

  return (
    <div
      className="h-52"
      role="img"
      aria-label={`Score trend chart across ${data.length} sessions`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <ReferenceLine
            y={80}
            stroke="#d1d5db"
            strokeDasharray="4 4"
            label={{ value: "Pass", position: "right", fontSize: 12, fill: "#9ca3af" }}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ stroke: "#d1d5db", strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const score = payload[0]?.value as number;
              const point = data.find((d) => d.label === label);
              return (
                <div className="glass px-3 py-2 text-[14px]">
                  <p className="text-[12px] text-gray-500 mb-0.5">Session {label}</p>
                  <p className={`font-bold ${point?.passed ? "text-green-600" : "text-red-500"}`}>
                    {score} / 100
                  </p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#111827"
            strokeWidth={2}
            dot={({ cx, cy, payload }: { cx: number; cy: number; payload: ChartPoint }) => (
              <circle
                key={`${cx}-${cy}`}
                cx={cx}
                cy={cy}
                r={4}
                fill={payload.passed ? "#22c55e" : "#ef4444"}
                strokeWidth={0}
              />
            )}
            activeDot={{ r: 6, fill: "#111827", strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface ProgressData {
  started: boolean;
  course_name: string;
  current_level: number;
  consecutive_passes: number;
  total_sessions: number;
  best_scores: Record<string, number>;
  sessions: LearnSession[];
}

export default function ProgressPage() {
  const params = useParams();
  const courseType = params.courseType as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProgressData | null>(null);

  useEffect(() => {
    const uid = getUserId();
    getCourseProgress(uid, courseType)
      .then((d) => setData(d))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load progress."))
      .finally(() => setLoading(false));
  }, [courseType]);

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading progress">
        <div className="h-6 w-40 skeleton" />
        <div className="h-16 skeleton" />
        <div className="h-52 skeleton" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href={`/learn/${courseType}`}
          className="inline-flex items-center gap-1 text-[14px] text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Practice
        </Link>
        <div role="alert" className="glass px-5 py-3 text-[14px] text-red-600" style={{ borderColor: "rgba(239, 68, 68, 0.2)" }}>
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const bestScore = Object.values(data.best_scores).length > 0
    ? Math.max(...Object.values(data.best_scores))
    : 0;

  let streak = 0;
  for (const s of data.sessions) {
    if (s.passed) streak++;
    else break;
  }

  return (
    <div className="space-y-8">
      <Link
        href={`/learn/${courseType}`}
        className="inline-flex items-center gap-1 text-[14px] text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Practice
      </Link>

      <div>
        <h1 className="serif italic text-[32px] text-gray-900">
          {data.course_name}
        </h1>
        <p className="mt-1 text-[15px] text-gray-500">Your progress</p>
      </div>

      <div className="glass p-6">
        <h2 className="text-[15px] font-semibold text-gray-900 mb-4 text-center">Level Progress</h2>
        <LevelTimeline currentLevel={data.current_level} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3 text-center">
        <div className="glass p-4">
          <Target className="h-5 w-5 text-gray-400 mx-auto mb-1" aria-hidden="true" />
          <p className="serif italic text-[28px] text-gray-900 tabular-nums">{data.total_sessions}</p>
          <p className="text-[13px] text-gray-500 mt-1">Total Sessions</p>
        </div>
        <div className="glass p-4">
          <Trophy className="h-5 w-5 text-gray-400 mx-auto mb-1" aria-hidden="true" />
          <p className="serif italic text-[28px] text-gray-900 tabular-nums">{bestScore.toFixed(0)}</p>
          <p className="text-[13px] text-gray-500 mt-1">Best Score</p>
        </div>
        <div className="glass p-4">
          <Flame className="h-5 w-5 text-gray-400 mx-auto mb-1" aria-hidden="true" />
          <p className="serif italic text-[28px] text-gray-900 tabular-nums">{streak}</p>
          <p className="text-[13px] text-gray-500 mt-1">Current Streak</p>
        </div>
      </div>

      <div className="glass p-5">
        <h2 className="text-[15px] font-semibold text-gray-900 mb-2">Score Trend</h2>
        <p className="text-[13px] text-gray-500 mb-3">
          Last {data.sessions.length} sessions. Dashed line = pass threshold (80).
        </p>
        <ScoreChart sessions={data.sessions} />
      </div>

      <div className="text-center">
        <Link
          href={`/learn/${courseType}`}
          className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-[15px] font-medium text-white hover:bg-gray-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          Back to Practice
        </Link>
      </div>
    </div>
  );
}
