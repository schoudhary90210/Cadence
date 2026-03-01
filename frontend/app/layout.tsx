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

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative py-1 text-[18px] font-extrabold text-gray-900 hover:text-black transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-[#2563EB] after:transition-all hover:after:w-full"
    >
      {children}
    </Link>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Instrument Serif for display headings */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <AccessibilityProvider>

            {/* Skip-to-content link (keyboard / screen-reader accessibility) */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              Skip to main content
            </a>

            {/* ── Navbar ──────────────────────────────────────────────────── */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF9F6]/80 backdrop-blur-xl border-b border-gray-100">
              <div className="mx-auto flex max-w-5xl items-center justify-between px-5 h-16">
                <div className="-ml-16"><NavLink href="/">Home</NavLink></div>
                <nav
                  className="flex items-center gap-7 font-medium"
                  aria-label="Main navigation"
                >
                  <NavLink href="/analyze">Analyze</NavLink>
                  <NavLink href="/learn">Learn</NavLink>
                  <NavLink href="/practice/read">Practice</NavLink>
                  <NavLink href="/history">History</NavLink>
                </nav>
              </div>
            </header>

            {/* ── Page content ─────────────────────────────────────────────── */}
            <main
              id="main-content"
              className="mx-auto max-w-5xl px-5 pt-24 pb-12"
              tabIndex={-1}
            >
              {children}
            </main>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <footer
              className="mt-20 border-t border-gray-100 py-10 text-center text-[13px] text-gray-400 space-y-1.5"
              aria-label="Site footer"
            >
              <p className="serif italic text-[15px] text-gray-500">Cadence</p>
              <p>
                Audio is processed on-server and deleted after analysis.
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
