"use client";

/**
 * DisfluencyBreakdown — recharts horizontal bar chart of event counts by type.
 * Bars are colour-coded to match the event type colour system.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import type { DisfluencyEvent, EventType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props interface (exported for Figma handoff)
// ---------------------------------------------------------------------------

export interface DisfluencyBreakdownProps {
  events: DisfluencyEvent[];
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const EVENT_CONFIG: { type: EventType; label: string; fill: string }[] = [
  { type: "block",        label: "Blocks",        fill: "#ef4444" },
  { type: "repetition",   label: "Repetitions",   fill: "#8b5cf6" },
  { type: "prolongation", label: "Prolongations", fill: "#f97316" },
  { type: "filler",       label: "Fillers",       fill: "#6b7280" },
  { type: "interjection", label: "Interjections", fill: "#3b82f6" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DisfluencyBreakdown({ events }: DisfluencyBreakdownProps) {
  const data = EVENT_CONFIG.map(({ type, label, fill }) => ({
    name: label,
    count: events.filter((e) => e.type === type).length,
    fill,
  }));

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Screen-reader summary
  const srSummary = data
    .filter((d) => d.count > 0)
    .map((d) => `${d.count} ${d.name.toLowerCase()}`)
    .join(", ");

  return (
    <section aria-labelledby="breakdown-chart-heading">
      <h2 id="breakdown-chart-heading" className="sr-only">Disfluency Breakdown Chart</h2>
      <p className="sr-only">{srSummary || "No disfluency events detected."}</p>

      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 48, bottom: 0, left: 16 }}
          >
            <XAxis
              type="number"
              domain={[0, maxCount + 1]}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fontSize: 12, fill: "#4b5563" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "#f3f4f6" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload as { name: string; count: number };
                return (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm text-xs">
                    <p className="font-semibold text-gray-700">{item.name}</p>
                    <p className="text-gray-500">
                      {item.count} event{item.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                style={{ fontSize: 12, fontWeight: 600, fill: "#4b5563" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
