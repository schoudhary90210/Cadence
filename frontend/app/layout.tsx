import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FluencyLens — Speech Fluency Analytics",
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
        {/* Navbar */}
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="font-bold text-sky-600 text-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600 focus-visible:outline-offset-2 rounded"
              aria-label="FluencyLens home"
            >
              FluencyLens
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium text-slate-600" aria-label="Main navigation">
              <Link href="/analyze" className="hover:text-sky-600 transition-colors focus-ring rounded">
                Analyze
              </Link>
              <Link href="/history" className="hover:text-sky-600 transition-colors focus-ring rounded">
                History
              </Link>
            </nav>
          </div>
        </header>

        {/* Medical disclaimer banner */}
        <div
          role="note"
          aria-label="Medical disclaimer"
          className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-800"
        >
          <strong>Prototype analytics tool</strong> — Not a medical diagnostic device.
          Results are clinical-inspired estimates. Consult a speech-language pathologist for clinical assessment.
        </div>

        {/* Page content */}
        <main
          id="main-content"
          className="mx-auto max-w-5xl px-4 py-8"
          tabIndex={-1}
        >
          {children}
        </main>

        {/* Skip-to-content link (accessibility) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] btn-primary"
        >
          Skip to main content
        </a>

        {/* Footer */}
        <footer className="mt-16 border-t border-slate-100 py-6 text-center text-xs text-slate-400 space-y-1">
          <p>FluencyLens · CheesHacks 2026 · Health &amp; Lifestyle</p>
          <p>Built with Next.js + FastAPI · wav2vec2 + faster-whisper</p>
          <p className="text-amber-600">
            Not a medical device. For educational and demonstration purposes only.
          </p>
        </footer>
      </body>
    </html>
  );
}
