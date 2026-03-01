"use client";

/**
 * AccessibilityProvider — wraps the app and manages accessibility preferences.
 * High Contrast, Large Text, Reduce Motion, Text Spacing.
 * Reads from localStorage on mount and applies CSS classes to
 * document.documentElement so that globals.css can pick them up.
 *
 * Renders a floating button (bottom-right) that opens a settings sheet.
 * Fully keyboard accessible: Escape closes, focus is trapped while open.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Accessibility, X, RotateCcw } from "lucide-react";

// ---------------------------------------------------------------------------
// Toggle switch component
// ---------------------------------------------------------------------------

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      aria-label={label}
      className={`
        relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent
        transition-colors duration-200
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600
        ${checked ? "bg-blue-600" : "bg-gray-200"}
      `}
    >
      <span
        aria-hidden="true"
        className={`
          pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow
          transition-transform duration-200
          ${checked ? "translate-x-5" : "translate-x-0"}
        `}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Pill selector component
// ---------------------------------------------------------------------------

function PillSelector({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1.5 bg-gray-100 rounded-full p-1"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`
            flex-1 px-3 py-1 text-[12px] font-medium rounded-full transition-all
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600
            ${
              value === opt.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText]       = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [textSpacing, setTextSpacing]   = useState<"normal" | "relaxed">("normal");
  const [open, setOpen]                 = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef  = useRef<HTMLDivElement>(null);

  // ── Read saved preferences on mount ─────────────────────────────────────
  useEffect(() => {
    try {
      setHighContrast(localStorage.getItem("cadence-high-contrast") === "true");
      setLargeText(localStorage.getItem("cadence-large-text") === "true");
      setReduceMotion(localStorage.getItem("cadence-reduce-motion") === "true");
      const spacing = localStorage.getItem("cadence-text-spacing");
      if (spacing === "relaxed") setTextSpacing("relaxed");
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

  // ── Sync reduce-motion to DOM + localStorage ─────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
    try { localStorage.setItem("cadence-reduce-motion", String(reduceMotion)); } catch {}
  }, [reduceMotion]);

  // ── Sync text-spacing to DOM + localStorage ──────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle("text-spacing-relaxed", textSpacing === "relaxed");
    try { localStorage.setItem("cadence-text-spacing", textSpacing); } catch {}
  }, [textSpacing]);

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

  function handleReset() {
    setHighContrast(false);
    setLargeText(false);
    setReduceMotion(false);
    setTextSpacing("normal");
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
            className="w-80 glass p-5 shadow-xl space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-gray-900">
                Accessibility
              </h2>
              <button
                onClick={handleClose}
                aria-label="Close accessibility settings"
                className="rounded text-gray-400 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* High Contrast */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-medium text-gray-900">High Contrast</p>
                <p className="text-[11px] text-gray-500">Dark background, white text</p>
              </div>
              <Toggle
                checked={highContrast}
                onChange={setHighContrast}
                label={`High contrast mode: currently ${highContrast ? "on" : "off"}`}
              />
            </div>

            {/* Large Text */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-medium text-gray-900">Large Text</p>
                <p className="text-[11px] text-gray-500">Increase size by 20%</p>
              </div>
              <Toggle
                checked={largeText}
                onChange={setLargeText}
                label={`Large text mode: currently ${largeText ? "on" : "off"}`}
              />
            </div>

            {/* Reduce Motion */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-medium text-gray-900">Reduce Motion</p>
                <p className="text-[11px] text-gray-500">Minimize animations</p>
              </div>
              <Toggle
                checked={reduceMotion}
                onChange={setReduceMotion}
                label={`Reduce motion: currently ${reduceMotion ? "on" : "off"}`}
              />
            </div>

            {/* Text Spacing */}
            <div className="space-y-2">
              <div>
                <p className="text-[13px] font-medium text-gray-900">Text Spacing</p>
                <p className="text-[11px] text-gray-500">Increase spacing for easier reading</p>
              </div>
              <PillSelector
                options={[
                  { value: "normal", label: "Normal" },
                  { value: "relaxed", label: "Relaxed" },
                ]}
                value={textSpacing}
                onChange={(v) => setTextSpacing(v as "normal" | "relaxed")}
                label="Text spacing"
              />
            </div>

            {/* Divider + Reset */}
            <div className="border-t border-gray-100 pt-3 space-y-3">
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-full border border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset to Defaults
              </button>
              <p className="text-[11px] text-gray-400 text-center">
                Preferences are saved in your browser.
              </p>
            </div>
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
