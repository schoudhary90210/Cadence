"use client";

/**
 * SpeakingRateCard — displays speaking rate, articulation rate, and pace variability.
 * Colour-codes the speaking rate as Slow / Normal / Fast.
 */

import type { AnalysisMetrics } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props interface
// ---------------------------------------------------------------------------

export interface SpeakingRateCardProps {
  metrics: AnalysisMetrics;
}

// ---------------------------------------------------------------------------
// Constants — match backend config.py
// ---------------------------------------------------------------------------

const NORMAL_RATE_MIN = 3.5; // syl/sec
const NORMAL_RATE_MAX = 5.5;

function rateLabel(rate: number): { label: string; color: string } {
  if (rate < NORMAL_RATE_MIN) return { label: "Slow", color: "text-blue-600" };
  if (rate > NORMAL_RATE_MAX) return { label: "Fast", color: "text-orange-600" };
  return { label: "Normal", color: "text-green-600" };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MetricRowProps {
  label: string;
  value: string;
  note?: string;
  badge?: { text: string; color: string };
}

function MetricRow({ label, value, note, badge }: MetricRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-[15px] text-gray-600 shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {badge && (
          <span className={`text-[13px] font-semibold ${badge.color}`}>{badge.text}</span>
        )}
        <span className="font-mono text-[15px] font-semibold text-gray-800">{value}</span>
        {note && <span className="text-[13px] text-gray-400">{note}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SpeakingRateCard({ metrics }: SpeakingRateCardProps) {
  const { speaking_rate_syl_sec, articulation_rate, pace_variability } = metrics;
  const rate = rateLabel(speaking_rate_syl_sec);

  return (
    <section aria-labelledby="rate-heading">
      <h2 id="rate-heading" className="sr-only">Speaking Rate</h2>
      <div className="divide-y divide-gray-100">
        <MetricRow
          label="Speaking rate"
          value={`${speaking_rate_syl_sec.toFixed(2)} syl/s`}
          note="incl. pauses"
          badge={{ text: rate.label, color: rate.color }}
        />
        <MetricRow
          label="Articulation rate"
          value={`${articulation_rate.toFixed(2)} syl/s`}
          note="speech only"
        />
        <MetricRow
          label="Pace variability"
          value={`\u00B1${pace_variability.toFixed(2)} syl/s`}
          note="std dev, 3s windows"
        />
        <div className="pt-2">
          <p className="text-[13px] text-gray-400">
            Normal range: {NORMAL_RATE_MIN}\u2013{NORMAL_RATE_MAX} syl/s
          </p>
        </div>
      </div>
    </section>
  );
}
