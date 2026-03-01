"use client";

/**
 * ErrorBoundary — catches unhandled React render errors and shows a graceful fallback.
 * Must be a class component (React requirement for componentDidCatch / getDerivedStateFromError).
 */

import { Component, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

// ---------------------------------------------------------------------------
// Props / State
// ---------------------------------------------------------------------------

interface Props {
  children: ReactNode;
  /** Optional custom fallback — if omitted, renders DefaultFallback */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Default fallback UI
// ---------------------------------------------------------------------------

function DefaultFallback({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-[50vh] gap-5 text-center px-4"
    >
      <AlertTriangle className="h-12 w-12 text-red-400" aria-hidden="true" />
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
        <p className="text-sm text-gray-500 max-w-md">
          {error?.message ?? "An unexpected error occurred. Please try again."}
        </p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
          aria-label="Dismiss error and try again"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
          aria-label="Return to Cadence home page"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error boundary class
// ---------------------------------------------------------------------------

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <DefaultFallback error={this.state.error} onReset={this.handleReset} />
        )
      );
    }
    return this.props.children;
  }
}
