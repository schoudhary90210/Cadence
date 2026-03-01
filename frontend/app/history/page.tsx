"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  History,
  Mic,
  Mic2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  Target,
  Trophy,
} from "lucide-react";
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

import { SessionList } from "@/components/history/SessionList";
import { getSessions, getSessionsByDate, getSessionsByWeek, getSessionStats } from "@/lib/api";
import type { SessionSummary } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatWeekRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString(undefined, opts)} ${"\u2013"} ${end.toLocaleDateString(undefined, opts)}`;
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function scoreToColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  const mins = Math.floor(sec / 60);
  const secs = Math.round(sec % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = "day" | "week";

interface ChartPoint {
  label: string;
  score: number;
}

interface Stats {
  total_sessions: number;
  avg_score: number;
  best_score: number;
  total_practice_time_sec: number;
  severity_counts: Record<string, number>;
  sessions_by_day: Record<string, { count: number; avg_score: number }>;
}

// ---------------------------------------------------------------------------
// Score trend line chart
// ---------------------------------------------------------------------------

function ScoreChart({ sessions, mode = "all" }: { sessions: SessionSummary[]; mode?: "all" | "day" | "week" }) {
  const data: ChartPoint[] = [...sessions].reverse().map((s) => {
    const d = new Date(s.created_at);
    let label: string;
    if (mode === "day") {
      label = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } else if (mode === "week") {
      label = d.toLocaleDateString(undefined, { weekday: "short" });
    } else {
      label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
    return { label, score: Math.round(s.score_value) };
  });

  const latest = data[data.length - 1]?.score ?? 0;

  return (
    <div className="glass p-5">
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-gray-400" aria-hidden="true" />
          Fluency Score Over Time
        </h2>
        <p className="text-[13px] text-gray-500 mt-0.5">
          0{"\u2013"}100 scale {"\u00B7"} higher is better {"\u00B7"} dashed lines show severity thresholds
        </p>
      </div>
      <div
        className="h-52"
        role="img"
        aria-label={`Line chart showing fluency scores over ${data.length} sessions. Most recent score: ${latest} out of 100.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 48, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

            {/* Severity threshold reference lines */}
            <ReferenceLine
              y={80}
              stroke="#22c55e"
              strokeDasharray="4 4"
              label={{ value: "Mild", position: "right", fontSize: 10, fill: "#22c55e" }}
            />
            <ReferenceLine
              y={60}
              stroke="#eab308"
              strokeDasharray="4 4"
              label={{ value: "Moderate", position: "right", fontSize: 10, fill: "#ca8a04" }}
            />
            <ReferenceLine
              y={40}
              stroke="#f97316"
              strokeDasharray="4 4"
              label={{ value: "Mod\u2013Sev", position: "right", fontSize: 10, fill: "#ea580c" }}
            />

            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              cursor={{ stroke: "#d1d5db", strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const score = payload[0]?.value as number;
                return (
                  <div className="glass px-3 py-2 text-[14px]">
                    <p className="text-[12px] text-gray-500">{label}</p>
                    <p className="font-bold text-[#2563EB]">{score} / 100</p>
                  </div>
                );
              }}
            />

            <Line
              type="monotone"
              dataKey="score"
              stroke="#2563EB"
              strokeWidth={2}
              dot={{ fill: "#2563EB", r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "#1d4ed8", strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress Test trend chart (reads from localStorage)
// ---------------------------------------------------------------------------

interface ProgressHistoryEntry {
  timestamp: string;
  score: number;
}

function ProgressTestChart() {
  const [data, setData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cadence_progress_test_history");
      const history: ProgressHistoryEntry[] = raw ? JSON.parse(raw) : [];
      const pts = history.map((e) => {
        const d = new Date(e.timestamp);
        return {
          label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
            " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
          score: e.score,
        };
      });
      setData(pts);
    } catch {
      setData([]);
    }
  }, []);

  if (data.length < 1) return null;

  const latest = data[data.length - 1]?.score ?? 0;

  return (
    <div className="glass p-5">
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-500" aria-hidden="true" />
          Fixed Progress Test Accuracy
        </h2>
        <p className="text-[13px] text-gray-500 mt-0.5">
          Word accuracy from reading practice progress tests {"\u00B7"} 80%+ is passing
        </p>
      </div>
      <div
        className="h-52"
        role="img"
        aria-label={`Line chart showing progress test accuracy over ${data.length} attempts. Most recent: ${latest}%.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

            <ReferenceLine
              y={80}
              stroke="#22c55e"
              strokeDasharray="4 4"
              label={{ value: "Pass", position: "right", fontSize: 10, fill: "#22c55e" }}
            />

            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              cursor={{ stroke: "#d1d5db", strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const score = payload[0]?.value as number;
                return (
                  <div className="glass px-3 py-2 text-[14px]">
                    <p className="text-[12px] text-gray-500">{label}</p>
                    <p className="font-bold text-[#2563EB]">{score}%</p>
                  </div>
                );
              }}
            />

            <Line
              type="monotone"
              dataKey="score"
              stroke="#2563EB"
              strokeWidth={2}
              dot={{ fill: "#2563EB", r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "#1d4ed8", strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HistoryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  const [allSessions, setAllSessions] = useState<SessionSummary[]>([]);
  const [daySessions, setDaySessions] = useState<SessionSummary[]>([]);
  const [weekSessions, setWeekSessions] = useState<SessionSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all sessions + stats on mount
  useEffect(() => {
    Promise.all([getSessions(), getSessionStats()])
      .then(([sessions, statsData]) => {
        setAllSessions(sessions);
        setStats(statsData);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load sessions."),
      )
      .finally(() => setLoading(false));
  }, []);

  // Load day-specific sessions
  const loadDay = useCallback(async (d: Date) => {
    try {
      const sessions = await getSessionsByDate(formatDate(d));
      setDaySessions(sessions);
    } catch {
      setDaySessions([]);
    }
  }, []);

  // Load week-specific sessions
  const loadWeek = useCallback(async (ws: Date) => {
    try {
      const sessions = await getSessionsByWeek(formatDate(ws));
      setWeekSessions(sessions);
    } catch {
      setWeekSessions([]);
    }
  }, []);

  // Reload when date/week changes
  useEffect(() => {
    if (!loading) loadDay(currentDate);
  }, [currentDate, loading, loadDay]);

  useEffect(() => {
    if (!loading) loadWeek(weekStart);
  }, [weekStart, loading, loadWeek]);

  // Navigate
  function prevDay() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  }
  function nextDay() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    if (d <= new Date()) setCurrentDate(d);
  }
  function prevWeek() {
    const ws = new Date(weekStart);
    ws.setDate(ws.getDate() - 7);
    setWeekStart(ws);
  }
  function nextWeek() {
    const ws = new Date(weekStart);
    ws.setDate(ws.getDate() + 7);
    if (ws <= new Date()) setWeekStart(ws);
  }

  const isToday = formatDate(currentDate) === formatDate(new Date());
  const isCurrentWeek = formatDate(weekStart) === formatDate(getMonday(new Date()));

  // Day summary
  const dayAvg =
    daySessions.length > 0
      ? Math.round(daySessions.reduce((s, x) => s + x.score_value, 0) / daySessions.length)
      : 0;
  const dayTime = daySessions.reduce((s, x) => s + x.total_duration_sec, 0);

  // Week summary
  const weekAvg =
    weekSessions.length > 0
      ? Math.round(weekSessions.reduce((s, x) => s + x.score_value, 0) / weekSessions.length)
      : 0;
  const weekTime = weekSessions.reduce((s, x) => s + x.total_duration_sec, 0);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="serif italic text-[36px] text-gray-900 flex items-center gap-3">
            <History className="h-7 w-7 text-gray-400" aria-hidden="true" />
            History
          </h1>
          <p className="mt-1 text-[15px] text-gray-500">
            {!loading && allSessions.length > 0
              ? `${allSessions.length} session${allSessions.length !== 1 ? "s" : ""} recorded`
              : "Your past analyses appear here."}
          </p>
        </div>
        <Link
          href="/analyze"
          className="btn-primary"
          aria-label="Go to analyze page to start a new recording"
        >
          <Mic2 className="h-4 w-4" aria-hidden="true" />
          New Analysis
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4" role="status" aria-label="Loading session history">
          <div className="h-12 skeleton" />
          <div className="h-52 skeleton" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 skeleton" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div
          role="alert"
          className="glass px-5 py-3 text-[14px] text-red-600"
          style={{ borderColor: "rgba(239, 68, 68, 0.2)" }}
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && allSessions.length === 0 && (
        <div className="flex flex-col items-center justify-center glass py-20 gap-5 text-center">
          <Mic className="h-12 w-12 text-gray-300" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold text-[17px] text-gray-700">No analyses yet</p>
            <p className="text-[15px] text-gray-500">
              Record or upload speech to start tracking your fluency over time.
            </p>
          </div>
          <Link
            href="/analyze"
            className="btn-primary"
            aria-label="Analyze your first recording"
          >
            Analyze your first recording
          </Link>
        </div>
      )}

      {/* Main content */}
      {!loading && !error && allSessions.length > 0 && (
        <>
          {/* Day/Week toggle */}
          <div className="flex items-center justify-center gap-1 p-1 bg-gray-100 rounded-full w-fit mx-auto">
            <button
              onClick={() => setViewMode("day")}
              className={`px-5 py-2 rounded-full text-[15px] font-medium transition-all ${
                viewMode === "day"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-5 py-2 rounded-full text-[15px] font-medium transition-all ${
                viewMode === "week"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Week
            </button>
          </div>

          {/* ── Day View ─────────────────────────────────────────────────── */}
          {viewMode === "day" && (
            <div className="space-y-6">
              {/* Date navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={prevDay}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-500" />
                </button>
                <div className="text-center">
                  <p className="text-[17px] font-semibold text-gray-900">
                    {isToday ? "Today" : formatDisplayDate(currentDate)}
                  </p>
                  {isToday && (
                    <p className="text-[13px] text-gray-500">
                      {formatDisplayDate(currentDate)}
                    </p>
                  )}
                </div>
                <button
                  onClick={nextDay}
                  disabled={isToday}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-30"
                  aria-label="Next day"
                >
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Day chart */}
              {daySessions.length >= 2 && <ScoreChart sessions={daySessions} mode="day" />}

              {/* Daily summary */}
              {daySessions.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-3 text-center">
                  <div className="glass p-4">
                    <Target className="h-5 w-5 text-gray-400 mx-auto mb-1" aria-hidden="true" />
                    <p className="serif italic text-[28px] text-gray-900 tabular-nums">
                      {daySessions.length}
                    </p>
                    <p className="text-[13px] text-gray-500 mt-1">Sessions</p>
                  </div>
                  <div className="glass p-4">
                    <TrendingUp className="h-5 w-5 text-gray-400 mx-auto mb-1" aria-hidden="true" />
                    <p className="serif italic text-[28px] tabular-nums" style={{ color: scoreToColor(dayAvg) }}>
                      {dayAvg}
                    </p>
                    <p className="text-[13px] text-gray-500 mt-1">Avg Score</p>
                  </div>
                  <div className="glass p-4">
                    <Clock className="h-5 w-5 text-gray-400 mx-auto mb-1" aria-hidden="true" />
                    <p className="serif italic text-[28px] text-gray-900 tabular-nums">
                      {formatDuration(dayTime)}
                    </p>
                    <p className="text-[13px] text-gray-500 mt-1">Practice Time</p>
                  </div>
                </div>
              )}

              {/* Session list for this day */}
              {daySessions.length > 0 ? (
                <div>
                  <h2 className="text-[15px] font-semibold text-gray-900 mb-3">Sessions</h2>
                  <SessionList sessions={daySessions} />
                </div>
              ) : (
                <div className="text-center py-10 text-[14px] text-gray-400">
                  No sessions this day
                </div>
              )}
            </div>
          )}

          {/* ── Week View ────────────────────────────────────────────────── */}
          {viewMode === "week" && (
            <div className="space-y-6">
              {/* Week navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={prevWeek}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Previous week"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-500" />
                </button>
                <div className="text-center">
                  <p className="text-[17px] font-semibold text-gray-900">
                    {isCurrentWeek ? "This Week" : formatWeekRange(weekStart)}
                  </p>
                  {isCurrentWeek && (
                    <p className="text-[13px] text-gray-500">
                      {formatWeekRange(weekStart)}
                    </p>
                  )}
                </div>
                <button
                  onClick={nextWeek}
                  disabled={isCurrentWeek}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-30"
                  aria-label="Next week"
                >
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Week chart */}
              {weekSessions.length >= 2 && <ScoreChart sessions={weekSessions} mode="week" />}

              {/* Weekly summary */}
              {weekSessions.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-3 text-center">
                  <div className="glass p-4">
                    <Target className="h-5 w-5 text-gray-400 mx-auto mb-1" aria-hidden="true" />
                    <p className="serif italic text-[28px] text-gray-900 tabular-nums">
                      {weekSessions.length}
                    </p>
                    <p className="text-[13px] text-gray-500 mt-1">Sessions</p>
                  </div>
                  <div className="glass p-4">
                    <TrendingUp className="h-5 w-5 text-gray-400 mx-auto mb-1" aria-hidden="true" />
                    <p className="serif italic text-[28px] tabular-nums" style={{ color: scoreToColor(weekAvg) }}>
                      {weekAvg}
                    </p>
                    <p className="text-[13px] text-gray-500 mt-1">Avg Score</p>
                  </div>
                  <div className="glass p-4">
                    <Clock className="h-5 w-5 text-gray-400 mx-auto mb-1" aria-hidden="true" />
                    <p className="serif italic text-[28px] text-gray-900 tabular-nums">
                      {formatDuration(weekTime)}
                    </p>
                    <p className="text-[13px] text-gray-500 mt-1">Practice Time</p>
                  </div>
                </div>
              )}

              {/* Session list for this week */}
              {weekSessions.length > 0 ? (
                <div>
                  <h2 className="text-[15px] font-semibold text-gray-900 mb-3">Sessions</h2>
                  <SessionList sessions={weekSessions} />
                </div>
              ) : (
                <div className="text-center py-10 text-[14px] text-gray-400">
                  No sessions this week
                </div>
              )}
            </div>
          )}

          {/* Progress Test trend chart */}
          <ProgressTestChart />

          {/* Overall stats */}
          {stats && stats.total_sessions > 0 && (
            <div className="glass p-6">
              <h2 className="text-[15px] font-semibold text-gray-900 mb-4">All Time</h2>
              <div className="grid gap-4 sm:grid-cols-4 text-center">
                <div>
                  <p className="serif italic text-[24px] text-gray-900 tabular-nums">
                    {stats.total_sessions}
                  </p>
                  <p className="text-[13px] text-gray-500">Total Sessions</p>
                </div>
                <div>
                  <p className="serif italic text-[24px] tabular-nums" style={{ color: scoreToColor(stats.avg_score) }}>
                    {stats.avg_score}
                  </p>
                  <p className="text-[13px] text-gray-500">Avg Score</p>
                </div>
                <div>
                  <p className="serif italic text-[24px] text-gray-900 tabular-nums">
                    <Trophy className="inline h-4 w-4 text-yellow-500 mr-1" aria-hidden="true" />
                    {stats.best_score}
                  </p>
                  <p className="text-[13px] text-gray-500">Best Score</p>
                </div>
                <div>
                  <p className="serif italic text-[24px] text-gray-900 tabular-nums">
                    {formatDuration(stats.total_practice_time_sec)}
                  </p>
                  <p className="text-[13px] text-gray-500">Total Practice</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
