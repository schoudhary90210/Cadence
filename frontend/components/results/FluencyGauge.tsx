"use client";

/**
 * FluencyGauge — animated SVG circular score gauge (0–100).
 * Uses CSS keyframe animation (defined in tailwind.config.ts) with a CSS variable
 * for the target offset. prefers-reduced-motion is honoured globally via globals.css.
 */

// ---------------------------------------------------------------------------
// Props interface
// ---------------------------------------------------------------------------

export interface FluencyGaugeProps {
  score: number;    // 0–100 composite fluency score
  severity: string; // "mild" | "moderate" | "moderate-severe" | "severe"
}

// ---------------------------------------------------------------------------
// Constants — must match the tailwind.config.ts keyframe (radius=54 → C≈339)
// ---------------------------------------------------------------------------

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 339.3

function gaugeColor(score: number): string {
  if (score >= 80) return "#22c55e"; // green-500
  if (score >= 60) return "#eab308"; // yellow-500
  if (score >= 40) return "#f97316"; // orange-500
  return "#ef4444";                  // red-500
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FluencyGauge({ score, severity }: FluencyGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const targetOffset = CIRCUMFERENCE * (1 - clampedScore / 100);
  const color = gaugeColor(clampedScore);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Screen-reader summary */}
      <p className="sr-only">
        Fluency score: {clampedScore.toFixed(0)} out of 100. Severity: {severity}.
      </p>

      {/* SVG gauge */}
      <div className="relative inline-flex items-center justify-center" aria-hidden="true">
        <svg
          viewBox="0 0 120 120"
          className="w-48 h-48 -rotate-90"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background track */}
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="10"
          />
          {/* Progress arc — animated via Tailwind keyframe */}
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            className="animate-gauge-fill"
            style={
              {
                "--gauge-offset": `${targetOffset}`,
              } as React.CSSProperties
            }
          />
        </svg>

        {/* Score number — centred over SVG */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="serif italic text-[56px] font-normal tabular-nums leading-none"
            style={{ color }}
          >
            {clampedScore.toFixed(0)}
          </span>
          <span className="text-[13px] text-gray-400 mt-1">/ 100</span>
        </div>
      </div>

      {/* Severity label below gauge */}
      <p className="text-[15px] font-semibold capitalize" style={{ color }}>
        {severity.replace("-", "\u2013")}
      </p>
    </div>
  );
}
