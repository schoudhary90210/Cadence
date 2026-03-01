"use client";

/**
 * EventTimeline — wavesurfer.js waveform with coloured disfluency region overlays.
 *
 * - WaveSurfer is imported dynamically (no SSR) so Next.js doesn't try to
 *   run Web Audio API code on the server.
 * - Coloured <button> overlays sit absolutely positioned over the waveform.
 *   Clicking a region seeks wavesurfer to that timestamp and starts playback.
 * - Falls back to a CSS-only SVG timeline if audioUrl is empty or 404s.
 */

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DisfluencyEvent, EventType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props interface (exported for Figma handoff)
// ---------------------------------------------------------------------------

export interface EventTimelineProps {
  events: DisfluencyEvent[];
  /** Full URL to the audio file — pass empty string if unavailable */
  audioUrl: string;
  /** Total audio duration in milliseconds */
  duration: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const WAVEFORM_HEIGHT = 80; // px — must match WaveSurfer height option

const EVENT_OVERLAY_COLOR: Record<EventType, string> = {
  block:        "bg-red-400",
  repetition:   "bg-purple-400",
  prolongation: "bg-orange-400",
  filler:       "bg-gray-400",
  interjection: "bg-blue-400",
};

const EVENT_LABEL: Record<EventType, string> = {
  block:        "Block",
  repetition:   "Repetition",
  prolongation: "Prolongation",
  filler:       "Filler",
  interjection: "Interjection",
};

// ---------------------------------------------------------------------------
// CSS-only fallback timeline (used when audioUrl is empty or fails)
// ---------------------------------------------------------------------------

function CssTimeline({ events, duration }: { events: DisfluencyEvent[]; duration: number }) {
  return (
    <div className="space-y-3">
      <div
        role="img"
        aria-label={`Timeline showing ${events.length} disfluency events over ${Math.round(duration / 1000)} seconds`}
        className="relative h-12 rounded-lg bg-slate-100 overflow-hidden"
      >
        {/* Speech activity background bar */}
        <div className="absolute inset-x-0 top-3 h-6 bg-slate-200 rounded" />

        {events.map((ev, i) => {
          const left  = duration > 0 ? (ev.start_ms / duration) * 100 : 0;
          const width = duration > 0
            ? Math.max(((ev.end_ms - ev.start_ms) / duration) * 100, 0.5)
            : 0;
          return (
            <div
              key={i}
              title={`${EVENT_LABEL[ev.type]} @ ${(ev.start_ms / 1000).toFixed(1)}s`}
              className={`absolute top-1 h-10 rounded-sm opacity-75 ${EVENT_OVERLAY_COLOR[ev.type]}`}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-slate-400" aria-hidden="true">
        <span>0 s</span>
        <span>{Math.round(duration / 1000)} s</span>
      </div>

      {/* Legend */}
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Event type colour legend">
      {(Object.keys(EVENT_LABEL) as EventType[]).map((type) => (
        <span
          key={type}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${EVENT_OVERLAY_COLOR[type]}`}
        >
          {EVENT_LABEL[type]}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wavesurfer timeline
// ---------------------------------------------------------------------------

type WsStatus = "loading" | "ready" | "error";

function WavesurferTimeline({
  audioUrl,
  events,
  duration,
}: EventTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // WaveSurfer instance typed via import type to avoid SSR issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wsRef = useRef<any>(null);
  const [wsStatus, setWsStatus] = useState<WsStatus>("loading");
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    (async () => {
      try {
        // Dynamic import — runs client-side only
        const { default: WaveSurfer } = await import("wavesurfer.js");
        if (destroyed || !containerRef.current) return;

        const ws = WaveSurfer.create({
          container: containerRef.current,
          waveColor:     "#cbd5e1",  // slate-300
          progressColor: "#0ea5e9",  // sky-500
          cursorColor:   "#0284c7",  // sky-600
          height:        WAVEFORM_HEIGHT,
          normalize:     true,
          interact:      true,
        });

        wsRef.current = ws;

        ws.on("ready",  () => { if (!destroyed) setWsStatus("ready"); });
        ws.on("play",   () => { if (!destroyed) setIsPlaying(true); });
        ws.on("pause",  () => { if (!destroyed) setIsPlaying(false); });
        ws.on("finish", () => { if (!destroyed) setIsPlaying(false); });
        ws.on("error",  () => { if (!destroyed) setWsStatus("error"); });

        await ws.load(audioUrl);
      } catch {
        if (!destroyed) setWsStatus("error");
      }
    })();

    return () => {
      destroyed = true;
      wsRef.current?.destroy();
      wsRef.current = null;
    };
  }, [audioUrl]);

  function handleRegionClick(ev: DisfluencyEvent) {
    const ws = wsRef.current;
    if (!ws || wsStatus !== "ready") return;
    ws.setTime(ev.start_ms / 1000);
    ws.play();
  }

  function handlePlayPause() {
    wsRef.current?.playPause();
  }

  if (wsStatus === "error") {
    return <CssTimeline events={events} duration={duration} />;
  }

  return (
    <div className="space-y-3">
      {/* Waveform + overlay container */}
      <div
        className="relative rounded-lg overflow-hidden bg-slate-50 border border-slate-100"
        style={{ height: `${WAVEFORM_HEIGHT}px` }}
      >
        {/* WaveSurfer renders its canvas inside this div */}
        <div ref={containerRef} className="absolute inset-0" />

        {/* Event region overlays */}
        {wsStatus === "ready" && events.map((ev, i) => {
          const left  = duration > 0 ? (ev.start_ms / duration) * 100 : 0;
          const width = duration > 0
            ? Math.max(((ev.end_ms - ev.start_ms) / duration) * 100, 0.4)
            : 0;
          return (
            <button
              key={i}
              onClick={() => handleRegionClick(ev)}
              title={`${EVENT_LABEL[ev.type]} @ ${(ev.start_ms / 1000).toFixed(1)}s — click to play`}
              aria-label={`${EVENT_LABEL[ev.type]} event at ${(ev.start_ms / 1000).toFixed(1)} seconds — click to play from here`}
              className={`
                absolute top-0 h-full border-0 cursor-pointer
                opacity-30 hover:opacity-60 transition-opacity
                ${EVENT_OVERLAY_COLOR[ev.type]}
              `}
              style={{
                left:  `${left}%`,
                width: `${width}%`,
              }}
            />
          );
        })}

        {/* Loading spinner */}
        {wsStatus === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80">
            <span
              className="h-5 w-5 rounded-full border-2 border-sky-500 border-t-transparent animate-spin"
              aria-hidden="true"
            />
            <span className="sr-only">Loading waveform…</span>
          </div>
        )}
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          onClick={handlePlayPause}
          disabled={wsStatus !== "ready"}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
          className="gap-1.5"
        >
          {isPlaying
            ? <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            : <Play  className="h-3.5 w-3.5" aria-hidden="true" />
          }
          {isPlaying ? "Pause" : "Play"}
        </Button>
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
          Click a coloured region to jump to that event
        </span>
      </div>

      <Legend />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component — chooses implementation based on audioUrl availability
// ---------------------------------------------------------------------------

export function EventTimeline({ events, audioUrl, duration }: EventTimelineProps) {
  if (!audioUrl) {
    return <CssTimeline events={events} duration={duration} />;
  }
  return <WavesurferTimeline events={events} audioUrl={audioUrl} duration={duration} />;
}
