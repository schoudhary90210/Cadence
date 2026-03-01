"use client";

/**
 * AudioRecorder — in-browser microphone recorder using Web Audio API / MediaRecorder.
 * Recording logic lives here as a local pattern (not extracted to a separate hook)
 * per CLAUDE.md guidance: only used by this component.
 */

import { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Props interface (exported for Figma handoff)
// ---------------------------------------------------------------------------

export interface AudioRecorderProps {
  /** Called with the recorded audio blob and duration in seconds */
  onRecordingComplete: (blob: Blob, duration: number) => void;
  /** Disable all controls — e.g. while parent is uploading */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

type RecorderStatus = "idle" | "requesting" | "recording" | "stopped";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AudioRecorder({ onRecordingComplete, disabled = false }: AudioRecorderProps) {
  const [recStatus, setRecStatus] = useState<RecorderStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startTimer() {
    startTimeRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 500);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function handleStart() {
    setPermissionError(null);
    setRecStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Prefer opus/webm for smaller file sizes; fall back to plain webm
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        // Release microphone indicator in browser tab
        stream.getTracks().forEach((t) => t.stop());
        onRecordingComplete(blob, duration);
        setRecStatus("stopped");
      };

      startTimer();
      setRecStatus("recording");
      mr.start(250); // collect chunks every 250ms for streaming-friendly blobs
    } catch (e: unknown) {
      const msg =
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Microphone access denied. Allow microphone permissions and try again."
          : "Could not access microphone. Check your device settings.";
      setPermissionError(msg);
      setRecStatus("idle");
    }
  }

  function handleStop() {
    stopTimer();
    mediaRecorderRef.current?.stop();
    // recStatus → "stopped" is set inside mr.onstop
  }

  function handleReset() {
    stopTimer();
    // Stop MediaRecorder without triggering onstop callback
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setElapsed(0);
    setRecStatus("idle");
    setPermissionError(null);
  }

  const isRecording = recStatus === "recording";
  const isBusy = disabled || recStatus === "requesting";

  return (
    <div className="space-y-8">
      {/* Timer display */}
      <div className="flex flex-col items-center gap-3">
        <div
          aria-live="polite"
          aria-atomic="true"
          aria-label={
            isRecording
              ? `Recording: ${formatDuration(elapsed)}`
              : recStatus === "stopped"
              ? "Recording complete"
              : "Ready to record"
          }
          className="flex items-center gap-3"
        >
          {/* Pulsing red dot — colour + animation convey recording state, label above is the a11y fallback */}
          <span
            aria-hidden="true"
            className={`h-4 w-4 rounded-full transition-colors ${
              isRecording
                ? "bg-red-500 animate-pulse"
                : recStatus === "stopped"
                ? "bg-green-500"
                : "bg-slate-200"
            }`}
          />
          <span className="font-mono text-4xl font-bold tracking-widest text-slate-800 tabular-nums">
            {formatDuration(elapsed)}
          </span>
        </div>

        <p className="text-sm text-slate-500" aria-hidden="true">
          {recStatus === "idle"      && "Press Start to begin recording"}
          {recStatus === "requesting" && "Requesting microphone access…"}
          {recStatus === "recording"  && "Recording in progress — press Stop when done"}
          {recStatus === "stopped"    && "Recording captured — ready to analyze"}
        </p>
      </div>

      {/* Controls */}
      <div
        className="flex items-center justify-center gap-3"
        role="group"
        aria-label="Recording controls"
      >
        {recStatus === "idle" && (
          <Button
            onClick={handleStart}
            disabled={isBusy}
            aria-label="Start recording from microphone"
            className="bg-red-500 hover:bg-red-600 text-white focus-visible:ring-red-500"
          >
            <Mic className="mr-2 h-4 w-4" aria-hidden="true" />
            Start Recording
          </Button>
        )}

        {recStatus === "requesting" && (
          <Button disabled aria-label="Requesting microphone access, please wait">
            <span
              className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"
              aria-hidden="true"
            />
            Requesting…
          </Button>
        )}

        {recStatus === "recording" && (
          <>
            <Button
              onClick={handleStop}
              disabled={disabled}
              variant="destructive"
              aria-label="Stop recording"
            >
              <Square className="mr-2 h-4 w-4" aria-hidden="true" />
              Stop
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              aria-label="Cancel recording and start over"
            >
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Cancel
            </Button>
          </>
        )}

        {recStatus === "stopped" && (
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={disabled}
            aria-label="Discard recording and record again"
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Record Again
          </Button>
        )}
      </div>

      {/* Permission / device error */}
      {permissionError && (
        <p role="alert" className="text-sm text-red-600 text-center">
          {permissionError}
        </p>
      )}
    </div>
  );
}
