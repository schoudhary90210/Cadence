"use client";

/**
 * SeverityBadge — colored pill badge for fluency severity levels.
 */

import type { Severity } from "@/lib/types";
import { SEVERITY_COLORS, SEVERITY_LABELS } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props interface (exported for Figma handoff)
// ---------------------------------------------------------------------------

export interface SeverityBadgeProps {
  severity: Severity;
  size?: "sm" | "md" | "lg";
}

// ---------------------------------------------------------------------------
// Size variants
// ---------------------------------------------------------------------------

const SIZE_CLASSES: Record<NonNullable<SeverityBadgeProps["size"]>, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
  lg: "px-4 py-1.5 text-base",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SeverityBadge({ severity, size = "md" }: SeverityBadgeProps) {
  return (
    <span
      role="status"
      aria-label={`Severity: ${SEVERITY_LABELS[severity]}`}
      className={`
        inline-flex items-center rounded-full border font-semibold
        ${SEVERITY_COLORS[severity]}
        ${SIZE_CLASSES[size]}
      `}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}
