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
        <h2 className="serif italic text-[28px] text-gray-900">Analyzing Your Speech</h2>
        {stage && (
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-[14px] text-blue-600 font-medium"
          >
            {stage}
          </p>
        )}
        <p className="text-[13px] text-gray-400">~10\u201330 s depending on audio length</p>
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
                flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all text-[14px]
                ${isDone    ? "bg-green-50 text-green-700" : ""}
                ${isActive  ? "glass text-blue-700" : ""}
                ${isPending ? "text-gray-400" : ""}
              `}
            >
              <span className="w-4 shrink-0 text-center" aria-hidden="true">
                {isDone    ? "\u2713" : isActive ? "\u25B6" : "\u25CB"}
              </span>
              <span className="flex-1">{s.label}</span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"
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

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("record");

  useEffect(() => {
    if (status === "done" && resultId) {
      router.push(`/results/${resultId}`);
    }
  }, [status, resultId, router]);

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    setPendingFile(null);
  }

  function handleRecordingComplete(blob: Blob, _duration: number) {
    const file = new File([blob], `recording-${Date.now()}.webm`, { type: blob.type });
    setPendingFile(file);
  }

  function handleFileSelected(file: File) {
    setPendingFile(file);
  }

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

  if (isInFlight) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <AnalysisProgress stage={stage} />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-1"
      >
        <h1 className="serif italic text-[36px] text-gray-900">
          Analyze Speech
        </h1>
        <p className="text-[15px] text-gray-500">
          Record live, upload a file, or try a demo sample.
        </p>
      </motion.div>

      {/* Error banner */}
      {status === "error" && error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          role="alert"
          className="flex items-start gap-3 glass px-5 py-4 border-red-200/60"
          style={{ borderColor: "rgba(239, 68, 68, 0.2)" }}
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
          <div className="flex-1 space-y-1">
            <p className="text-[14px] font-semibold text-red-800">Analysis failed</p>
            <p className="text-[14px] text-red-700">{error}</p>
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
        <TabsList className="grid w-full grid-cols-3 h-12" aria-label="Input method">
          <TabsTrigger value="record" className="text-[16px] data-[state=active]:font-medium" aria-label="Record from microphone">
            <Mic className="mr-2 h-4 w-4" aria-hidden="true" />
            Record
          </TabsTrigger>
          <TabsTrigger value="upload" className="text-[16px] data-[state=active]:font-medium" aria-label="Upload an audio file">
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="demo" className="text-[16px] data-[state=active]:font-medium" aria-label="Use a demo sample">
            <PlayCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            Demo
          </TabsTrigger>
        </TabsList>

        {/* ── Record tab ───────────────────────────────────────────────── */}
        <TabsContent value="record">
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="text-[17px]">Record from Microphone</CardTitle>
              <CardDescription className="text-[15px]">
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
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="text-[17px]">Upload Audio File</CardTitle>
              <CardDescription className="text-[15px]">
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
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="text-[17px]">Try a Demo Sample</CardTitle>
              <CardDescription className="text-[15px]">
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

      {/* Analyze button */}
      {pendingFile && isIdle && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <Separator />
          <div className="flex items-center gap-2 text-[14px] text-gray-500">
            <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
            <span>
              Ready:{" "}
              <span className="font-medium text-gray-700">{pendingFile.name}</span>
            </span>
          </div>
          <Button
            size="lg"
            onClick={handleAnalyze}
            disabled={!isIdle}
            aria-label={`Run fluency analysis on ${pendingFile.name}`}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] focus-visible:ring-blue-500 min-w-[180px] rounded-full text-[16px]"
          >
            Analyze Speech
          </Button>
          <p className="text-[13px] text-gray-400 text-center max-w-xs">
            Audio is sent to the local server, analyzed, then deleted. No recordings are stored without consent.
          </p>
        </motion.div>
      )}

      {/* Back link */}
      <div className="text-center pt-2">
        <Link
          href="/"
          className="text-[14px] text-gray-400 hover:text-gray-600 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
        >
{"\u2190"} Back to home
        </Link>
      </div>
    </div>
  );
}
