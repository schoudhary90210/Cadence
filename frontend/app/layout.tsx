import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

import { AccessibilityProvider } from "@/components/accessibility/AccessibilityProvider";
import { ErrorBoundary }         from "@/components/accessibility/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cadence — Speech Fluency Analytics",
  description:
    "Prototype speech fluency analytics platform. Detects disfluencies using custom signal processing + ML. Not a medical diagnostic tool.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <AccessibilityProvider>

            {/* Skip-to-content link (keyboard / screen-reader accessibility) */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] rounded bg-sky-600 px-3 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              Skip to main content
            </a>

            {/* ── Navbar ──────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
              <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
                <Link
                  href="/"
                  className="font-bold text-sky-600 text-lg rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600 focus-visible:outline-offset-2"
                  aria-label="Cadence — go to home page"
                >
                  Cadence
                </Link>
                <nav
                  className="flex items-center gap-5 text-sm font-medium text-slate-600"
                  aria-label="Main navigation"
                >
                  <Link
                    href="/analyze"
                    aria-label="Go to the analyze page"
                    className="hover:text-sky-600 transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"
                  >
                    Analyze
                  </Link>
                  <Link
                    href="/practice/read"
                    aria-label="Go to reading practice"
                    className="hover:text-sky-600 transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"
                  >
                    Reading
                  </Link>
                  <Link
                    href="/practice/speak"
                    aria-label="Go to conversation practice"
                    className="hover:text-sky-600 transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"
                  >
                    Speaking
                  </Link>
                  <Link
                    href="/history"
                    aria-label="View session history"
                    className="hover:text-sky-600 transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"
                  >
                    History
                  </Link>
                </nav>
              </div>
            </header>

            {/* ── Medical disclaimer banner ─────────────────────────────── */}
            <div
              role="note"
              aria-label="Medical disclaimer: this is a prototype practice tool, not a medical device"
              className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-800"
            >
              <strong>Prototype practice tool</strong> — Not a medical diagnostic device.
              Results are clinical-inspired estimates. Consult a speech-language pathologist for clinical assessment.
            </div>

            {/* ── Page content ─────────────────────────────────────────────── */}
            <main
              id="main-content"
              className="mx-auto max-w-5xl px-4 py-8"
              tabIndex={-1}
            >
              {children}
            </main>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <footer
              className="mt-16 border-t border-slate-100 py-8 text-center text-xs text-slate-400 space-y-2"
              aria-label="Site footer"
            >
              <p className="font-medium text-slate-500">Cadence · CheesHacks 2026 · Health &amp; Lifestyle</p>
              <p>Built with Next.js + FastAPI · wav2vec2 + faster-whisper</p>
              <p>
                Audio is processed on-server and deleted after analysis. No recordings stored without consent.
              </p>
              <p className="text-amber-600">
                Not a medical device. For educational and demonstration purposes only.
              </p>
            </footer>

          </AccessibilityProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
