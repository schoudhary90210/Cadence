"use client";

export interface LargeTextToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function LargeTextToggle({ checked, onChange }: LargeTextToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-900">Large Text</p>
        <p className="text-xs text-slate-500 mt-0.5">Increase base font size by 20%</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        aria-label={`Large text mode: currently ${checked ? "on" : "off"}`}
        className={`
          relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent
          transition-colors duration-200
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600
          ${checked ? "bg-sky-600" : "bg-slate-200"}
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
    </div>
  );
}
