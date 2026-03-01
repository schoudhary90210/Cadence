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
        <h1 className="serif italic text-[36px] text-gray-900 flex items-center gap-3">
          <MessageSquare className="h-7 w-7 text-gray-400" aria-hidden="true" />
          Conversation Practice
        </h1>
        <p className="mt-2 text-[15px] text-gray-500">
          Answer a random prompt aloud. Results focus on fillers, speaking rate, and pace.
        </p>
      </div>

      {loading && (
        <div className="space-y-4" role="status" aria-label="Loading prompt">
          <div className="h-24 skeleton border-l-4 border-blue-600" />
          <div className="h-48 skeleton" />
        </div>
      )}

      {error && (
        <p role="alert" className="text-[14px] text-red-600">{error}</p>
      )}

      {!loading && !error && prompt && (
        <ConversationPractice prompt={prompt} onNewQuestion={() => void fetchPrompt()} />
      )}
    </div>
  );
}
