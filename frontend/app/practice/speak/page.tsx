"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

import { ConversationPractice } from "@/components/practice/ConversationPractice";
import { getPrompt } from "@/lib/api";
import type { ConversationPrompt } from "@/lib/types";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ConversationPracticePage() {
  const [prompt, setPrompt]   = useState<ConversationPrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchPrompt = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await getPrompt();
      setPrompt(p);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load prompt");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPrompt();
  }, [fetchPrompt]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-emerald-600" aria-hidden="true" />
          Conversation Practice
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Answer a random prompt aloud. Results focus on fillers, speaking rate, and pace.
        </p>
      </div>

      {loading && (
        <div className="space-y-4 animate-pulse" role="status" aria-label="Loading prompt">
          <div className="h-24 rounded-xl bg-emerald-50 border border-emerald-100" />
          <div className="h-48 rounded-xl bg-slate-100" />
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">{error}</p>
      )}

      {!loading && !error && prompt && (
        <ConversationPractice prompt={prompt} onNewQuestion={() => void fetchPrompt()} />
      )}
    </div>
  );
}
