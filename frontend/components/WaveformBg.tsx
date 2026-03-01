"use client";

import { motion } from "framer-motion";

/**
 * Subtle animated waveform SVG background for the hero section.
 * Three sine-wave paths with staggered animations.
 */
export function WaveformBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <svg
        viewBox="0 0 1200 400"
        fill="none"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full opacity-[0.035]"
      >
        <motion.path
          d="M0 200 Q150 120 300 200 T600 200 T900 200 T1200 200"
          stroke="#2563EB"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.5, ease: "easeOut" }}
        />
        <motion.path
          d="M0 220 Q150 160 300 220 T600 220 T900 220 T1200 220"
          stroke="#2563EB"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={{ duration: 3, ease: "easeOut", delay: 0.3 }}
        />
        <motion.path
          d="M0 180 Q150 240 300 180 T600 180 T900 180 T1200 180"
          stroke="#2563EB"
          strokeWidth="1"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.5 }}
          transition={{ duration: 3.5, ease: "easeOut", delay: 0.6 }}
        />
      </svg>
    </div>
  );
}
