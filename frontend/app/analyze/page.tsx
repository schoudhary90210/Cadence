"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mic, Upload, PlayCircle, CheckCircle, AlertTriangle, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { AudioRecorder } from "@/components/recording/AudioRecorder";
import { FileUpload } from "@/components/recording/FileUpload";
import { DemoSamplePicker } from "@/components/recording/DemoSamplePicker";
import { useAnalysis } from "@/hooks/useAnalysis";

// ---------------------------------------------------------------------------
// Pipeline stage labels for the animated progress display
// ---------------------------------------------------------------------------

const PIPELINE_STAGES = [
  { id: "preprocess", label: "Preprocessing audio (16 kHz mono)" },
  { id: "transcribe", label: "Transcribing speech (Whisper)" },
  { id: "vad",        label: "Detecting speech / silence regions (VAD)" },
  { id: "rules",      label: "Detecting blocks, repetitions, and fillers" },
  { id: "scoring",    label: "Computing composite fluency score" },
  { id: "report",     label: "Generating report" },
];

// ---------------------------------------------------------------------------
// Progress display shown while analysis is in-flight
// ---------------------------------------------------------------------------

function AnalysisProgress({ stage }: { stage: string | null }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cycle through stages every ~2.5 s to give sense of forward progress
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveIdx((i) => Math.min(i + 1, PIPELINE_STAGES.length - 1));
    }, 2500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-slate-800">Analyzing Your Speech</h2>
        {stage && (
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-sm text-sky-600 font-medium"
          >
            {stage}
          </p>
        )}
        <p className="text-xs text-slate-400">~10–30 s depending on audio length</p>
      </div>

      <div className="w-full max-w-sm mx-auto space-y-2" role="status" aria-label="Analysis pipeline progress">
        {PIPELINE_STAGES.map((s, idx) => {
          const isDone    = idx < activeIdx;
          const isActive  = idx === activeIdx;
          const isPending = idx > activeIdx;
          return (
            <div
              key={s.id}
              aria-current={isActive ? "step" : undefined}
              className={`
                flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all text-sm
                ${isDone    ? "bg-green-50 text-green-700" : ""}
                ${isActive  ? "bg-sky-50 text-sky-700 shadow-sm" : ""}
                ${isPending ? "text-slate-400" : ""}
              `}
            >
              <span className="w-4 shrink-0 text-center" aria-hidden="true">
                {isDone    ? "✓" : isActive ? "▶" : "○"}
              </span>
              <span className="flex-1">{s.label}</span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 rounded-full border-2 border-sky-500 border-t-transparent animate-spin"
                />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AnalyzePage() {
  const router = useRouter();
  const { status, stage, error, resultId, analyzeFile, analyzeDemoSample, reset } = useAnalysis();

  // Pending input state — set by Record / Upload tabs; cleared on tab switch
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("record");

  // Redirect to results on success
  useEffect(() => {
    if (status === "done" && resultId) {
      router.push(`/results/${resultId}`);
    }
  }, [status, resultId, router]);

  // Clear pending file when switching tabs so Analyze button doesn't linger
  function handleTabChange(tab: string) {
    setActiveTab(tab);
    setPendingFile(null);
  }

  // AudioRecorder returns a Blob — wrap as File for the API
  function handleRecordingComplete(blob: Blob, _duration: number) {
    const file = new File([blob], `recording-${Date.now()}.webm`, { type: blob.type });
    setPendingFile(file);
  }

  function handleFileSelected(file: File) {
    setPendingFile(file);
  }

  // Demo samples trigger analysis directly (cached → instant)
  function handleDemoSelected(filename: string) {
    setPendingFile(null);
    analyzeDemoSample(filename);
  }

  async function handleAnalyze() {
    if (!pendingFile) return;
    await analyzeFile(pendingFile);
  }

  const isInFlight = status === "uploading" || status === "analyzing";
  const isIdle = status === "idle" || status === "error";

  // ---------------------------------------------------------------------------
  // While analysis is running, show the progress view
  // ---------------------------------------------------------------------------
  if (isInFlight) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <AnalysisProgress stage={stage} />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render the input UI
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-8 max-w-2xl mx-auto">

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-1"
      >
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Analyze Speech
        </h1>
        <p className="text-slate-500 text-sm">
          Record live, upload a file, or try a demo sample.
        </p>
      </motion.div>

      {/* Error banner */}
      {status === "error" && error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold text-red-800">Analysis failed</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={reset}
            aria-label="Dismiss error and try again"
            className="shrink-0 text-red-500 hover:text-red-700 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </motion.div>
      )}

      {/* Input tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3" aria-label="Input method">
          <TabsTrigger value="record" aria-label="Record from microphone">
            <Mic className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Record
          </TabsTrigger>
          <TabsTrigger value="upload" aria-label="Upload an audio file">
            <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="demo" aria-label="Use a demo sample">
            <PlayCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Demo
          </TabsTrigger>
        </TabsList>

        {/* ── Record tab ───────────────────────────────────────────────── */}
        <TabsContent value="record">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Record from Microphone</CardTitle>
              <CardDescription>
                Press Start, speak naturally, then Stop. We analyze the audio locally — nothing is stored without your consent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AudioRecorder
                onRecordingComplete={handleRecordingComplete}
                disabled={!isIdle}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Upload tab ───────────────────────────────────────────────── */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload Audio File</CardTitle>
              <CardDescription>
                Supports .wav, .mp3, .m4a, and .webm. Max recommended length: 5 minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                onFileSelected={handleFileSelected}
                disabled={!isIdle}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Demo tab ─────────────────────────────────────────────────── */}
        <TabsContent value="demo">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Try a Demo Sample</CardTitle>
              <CardDescription>
                Pre-computed results return instantly — no pipeline delay. Great for exploring the results view.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DemoSamplePicker
                onSampleSelected={handleDemoSelected}
                disabled={!isIdle}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Analyze button — appears once a file/recording is ready */}
      {pendingFile && isIdle && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <Separator />
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
            <span>
              Ready:{" "}
              <span className="font-medium text-slate-700">{pendingFile.name}</span>
            </span>
          </div>
          <Button
            size="lg"
            onClick={handleAnalyze}
            disabled={!isIdle}
            aria-label={`Run fluency analysis on ${pendingFile.name}`}
            className="bg-sky-600 hover:bg-sky-700 focus-visible:ring-sky-500 min-w-[180px]"
          >
            Analyze Speech →
          </Button>
          <p className="text-xs text-slate-400 text-center max-w-xs">
            Audio is sent to the local server, analyzed, then deleted. No recordings are stored without consent.
          </p>
        </motion.div>
      )}

      {/* Back link */}
      <div className="text-center pt-2">
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-slate-600 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
