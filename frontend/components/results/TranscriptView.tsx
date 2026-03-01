"use client";

/**
 * TranscriptView — full transcript with per-word disfluency highlighting.
 * Words whose timestamps overlap with any disfluency event get a coloured
 * background matching the event type. When multiple events overlap one word,
 * the highest-severity type wins: block > prolongation > repetition > filler > interjection.
 */

import type { DisfluencyEvent, EventType, Transcript, WordTimestamp } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props interface (exported for Figma handoff)
// ---------------------------------------------------------------------------

export interface TranscriptViewProps {
  transcript: Transcript;
  events: DisfluencyEvent[];
}

// ---------------------------------------------------------------------------
// Highlight colours per event type
// ---------------------------------------------------------------------------

const WORD_HIGHLIGHT: Record<EventType, string> = {
  block:        "bg-red-100 text-red-900 rounded px-0.5",
  repetition:   "bg-purple-100 text-purple-900 rounded px-0.5",
  prolongation: "bg-orange-100 text-orange-900 rounded px-0.5",
  filler:       "bg-gray-100 text-gray-800 rounded px-0.5",
  interjection: "bg-blue-100 text-blue-900 rounded px-0.5",
};

const SEVERITY_RANK: Record<EventType, number> = {
  block: 5, prolongation: 4, repetition: 3, filler: 2, interjection: 1,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findOverlappingEvent(
  word: WordTimestamp,
  events: DisfluencyEvent[],
): DisfluencyEvent | null {
  // Word timestamps are in seconds; event timestamps are in milliseconds
  const wordStartMs = word.start * 1000;
  const wordEndMs = word.end * 1000;

  const overlapping = events.filter(
    (ev) => ev.start_ms < wordEndMs && ev.end_ms > wordStartMs,
  );
  if (!overlapping.length) return null;

  return overlapping.reduce((best, ev) =>
    SEVERITY_RANK[ev.type] > SEVERITY_RANK[best.type] ? ev : best,
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TranscriptView({ transcript, events }: TranscriptViewProps) {
  const { words, text } = transcript;

  // Fall back to plain text if word timestamps are absent
  if (!words.length) {
    return (
      <section aria-labelledby="transcript-heading">
        <h2 id="transcript-heading" className="sr-only">Transcript</h2>
        <p className="text-sm leading-relaxed text-slate-700">{text}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="transcript-heading">
      <h2 id="transcript-heading" className="sr-only">
        Transcript with disfluency highlights
      </h2>

      {/* Colour legend */}
      <div className="mb-3 flex flex-wrap gap-2 text-xs" aria-hidden="true">
        {(
          [
            ["block",        "Block"],
            ["prolongation", "Prolongation"],
            ["repetition",   "Repetition"],
            ["filler",       "Filler"],
            ["interjection", "Interjection"],
          ] as [EventType, string][]
        ).map(([type, label]) => (
          <span
            key={type}
            className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${WORD_HIGHLIGHT[type]}`}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Word-by-word highlighted transcript */}
      <p className="text-sm leading-loose text-slate-700 select-text">
        {words.map((word, i) => {
          const ev = findOverlappingEvent(word, events);
          const key = `${word.word}-${i}`;

          if (!ev) {
            return <span key={key}>{word.word}{" "}</span>;
          }

          return (
            <mark
              key={key}
              title={`${ev.type} event @ ${word.start.toFixed(1)}s`}
              aria-label={`${word.word} — ${ev.type} detected`}
              className={`${WORD_HIGHLIGHT[ev.type]} no-underline`}
            >
              {word.word}
            </mark>
          );
        })}
      </p>

      {/* sr-only plain text fallback for screen readers */}
      <p className="sr-only">{text}</p>
    </section>
  );
}
