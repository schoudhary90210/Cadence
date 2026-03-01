"use client";

/**
 * AccessibilityProvider — wraps the app and manages high-contrast / large-text
 * preferences. Reads from localStorage on mount and applies CSS classes to
 * document.documentElement so that globals.css can pick them up.
 *
 * Renders a floating button (bottom-right) that opens a settings sheet.
 * Fully keyboard accessible: Escape closes, focus is trapped while open.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Accessibility, X } from "lucide-react";

import { HighContrastToggle } from "./HighContrastToggle";
import { LargeTextToggle } from "./LargeTextToggle";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText]       = useState(false);
  const [open, setOpen]                 = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef  = useRef<HTMLDivElement>(null);

  // ── Read saved preferences on mount ─────────────────────────────────────
  useEffect(() => {
    try {
      setHighContrast(localStorage.getItem("cadence-high-contrast") === "true");
      setLargeText(localStorage.getItem("cadence-large-text") === "true");
    } catch {
      // localStorage unavailable in strict private browsing — use defaults
    }
  }, []);

  // ── Sync high-contrast to DOM + localStorage ─────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", highContrast);
    try { localStorage.setItem("cadence-high-contrast", String(highContrast)); } catch {}
  }, [highContrast]);

  // ── Sync large-text to DOM + localStorage ────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle("large-text", largeText);
    try { localStorage.setItem("cadence-large-text", String(largeText)); } catch {}
  }, [largeText]);

  // ── Keyboard: Escape closes dialog and returns focus to trigger ──────────
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // ── Move focus into dialog when it opens ────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();
  }, [open]);

  function handleClose() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      {children}

      {/* ── Floating panel + trigger ────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end gap-2">

        {/* Settings sheet */}
        {open && (
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Accessibility settings"
            className="w-72 glass p-5 shadow-xl space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-gray-900">
                Accessibility settings
              </h2>
              <button
                onClick={handleClose}
                aria-label="Close accessibility settings"
                className="rounded text-gray-400 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Toggles */}
            <HighContrastToggle checked={highContrast} onChange={setHighContrast} />
            <LargeTextToggle   checked={largeText}    onChange={setLargeText} />

            <p className="text-[13px] text-gray-400 border-t border-gray-100 pt-3">
              Preferences are saved in your browser and applied automatically.
            </p>
          </div>
        )}

        {/* Trigger button */}
        <button
          ref={triggerRef}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={open ? "Close accessibility settings" : "Open accessibility settings"}
          className="
            flex h-12 w-12 items-center justify-center rounded-full
            bg-gray-900 text-white shadow-lg
            hover:bg-gray-800 transition-colors
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2
          "
        >
          <Accessibility className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
